import os, json, time, re
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pathlib import Path 
import dotenv
from dotenv import load_dotenv
print(f"DEBUG: Loading .env from: {dotenv.find_dotenv()}")
load_dotenv(override=True)


# ── Bias reduction functions ─────────────────────────────────
def anonymize_text(text: str):
    exclude = {
        'Speaker', 'Agent', 'Customer', 'Human', 'User',
        'Hello', 'Thank', 'Sorry', 'Please', 'Yes', 'No',
        'Good', 'Great', 'Sure', 'Okay', 'Well', 'Just',
        'This', 'That', 'With', 'Your', 'Have', 'Will',
        'From', 'They', 'Their', 'What', 'When', 'Where',
        'Which', 'There', 'About', 'Would', 'Could', 'Should'
    }

    words_found = re.findall(r"\b[A-Z][a-z]{2,}\b", text)
    names_found = [w for w in words_found if w not in exclude]
    unique_names = list(set(names_found))

    def replace_name(match):
        word = match.group(0)
        if word in exclude:
            return word
        return "[NAME]"

    anonymized = re.sub(r"\b[A-Z][a-z]{2,}\b", replace_name, text)
    return anonymized, unique_names


from datetime import datetime

def calculate_efficiency(conv: str):
    lines = [l.strip() for l in conv.split("\n") if l.strip()]
    total_messages = len(lines)

    if total_messages <= 10:
        length_score = 4
    elif total_messages <= 20:
        length_score = 3
    elif total_messages <= 35:
        length_score = 3
    elif total_messages <= 50:
        length_score = 2
    else:
        length_score = 1

    repetition_penalty = 0
    line_texts   = [l.lower() for l in lines]
    unique_ratio = len(set(line_texts)) / max(len(line_texts), 1)
    if unique_ratio < 0.5:
        repetition_penalty = 1

    efficiency = min(length_score + 4 - repetition_penalty, 10)
    return {
        "efficiency_score": efficiency,
        "total_messages":   total_messages,
    }


GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_KEY=GROQ_API_KEY.strip().replace("'","").replace('"',"")
print(f"Key loaded: {GROQ_API_KEY[:5]}...{GROQ_API_KEY[-3:]}") # Prints 'gsk_1...xyz'
print(f"Key length: {len(GROQ_API_KEY) if GROQ_API_KEY else 0}")

TRANSCRIPT_FILE = "transcriptions_with_speakers.csv"
BASE_DIR        = os.path.dirname(os.path.abspath(__file__))
SCORES_FILE     = os.path.join(BASE_DIR, "audit_scores.json")
SCORES_DIR      = os.path.join(BASE_DIR, "file_scores")
os.makedirs(SCORES_DIR, exist_ok=True)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
client = Groq(api_key=GROQ_API_KEY)


def build_empty_response():
    return {
        "empathy": 0, "compliance": 0, "resolution": 0,
        "efficiency_score": 0, "total_messages": 0,
        "bias_reduction_applied": False,
        "names_anonymized": [],
        "fairness_scores": {
            "name_neutrality":     0,
            "language_neutrality": 0,
            "tone_consistency":    0,
            "equal_effort":        0,
        },
        "reasoning": "No analysis yet.",
        "empathy_timeline": [
            {"stage": "Opening",  "score": 0},
            {"stage": "Mid-Call", "score": 0},
            {"stage": "Issue",    "score": 0},
            {"stage": "Closing",  "score": 0},
        ],
        "compliance_steps": [
            {"step": "Greeting",     "score": 0},
            {"step": "Verification", "score": 0},
            {"step": "Process",      "score": 0},
            {"step": "Closing",      "score": 0},
        ],
        "resolution_progress": [
            {"stage": "Issue Raised", "score": 0},
            {"stage": "Diagnosed",    "score": 0},
            {"stage": "Action Taken", "score": 0},
            {"stage": "Resolved",     "score": 0},
        ],
    }


