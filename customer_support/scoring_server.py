import os
import re
import json
import time
import httpx
import pandas as pd
from datetime import datetime
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")  # goes up to root


# --- CONFIGURATION ---
# Load sensitive keys from the environment (so they are not committed into source control)
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("Missing required env var: GROQ_API_KEY")
TRANSCRIPT_FILE = "transcriptions_with_speakers.csv"
SCORES_FILE     = "quality_scores.json"

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
client = Groq(api_key=GROQ_API_KEY)


# ==============================================================================
# SPEAKER NORMALIZER
# Fix: audio transcripts come out as "Speaker 00 / Speaker 01" not "agent/customer"
# so every downstream function gets correct AGENT: / CUSTOMER: prefixes
# ==============================================================================

_SPEAKER_PREFIX_RE = re.compile(r'^([^:]{1,30}):', re.IGNORECASE)

def normalize_speakers(text: str) -> str:
    """
    Rewrite any speaker format to AGENT: / CUSTOMER: so bias scoring,
    efficiency and LLM prompt all work correctly.

    Handles:
      Speaker 00 / Speaker 01  (Whisper transcription default)
      speaker_00 / speaker_01
      S1 / S2
      Agent / Customer         (already correct — pass through)
      Any two-speaker format   (first encountered = AGENT, second = CUSTOMER)
    """
    lines = [l.strip() for l in text.splitlines() if l.strip()]

    # Collect unique speaker keys in order of first appearance
    seen: list[str] = []
    for line in lines:
        m = _SPEAKER_PREFIX_RE.match(line)
        if m:
            key = m.group(1).strip().lower()
            if key not in seen:
                seen.append(key)

    # Already normalised?
    if seen and seen[0] in ("agent", "customer"):
        return text

    # Build map: first speaker → AGENT, second → CUSTOMER, rest → SPEAKER_N
    label_map: dict[str, str] = {}
    for i, key in enumerate(seen):
        if i == 0:
            label_map[key] = "AGENT"
        elif i == 1:
            label_map[key] = "CUSTOMER"
        else:
            label_map[key] = f"SPEAKER_{i}"

    normalised: list[str] = []
    for line in lines:
        m = _SPEAKER_PREFIX_RE.match(line)
        if m:
            key  = m.group(1).strip().lower()
            rest = line[m.end():].strip()
            normalised.append(f"{label_map.get(key, m.group(1).strip())}: {rest}")
        else:
            normalised.append(line)

    return "\n".join(normalised)


# ==============================================================================
# EFFICIENCY MODULE
# ==============================================================================

def calculate_response_time(messages: list) -> float:
    times = []
    for i in range(len(messages) - 1):
        if (messages[i].get("speaker", "").lower() == "customer"
                and messages[i + 1].get("speaker", "").lower() == "agent"):
            ts1 = messages[i].get("timestamp")
            ts2 = messages[i + 1].get("timestamp")
            if ts1 and ts2:
                try:
                    diff = (datetime.strptime(ts2, "%H:%M:%S")
                            - datetime.strptime(ts1, "%H:%M:%S")).total_seconds()
                    if diff >= 0:
                        times.append(diff)
                except ValueError:
                    pass
    return round(sum(times) / len(times), 2) if times else 0.0


def efficiency_score_from_messages(messages: list) -> tuple[int, float]:
    avg_rt = calculate_response_time(messages)
    total  = len(messages)
    score  = 0
    if avg_rt == 0:   score += 3
    elif avg_rt < 30: score += 4
    elif avg_rt < 60: score += 3
    else:             score += 1
    if total <= 6:    score += 4
    elif total <= 12: score += 3
    elif total <= 20: score += 2
    else:             score += 1
    return min(score, 10), avg_rt


def estimate_efficiency_from_text(text: str) -> tuple[int, float]:
    """
    Efficiency from plain text (audio / txt / csv).
    Uses dialogue-line count and words-per-turn as proxies.
    Scores will differ because each call has a different length and verbosity.
    """
    lines = [l.strip() for l in text.splitlines()
             if l.strip() and any(c.isalpha() for c in l)]
    turns = max(len(lines), 1)
    words = len(text.split())
    wpt   = words / turns   # average words per turn

    score = 0
    # Verbosity sub-score
    if wpt < 15:   score += 4
    elif wpt < 30: score += 3
    elif wpt < 50: score += 2
    else:          score += 1
    # Turn-count sub-score
    if turns <= 8:    score += 4
    elif turns <= 16: score += 3
    elif turns <= 24: score += 2
    else:             score += 1

    return min(score, 10), 0.0


# ==============================================================================
# BIAS / FAIRNESS MODULE
# Fix: now works on normalised text so Speaker 00/01 format is handled
# Fix: added missing negative-language patterns that were not triggering
# ==============================================================================

def compute_bias_scores(conversation_text: str) -> dict:
    """
    Four content-driven fairness sub-scores based on agent behaviour signals.
    Requires AGENT: / CUSTOMER: prefixes — call normalize_speakers() first.
    Scores vary per conversation because they are computed from actual dialogue.
    """
    lines       = [l.strip() for l in conversation_text.splitlines() if l.strip()]
    agent_lines = [l for l in lines if l.lower().startswith("agent")]
    cust_lines  = [l for l in lines if l.lower().startswith("customer")]
    agent_text  = " ".join(agent_lines).lower()
    cust_text   = " ".join(cust_lines).lower()

    # ── 1. Name Neutrality ───────────────────────────────────────────────────
    # Did agent personalise appropriately? 0 = cold, 1-3 = ideal, 6+ = robotic
    personal_patterns = [r"\bsir\b", r"\bma'?am\b", r"\bmr\.?\b", r"\bms\.?\b", r"\bmrs\.?\b"]
    greeting_name     = len(re.findall(
        r"(?:thank you|hello|hi|bye|goodbye|welcome)[,\s]+[a-z]{2,15}\b", agent_text))
    personal_count    = sum(len(re.findall(p, agent_text)) for p in personal_patterns)
    total_personal    = personal_count + greeting_name

    if total_personal == 0:   name_score = 5
    elif total_personal <= 3: name_score = 9
    elif total_personal <= 6: name_score = 7
    else:                     name_score = 4

    # ── 2. Language Neutrality ───────────────────────────────────────────────
    # Did agent avoid dismissive, blame-shifting or condescending language?
    negative_phrases = [
        # Original patterns
        r"\byou (always|never|should(n'?t)? have|must have)\b",
        r"\bthat'?s (not |your |)(my )?(problem|fault)\b",
        r"\bi (can'?t|cannot|won'?t|will not) help\b",
        r"\bwe don'?t do that\b",
        r"\bnot my (department|problem)\b",
        r"\bthere'?s nothing (i|we) can do\b",
        # Fix: added patterns that were missing — common dismissive real-world phrases
        r"\byou should\b",                  # "you should restart", "you should know"
        r"\bnot much (i|we) can do\b",      # "there's not much I can do"
        r"\byou'?ll need to\b",             # "you'll need to call back / submit online"
        r"\bjust (restart|reboot|reset|submit|go online|call back|check)\b",  # oversimplification
        r"\bactually\b",                    # condescending correction opener
        r"\blike i said\b",                 # dismissive repetition
        r"\bthat'?s not how (it|this) works\b",
    ]
    assumption_words = ["obviously", "clearly", "simply", "basic", "easy", "just try"]
    neg_hits         = sum(1 for p in negative_phrases if re.search(p, agent_text))
    assumption_hits  = sum(agent_text.count(w) for w in assumption_words)
    lang_score       = max(1, 10 - (neg_hits * 2) - assumption_hits)

    # ── 3. Tone Consistency ──────────────────────────────────────────────────
    # Did agent open AND close professionally? Penalise dismissive mid-call phrases.
    polite_open  = ["thank you for calling", "how can i help", "how may i assist",
                    "good morning", "good afternoon", "good evening", "hello", "hi"]
    polite_close = ["thank you", "have a great", "have a good", "is there anything else",
                    "my pleasure", "you're welcome", "glad i could", "take care", "goodbye",
                    "have a wonderful", "appreciate your call"]
    dismissive   = ["hold on", "wait a moment", "one moment", "look,", "listen,",
                    "i said", "as i mentioned", "i already told you"]

    first_agent   = agent_lines[0].lower() if agent_lines else ""
    last_agent    = agent_lines[-1].lower() if agent_lines else ""
    open_polite   = any(p in first_agent for p in polite_open)
    close_polite  = any(p in last_agent  for p in polite_close)
    dismiss_count = sum(agent_text.count(p) for p in dismissive)

    if open_polite and close_polite:  tone_score = max(1, 9 - dismiss_count)
    elif open_polite or close_polite: tone_score = max(1, 7 - dismiss_count)
    else:                             tone_score = max(1, 3 - dismiss_count)

    # ── 4. Equal Effort ──────────────────────────────────────────────────────
    # Did agent invest effort? Count action-verb signals + agent/customer word ratio.
    effort_signals = [
        r"\bi (will|can|am going to|have|checked|looked|found|escalat|process|transfer|update)\b",
        r"\blet me\b", r"\bi understand\b", r"\bi apologize\b", r"\bi'?m sorry\b",
        r"\bwe (can|will|have)\b", r"\bfor you\b", r"\bright away\b", r"\bimmediately\b",
        r"\bi'?ll (take|make sure|ensure|follow up|call|send|process|check)\b",
    ]
    effort_hits  = sum(1 for p in effort_signals if re.search(p, agent_text))
    agent_wc     = len(" ".join(agent_lines).split())
    cust_wc      = max(len(" ".join(cust_lines).split()), 1)
    ratio        = agent_wc / cust_wc
    base_effort  = min(7, round(ratio * 4)) if ratio >= 0.5 else 2
    effort_score = min(10, base_effort + min(effort_hits, 3))

    overall = round((name_score + lang_score + tone_score + effort_score) / 4)

    return {
        "name_neutrality":     min(name_score,   10),
        "language_neutrality": min(lang_score,   10),
        "tone_consistency":    min(tone_score,   10),
        "equal_effort":        min(effort_score, 10),
        "overall_fairness":    min(overall,      10),
    }