# ── ANALYZE QUALITY ───────────────────────────────────────────────────────────
@app.post("/analyze-quality")
async def analyze_quality(
    file:              UploadFile = File(...),
    original_filename: str        = Form(None),   # ← Form(None) so FastAPI reads it correctly
):
    try:
        conv = ""

        # ── Step 1: resolve display name and detect file type ────────
        # audio files are sent as blob named "audio_transcript.txt"
        # but original_filename carries the real name e.g. "call log.m4a"
        display_name   = original_filename if original_filename else file.filename
        original_lower = display_name.lower().strip()

        print(f"DEBUG: blob='{file.filename}'  original='{display_name}'")

        is_audio = (
            original_lower.endswith(".mp3") or
            original_lower.endswith(".wav") or
            original_lower.endswith(".m4a") or
            original_lower.endswith(".mp4")
        )
        is_text = not is_audio

        # ── Step 2: read content ─────────────────────────────────────
        if is_text:
            raw = await file.read()
            print(f"DEBUG: Raw bytes received: {len(raw)}")

            if len(raw) == 0:
                print("ERROR: File is empty — 0 bytes received")
                return build_empty_response()

            try:
                conv = raw.decode("utf-8")
            except Exception:
                conv = raw.decode("latin-1")

            print(f"DEBUG: Decoded text length: {len(conv)} chars")

        else:  # is_audio
            print("DEBUG: Audio file — waiting for Deepgram CSV...")
            time.sleep(10)

            if os.path.exists(TRANSCRIPT_FILE):
                df   = pd.read_csv(TRANSCRIPT_FILE)
                conv = "\n".join(
                    f"{row['speaker']}: {row['text']}"
                    for _, row in df.iterrows()
                    if str(row['text']).strip()
                )
                print(f"DEBUG: Audio transcript length: {len(conv)} chars")
            else:
                print("ERROR: No transcript CSV found after waiting")
                return build_empty_response()

        # ── Step 3: guard empty content ──────────────────────────────
        conv = conv.strip()
        if not conv:
            print("ERROR: Empty transcript — returning empty response")
            return build_empty_response()

        # ── Step 4: trim if too long ─────────────────────────────────
        conv_anonymized, names_found = anonymize_text(conv)
        print(f"DEBUG: Names anonymized: {names_found}")
        print(f"DEBUG: First 300 chars:\n{conv[:300]}")
        
        MAX_SAFE_CHARS = 8000
        if len(conv_anonymized) > MAX_SAFE_CHARS:
            print(f"DEBUG: Trimming from {len(conv_anonymized)} to {MAX_SAFE_CHARS} chars")
            conv_anonymized = conv_anonymized[:MAX_SAFE_CHARS]
        print(f"DEBUG: Final conv length sent to Groq: {len(conv_anonymized)} chars")

        # ── Step 5: Groq analysis ────────────────────────────────────
        sys_msg = """You are a Call Quality Auditor for CUSTOMER SUPPORT calls only.
                    Note: All names in this transcript have been replaced with [NAME] to ensure unbiased scoring.
                    STEP 1 — IDENTIFY CALL TYPE:
                    Check if this is a real customer support call:
                    - Is there a customer with a specific problem or issue?
                    - Is there an agent actively trying to resolve that issue?
                    - Is there a clear support context (billing, technical issue, complaint, request)?

                    If this is casual friendly chat, small talk, personal conversation, or anything other than customer support — it is NOT a support call.

                    STEP 2 — RESPOND BASED ON CALL TYPE:

                    If NOT a customer support call, return exactly this JSON:
                    {
                    "empathy": 0,
                    "compliance": 0,
                    "resolution": 0,
                    "reasoning": "<Write a detailed 6-7 sentence paragraph: 1) What type of conversation this is. 2) What topics were discussed. 3) Tone and mood of the conversation. 4) How engaged both parties were. 5) Any notable or interesting moments. 6) What kind of relationship these people seem to have. 7) Why all scores are zero — because this is not a customer support call and scoring it would be meaningless and misleading.>",
                    "empathy_timeline": [
                        {"stage": "Opening",   "score": 0},
                        {"stage": "Mid-Call",  "score": 0},
                        {"stage": "Issue",     "score": 0},
                        {"stage": "Closing",   "score": 0}
                    ],
                    "compliance_steps": [
                        {"step": "Greeting",     "score": 0},
                        {"step": "Verification", "score": 0},
                        {"step": "Process",      "score": 0},
                        {"step": "Closing",      "score": 0}
                    ],
                    "resolution_progress": [
                        {"stage": "Issue Raised", "score": 0},
                        {"stage": "Diagnosed",    "score": 0},
                        {"stage": "Action Taken", "score": 0},
                        {"stage": "Resolved",     "score": 0}
                    ],
                    "fairness_scores": {
                        "name_neutrality":     0,
                        "language_neutrality": 0,
                        "tone_consistency":    0,
                        "equal_effort":        0
                    }
                    }

                    If YES it IS a customer support call, return exactly this JSON:
                    {
                    "empathy": <overall empathy score 1-10>,
                    "compliance": <overall compliance score 1-10>,
                    "resolution": <overall resolution score 1-10>,
                    "reasoning": "<Write a detailed 6-7 sentence paragraph covering: 1) Overall call quality. 2) Empathy shown by agent with a specific example. 3) Which compliance steps were followed and which were missed. 4) Whether the issue was fully resolved and customer confidence at end. 5) Agent key strengths. 6) Agent key weaknesses. 7) Coaching recommendation.>",
                    "empathy_timeline": [
                        {"stage": "Opening",   "score": <1-10>},
                        {"stage": "Mid-Call",  "score": <1-10>},
                        {"stage": "Issue",     "score": <1-10>},
                        {"stage": "Closing",   "score": <1-10>}
                    ],
                    "compliance_steps": [
                        {"step": "Greeting",     "score": <1-10>},
                        {"step": "Verification", "score": <1-10>},
                        {"step": "Process",      "score": <1-10>},
                        {"step": "Closing",      "score": <1-10>}
                    ],
                    "resolution_progress": [
                        {"stage": "Issue Raised", "score": <1-10>},
                        {"stage": "Diagnosed",    "score": <1-10>},
                        {"stage": "Action Taken", "score": <1-10>},
                        {"stage": "Resolved",     "score": <1-10>}
                    ],
                    "fairness_scores": {
                        "name_neutrality":     <1-10>,
                        "language_neutrality": <1-10>,
                        "tone_consistency":    <1-10>,
                        "equal_effort":        <1-10>
                    }
                    }

                    EMPATHY SCORING RULES:
                    1-3:  Robotic, interrupted customer, ignored emotional cues completely.
                    4-6:  Polite but transactional, no personalized care or emotional awareness.
                    7-8:  Used customer name, acknowledged problem impact, used empathy statements.
                    9-10: Exceptional emotional intelligence, validated feelings, warm tone throughout.

                    COMPLIANCE SCORING RULES:
                    1-3:  Skipped required steps, wrong process, violated protocol.
                    4-6:  Followed basic steps but missed some verifications or procedures.
                    7-8:  Followed all required steps correctly in right order.
                    9-10: Followed all steps perfectly, proactively confirmed, exceeded protocol.

                    RESOLUTION SCORING RULES:
                    1-3:  Issue not addressed or made worse.
                    4-6:  Partial resolution, some steps taken but not fully resolved.
                    7-8:  Issue fully resolved with clear action taken.
                    9-10: Resolved exceptionally, customer confirmed satisfaction, follow-up offered.

                    FAIRNESS SCORING RULES:
                    name_neutrality: Did the agent treat the customer consistently regardless of their name or identity?
                    language_neutrality: Did the agent use clear simple language without assumptions?
                    tone_consistency: Was the agent tone consistently warm and professional?
                    equal_effort: Did the agent put equal effort into resolving the issue?

                    Return ONLY the JSON object. No extra text, no markdown."""

        r = client.chat.completions.create(
            messages=[
                {"role": "system", "content": sys_msg},
                {"role": "user",   "content": f"Analyze this conversation ({len(conv_anonymized)} chars):\n\n{conv_anonymized}"}
            ],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"},
            max_tokens=1500,
            temperature=0.1,
        )

        raw_response = r.choices[0].message.content
        print(f"DEBUG: Groq raw response: {raw_response[:300]}")

        data = json.loads(raw_response)

        # ── Step 6: enrich data ──────────────────────────────────────
        efficiency              = calculate_efficiency(conv)
        data["efficiency_score"] = efficiency["efficiency_score"]
        data["total_messages"]   = efficiency["total_messages"]
        data["names_anonymized"] = names_found
        data["bias_reduction_applied"] = True

        if "fairness_scores" not in data:
            data["fairness_scores"] = {
                "name_neutrality":     5,
                "language_neutrality": 5,
                "tone_consistency":    5,
                "equal_effort":        5,
            }

        # Fallback chart arrays
        if "empathy_timeline" not in data or not data["empathy_timeline"]:
            e = data.get("empathy", 0)
            data["empathy_timeline"] = [
                {"stage": "Opening",  "score": max(0, e - 2)},
                {"stage": "Mid-Call", "score": e},
                {"stage": "Issue",    "score": max(0, e - 1)},
                {"stage": "Closing",  "score": min(10, e + 1)},
            ]

        if "compliance_steps" not in data or not data["compliance_steps"]:
            c = data.get("compliance", 0)
            data["compliance_steps"] = [
                {"step": "Greeting",     "score": c},
                {"step": "Verification", "score": c},
                {"step": "Process",      "score": c},
                {"step": "Closing",      "score": c},
            ]

        if "resolution_progress" not in data or not data["resolution_progress"]:
            res = data.get("resolution", 0)
            data["resolution_progress"] = [
                {"stage": "Issue Raised", "score": max(0, res - 2)},
                {"stage": "Diagnosed",    "score": max(0, res - 1)},
                {"stage": "Action Taken", "score": res},
                {"stage": "Resolved",     "score": min(10, res + 1)},
            ]

        # ── Step 7: save global scores ───────────────────────────────
        try:
            with open(SCORES_FILE, "w") as f:
                json.dump(data, f, indent=4)
            print(f"DEBUG: Global scores saved to {SCORES_FILE}")
        except Exception as save_err:
            print(f"DEBUG: Could not save global scores: {save_err}")

        # ── Step 8: save per-file scores (for Downloads modal) ───────
        try:
            safe_name       = re.sub(r'[^a-zA-Z0-9_\-]', '_', display_name)
            file_score_path = os.path.join(SCORES_DIR, f"{safe_name}.json")
            data["original_filename"] = display_name
            data["saved_at"]          = time.strftime("%Y-%m-%d %H:%M:%S")
            with open(file_score_path, "w") as f:
                json.dump(data, f, indent=4)
            print(f"DEBUG: Per-file scores saved → {file_score_path}")
            print(f"DEBUG: display_name='{display_name}'  safe_name='{safe_name}'")
        except Exception as e:
            print(f"DEBUG: Could not save per-file scores: {e}")

        print(f"SCORES: empathy={data.get('empathy')} compliance={data.get('compliance')} resolution={data.get('resolution')}")
        return data

    except Exception as e:
        import traceback
        print("SCORING ERROR:", e)
        print(traceback.format_exc())
        err = build_empty_response()
        err["reasoning"] = f"Analysis failed: {str(e)[:200]}"
        return err


# ── GET QUALITY SCORES ────────────────────────────────────────────────────────
@app.get("/get-quality-scores")
async def get_scores():
    if os.path.exists(SCORES_FILE):
        with open(SCORES_FILE) as f:
            data = json.load(f)

        if "empathy_timeline" not in data:
            e = data.get("empathy", 0)
            data["empathy_timeline"] = [
                {"stage": "Opening",  "score": e},
                {"stage": "Mid-Call", "score": e},
                {"stage": "Issue",    "score": e},
                {"stage": "Closing",  "score": e},
            ]
        if "compliance_steps" not in data:
            c = data.get("compliance", 0)
            data["compliance_steps"] = [
                {"step": "Greeting",     "score": c},
                {"step": "Verification", "score": c},
                {"step": "Process",      "score": c},
                {"step": "Closing",      "score": c},
            ]
        if "resolution_progress" not in data:
            r = data.get("resolution", 0)
            data["resolution_progress"] = [
                {"stage": "Issue Raised", "score": r},
                {"stage": "Diagnosed",    "score": r},
                {"stage": "Action Taken", "score": r},
                {"stage": "Resolved",     "score": r},
            ]
        return data

    return build_empty_response()


# ── GET FILE SCORES ───────────────────────────────────────────────────────────
@app.get("/get-file-scores/{filename:path}")
async def get_file_scores(filename: str):
    try:
        from urllib.parse import unquote
        decoded         = unquote(filename)
        safe_name       = re.sub(r'[^a-zA-Z0-9_\-]', '_', decoded)
        file_score_path = os.path.join(SCORES_DIR, f"{safe_name}.json")
        print(f"DEBUG: Looking for file scores at {file_score_path}")
        if os.path.exists(file_score_path):
            with open(file_score_path) as f:
                return json.load(f)
        return build_empty_response()
    except Exception as e:
        print(f"Error fetching file scores: {e}")
        return build_empty_response()


# ── LIST FILE SCORES (Downloads modal) ───────────────────────────────────────
@app.get("/list-file-scores")
async def list_file_scores():
    try:
        files = []
        for fname in os.listdir(SCORES_DIR):
            if fname.endswith(".json"):
                path = os.path.join(SCORES_DIR, fname)
                with open(path) as fp:
                    data = json.load(fp)
                files.append({
                    "filename":   data.get("original_filename", fname),
                    "saved_at":   data.get("saved_at", ""),
                    "empathy":    data.get("empathy",    0),
                    "compliance": data.get("compliance", 0),
                    "resolution": data.get("resolution", 0),
                })
        files.sort(key=lambda x: x["saved_at"], reverse=True)
        print(f"DEBUG: list-file-scores returning {len(files)} files")
        return files
    except Exception as e:
        print(f"Error listing file scores: {e}")
        return []


# ── HEALTH ────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "running", "server": "scoring_server", "port": 8003}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)