# ==============================================================================
# LLM PROMPT
# ==============================================================================

def build_prompt(conversation_text: str) -> str:
    return f"""
You are a strict Quality Assurance evaluator for customer-service interactions.
Read ONLY the CUSTOMER's lines carefully to detect emotion and satisfaction.
Every call is different — your scores MUST reflect what is actually said.

CRITICAL RULES:
1. Base every score on specific words/events in THIS conversation.
2. Do NOT default to Neutral or Satisfied. Read the customer's actual words.
3. Casual small talk = resolution 1, compliance 1, all sub-scores 1.
4. Resolution 9-10 ONLY if agent confirmed fix AND customer explicitly agreed.
5. Compliance 9-10 ONLY if identity verified AND full protocol followed.

=== RUBRICS ===

EMPATHY (1-10):
1-3: Cold, robotic, ignored feelings entirely.
4-5: Polite but generic, no personalisation.
6-7: Acknowledged issue, used "I understand".
8-9: Used customer's name, showed genuine care.
10: Exceptional warmth throughout.

COMPLIANCE (1-10):
1-2: No verification or protocol at all.
3-5: Some steps done, others skipped.
6-7: Mostly correct, minor gaps.
8-9: Full verification + structured handling.
10: Perfect best-practice execution.

RESOLUTION (1-10):
1-2: Issue not addressed.
3-4: Tried but incomplete.
5-6: Partially resolved.
7-8: Resolved clearly.
9-10: Resolved + confirmed by customer + follow-up offered.
→ Casual chat with no issue = 1.

EFFICIENCY (1-10):
1-3: Long, repetitive, circular.
4-5: Moderate, unnecessary turns.
6-7: Reasonably concise.
8-9: On-point, minimal turns.
10: Resolved in fewest possible turns.

=== CUSTOMER EMOTION ===
Read ONLY the CUSTOMER's messages. Identify their DOMINANT emotional state across the whole call.
Choose EXACTLY ONE from this list:

- Happy      → Customer is positive, cheerful, grateful. Example: "This is amazing! Thank you so much!"
- Satisfied  → Customer is content, calm, pleased at end. Example: "Great, that works. Thanks."
- Neutral    → Customer is matter-of-fact, no strong emotion. Example: "Okay. Is that all?"
- Anxious    → Customer expresses worry, nervousness, urgency. Example: "I'm really worried about this." / "I need this fixed urgently."
- Frustrated → Customer shows repeated irritation, sighing, complaint. Example: "This is the third time I'm calling!"
- Angry      → Customer is hostile, aggressive, threatening. Example: "This is unacceptable! I want to cancel!"
- Sad        → Customer sounds distressed, upset, or defeated. Example: "I don't know what to do anymore."
- Confused   → Customer is lost, asking repeated clarifying questions. Example: "Wait, I don't understand what you mean."

IMPORTANT: Do NOT pick Neutral unless the customer truly shows zero emotional signal.
IMPORTANT: Pick the emotion that best describes the MAJORITY of the call, not just the end.

=== CUSTOMER SATISFACTION (after the call ends) ===
Based on: (a) was their issue resolved? (b) how did they sound at the END of the call?
Choose EXACTLY ONE label AND provide a percentage (0-100):

- Not Satisfied   (0-30%)   → Issue unresolved, customer still upset or complained at end.
- Somewhat Satisfied (31-55%) → Issue partially resolved or customer lukewarm.
- Neutral         (56-65%)  → No strong signal either way.
- Satisfied       (66-85%)  → Issue resolved, customer acknowledged it positively.
- Highly Satisfied (86-100%) → Customer explicitly thanked, praised, or expressed delight.

satisfaction_percentage rules:
- If customer said something like "this is terrible" at end → 5-15%
- If customer said "okay thanks" without enthusiasm → 50-60%
- If customer said "thank you so much, that's perfect" → 85-95%
- If customer said nothing about outcome → 50%

=== DETAIL SCORING ===

empathy_timeline — score agent empathy at each stage independently:
  Start: Opening/greeting tone
  Mid:   Core conversation tone
  End:   Closing tone

compliance_steps — score each independently (1 if it didn't happen):
  ID Verify: Was customer identity verified?
  Protocol:  Was correct process/script followed?
  Closing:   Was resolution confirmed and call closed properly?

resolution_progress — score each independently (1 for casual chat):
  Discovery: Did agent identify/understand the issue?
  Fixing:    Did agent take concrete action?
  Solved:    Was issue confirmed closed and customer agreed?

=== CONVERSATION ===
{conversation_text}

=== OUTPUT — return ONLY valid JSON, no markdown, no text outside the object ===
{{
  "empathy":    <integer 1-10>,
  "compliance": <integer 1-10>,
  "resolution": <integer 1-10>,
  "efficiency": <integer 1-10>,
  "empathy_timeline": [
    {{"stage": "Start", "score": <integer 1-10>}},
    {{"stage": "Mid",   "score": <integer 1-10>}},
    {{"stage": "End",   "score": <integer 1-10>}}
  ],
  "compliance_steps": [
    {{"step": "ID Verify", "score": <integer 1-10>}},
    {{"step": "Protocol",  "score": <integer 1-10>}},
    {{"step": "Closing",   "score": <integer 1-10>}}
  ],
  "resolution_progress": [
    {{"stage": "Discovery", "score": <integer 1-10>}},
    {{"stage": "Fixing",    "score": <integer 1-10>}},
    {{"stage": "Solved",    "score": <integer 1-10>}}
  ],
  "customer_emotion":          "<Happy|Satisfied|Neutral|Anxious|Frustrated|Angry|Sad|Confused>",
  "emotion_confidence":        <integer 0-100>,
  "customer_satisfaction":     "<Not Satisfied|Somewhat Satisfied|Neutral|Satisfied|Highly Satisfied>",
  "satisfaction_percentage":   <integer 0-100>,
  "satisfaction_confidence":   <integer 0-100>,
  "reasoning": "<2-3 sentences quoting specific customer lines to justify emotion and satisfaction scores>"
}}
"""


def call_llama(prompt_text: str) -> dict:
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt_text}],
        model="llama-3.1-8b-instant",
        temperature=0.0,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)


# ==============================================================================
# EMOTION / SATISFACTION HELPERS
# ==============================================================================

EMOTION_EMOJI = {
    "happy":      "😊",
    "satisfied":  "😌",
    "neutral":    "😐",
    "anxious":    "😰",
    "frustrated": "😤",
    "angry":      "😡",
    "sad":        "😢",
    "confused":   "😕",
}

SATISFACTION_EMOJI = {
    "not satisfied":       "😞",
    "somewhat satisfied":  "😟",
    "neutral":             "😐",
    "satisfied":           "😌",
    "highly satisfied":    "😊",
}

# Map satisfaction label → fallback percentage midpoint if LLM forgets to return one
SATISFACTION_PCT_FALLBACK = {
    "not satisfied":      15,
    "somewhat satisfied": 45,
    "neutral":            60,
    "satisfied":          75,
    "highly satisfied":   92,
}


def enrich_emotion(result: dict) -> dict:
    emotion      = result.get("customer_emotion",      "Neutral").strip().lower()
    satisfaction = result.get("customer_satisfaction", "Neutral").strip().lower()

    result["customer_emotion_emoji"]      = EMOTION_EMOJI.get(emotion,      "😐")
    result["customer_satisfaction_emoji"] = SATISFACTION_EMOJI.get(satisfaction, "😐")

    # Ensure satisfaction_percentage is always present and in valid range
    pct = result.get("satisfaction_percentage")
    if pct is None or not isinstance(pct, (int, float)):
        pct = SATISFACTION_PCT_FALLBACK.get(satisfaction, 60)
    result["satisfaction_percentage"] = max(0, min(100, int(pct)))

    # Log so we can see what the LLM actually decided
    print(f"  emotion={emotion} ({result.get('emotion_confidence','?')}%) | "
          f"satisfaction={satisfaction} {result['satisfaction_percentage']}% "
          f"({result.get('satisfaction_confidence','?')}%)")
    return result


# ==============================================================================
# ENDPOINTS
# ==============================================================================

@app.post("/analyze-quality")
async def analyze_quality(file: UploadFile = File(...)):
    print(f"\n--- ANALYZING: {file.filename} ---")
    try:
        file_ext  = file.filename.lower().rsplit(".", 1)[-1]
        raw_bytes = await file.read()   # read ONCE — avoids empty second-read bug

        conversation_text = ""
        messages_list: list = []

        # ── Route by file type ───────────────────────────────────────────────
        if file_ext == "json":
            data          = json.loads(raw_bytes.decode("utf-8"))
            messages_list = data.get("messages", [])
            conversation_text = "\n".join(
                f"{m.get('speaker', '?').upper()}: {m.get('text', '')}"
                for m in messages_list
            )

        elif file_ext in ["txt", "csv"]:
            try:
                conversation_text = raw_bytes.decode("utf-8")
            except UnicodeDecodeError:
                conversation_text = raw_bytes.decode("latin-1")
            if not conversation_text.strip():
                raise ValueError("Uploaded text file is empty.")

        else:   # audio — fetch fresh transcript from port-8000 after it finishes
            print("Waiting for audio transcript sync…")
            time.sleep(6)

            # ── PRIMARY: fetch from port-8000 /get-transcript with retry ────
            # getaddrinfo / connection errors are transient on loopback —
            # retry up to 3 times with a short back-off before giving up.
            transcript_fetched = False
            AUDIO_API_URL      = "http://127.0.0.1:8000/get-transcript"
            MAX_RETRIES        = 3
            RETRY_DELAY        = 2   # seconds between retries

            for attempt in range(1, MAX_RETRIES + 1):
                try:
                    resp = httpx.get(AUDIO_API_URL, timeout=10)
                    if resp.status_code == 200:
                        entries = resp.json()          # [{speaker, text, start?}, …]
                        if entries:
                            rows = [
                                f"{e.get('speaker', 'Speaker 00')}: {e.get('text', '')}"
                                for e in entries if str(e.get("text", "")).strip()
                            ]
                            if rows:
                                conversation_text  = "\n".join(rows)
                                transcript_fetched = True
                                print(f"  Fetched {len(entries)} turns from port-8000 "
                                      f"(attempt {attempt})")
                                break
                        else:
                            print(f"  Port-8000 returned empty transcript "
                                  f"(attempt {attempt}), waiting…")
                    else:
                        print(f"  Port-8000 returned HTTP {resp.status_code} "
                              f"(attempt {attempt}), waiting…")
                except (httpx.ConnectError,
                        httpx.TimeoutException,
                        httpx.NetworkError,
                        OSError) as fetch_err:
                    # Catches getaddrinfo failed, connection refused, timeouts
                    print(f"  Port-8000 fetch error (attempt {attempt}): {fetch_err}")

                if not transcript_fetched and attempt < MAX_RETRIES:
                    time.sleep(RETRY_DELAY)

            # ── FALLBACK: CSV written by port-8000 transcription pipeline ───
            if not transcript_fetched:
                print("  All port-8000 retries failed — trying CSV fallback…")
                if os.path.exists(TRANSCRIPT_FILE):
                    try:
                        df   = pd.read_csv(TRANSCRIPT_FILE)
                        rows = []
                        for _, row in df.iterrows():
                            spk  = str(row.get("speaker",
                                        row.get("Speaker", "Speaker 00"))).strip()
                            text = str(row.get("text",
                                        row.get("Text", ""))).strip()
                            if text:
                                rows.append(f"{spk}: {text}")
                        if rows:
                            conversation_text  = "\n".join(rows)
                            transcript_fetched = True
                            print(f"  Loaded {len(rows)} rows from CSV fallback")
                        else:
                            print("  CSV exists but is empty.")
                    except Exception as csv_err:
                        print(f"  CSV read failed: {csv_err}")

            if not transcript_fetched:
                raise RuntimeError(
                    "Could not retrieve audio transcript from port-8000 or CSV. "
                    "Make sure the audio transcription server is running on port 8000."
                )

        if not conversation_text.strip():
            raise ValueError("No conversation content to analyse.")

        # ── Normalise speaker labels (fixes Speaker 00/01 → AGENT/CUSTOMER) ──
        conversation_text = normalize_speakers(conversation_text)
        print(f"  Normalised transcript ({len(conversation_text)} chars, "
              f"{len([l for l in conversation_text.splitlines() if l.strip()])} lines)")

        # ── Bias / fairness (pure Python, no LLM, content-driven) ───────────
        print("Running bias analysis…")
        bias_scores = compute_bias_scores(conversation_text)
        print(f"  bias → {bias_scores}")

        # ── Efficiency score ─────────────────────────────────────────────────
        if messages_list:
            eff, avg_rt = efficiency_score_from_messages(messages_list)
        else:
            eff, avg_rt = estimate_efficiency_from_text(conversation_text)
        print(f"  efficiency={eff}, avg_response_time={avg_rt}s")

        # ── LLM quality + emotion scoring ────────────────────────────────────
        # Light anonymisation before sending to LLM
        anon = re.sub(r"\b\d{6,}\b", "[ACCOUNT]", conversation_text)
        anon = re.sub(r"\b[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}\b", "[EMAIL]", anon)
        anon = re.sub(r"\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b", "[PHONE]", anon)
        llm_input = anon[:8000]

        print("Running LLM evaluation…")
        result_json = call_llama(build_prompt(llm_input))

        # ── Merge computed scores ────────────────────────────────────────────
        result_json["efficiency_score"]  = eff
        result_json["avg_response_time"] = avg_rt
        result_json["bias"]              = bias_scores
        result_json = enrich_emotion(result_json)

        # ── Save ─────────────────────────────────────────────────────────────
        with open(SCORES_FILE, "w") as f:
            json.dump(result_json, f, indent=4)

        log_keys = ["empathy", "compliance", "resolution", "efficiency_score",
                    "customer_emotion", "customer_satisfaction",
                    "emotion_confidence", "satisfaction_confidence"]
        print("SUCCESS →", {k: result_json.get(k) for k in log_keys if k in result_json})
        return result_json

    except Exception as e:
        print("ERROR:", str(e))
        error = {
            "empathy": 0, "compliance": 0, "resolution": 0, "efficiency": 0,
            "efficiency_score": 0, "avg_response_time": 0.0,
            "empathy_timeline":    [{"stage": "Start", "score": 0}, {"stage": "Mid", "score": 0}, {"stage": "End", "score": 0}],
            "compliance_steps":    [{"step": "ID Verify", "score": 0}, {"step": "Protocol", "score": 0}, {"step": "Closing", "score": 0}],
            "resolution_progress": [{"stage": "Discovery", "score": 0}, {"stage": "Fixing", "score": 0}, {"stage": "Solved", "score": 0}],
            "customer_emotion": "Neutral",      "customer_emotion_emoji":      "😐",
            "customer_satisfaction": "Neutral", "customer_satisfaction_emoji": "😐",
            "emotion_confidence": 0,            "satisfaction_confidence": 0,
            "satisfaction_percentage": 0,
            "bias": {"name_neutrality": 0, "language_neutrality": 0,
                     "tone_consistency": 0, "equal_effort": 0, "overall_fairness": 0},
            "reasoning": f"Analysis failed: {str(e)}",
        }
        with open(SCORES_FILE, "w") as f:
            json.dump(error, f, indent=4)
        return error


@app.get("/get-quality-scores")
async def get_scores():
    if os.path.exists(SCORES_FILE):
        with open(SCORES_FILE, "r") as f:
            return json.load(f)
    return {
        "empathy": 0, "compliance": 0, "resolution": 0, "efficiency": 0,
        "efficiency_score": 0, "avg_response_time": 0.0,
        "empathy_timeline":    [{"stage": "Start", "score": 0}, {"stage": "Mid", "score": 0}, {"stage": "End", "score": 0}],
        "compliance_steps":    [{"step": "ID Verify", "score": 0}, {"step": "Protocol", "score": 0}, {"step": "Closing", "score": 0}],
        "resolution_progress": [{"stage": "Discovery", "score": 0}, {"stage": "Fixing", "score": 0}, {"stage": "Solved", "score": 0}],
        "customer_emotion": "Neutral",      "customer_emotion_emoji":      "😐",
        "customer_satisfaction": "Neutral", "customer_satisfaction_emoji": "😐",
        "emotion_confidence": 0,            "satisfaction_confidence": 0,
        "satisfaction_percentage": 0,
        "bias": {"name_neutrality": 0, "language_neutrality": 0,
                 "tone_consistency": 0, "equal_effort": 0, "overall_fairness": 0},
        "reasoning": "No analysis data found. Please upload a file.",
    }


@app.post("/evaluate-chat-file")
async def evaluate_chat_file(file: UploadFile = File(...)):
    """Efficiency + bias only — no LLM call."""
    try:
        data          = json.loads((await file.read()).decode("utf-8"))
        messages_list = data.get("messages", [])
        raw_text      = "\n".join(
            f"{m.get('speaker', '?').upper()}: {m.get('text', '')}"
            for m in messages_list
        )
        full_text   = normalize_speakers(raw_text)
        bias        = compute_bias_scores(full_text)
        eff, avg_rt = efficiency_score_from_messages(messages_list)
        return {
            "avg_response_time": avg_rt,
            "efficiency_score":  eff,
            "total_messages":    len(messages_list),
            "bias":              bias,
        }
    except Exception as e:
        return {"error": str(e)}


@app.get("/health")
async def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)