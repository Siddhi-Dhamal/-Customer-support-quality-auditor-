import os
import json 
import re 
import shutil
import gc
import csv
import requests
import pandas as pd
from datetime import datetime
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from deepgram import DeepgramClient
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

# ---------------- CONFIG ----------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TRANSCRIPT_FILE = "text_transcript.csv"
SUMMARY_FILE = "text_summaries.csv"
SUMMARIES_DIR=os.path.join(BASE_DIR,"file_summaries")
os.makedirs(SUMMARIES_DIR,exist_ok=True)

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

dg_client = DeepgramClient(DEEPGRAM_API_KEY)

# ---------------- CHAT PARSING + FORMAT FOR UI ----------------

def parse_chat_to_turns(text):
    """
    Dynamically detects ANY speaker format — no hardcoded names.
    Handles multi-word names, single-word names, numbered speakers, etc.
    """
    import re
    from collections import Counter

    lines = text.strip().split('\n')
    turns = []

    # Pattern: "Speaker Name: message" — greedy match for name, stops at first colon
    speaker_line = re.compile(r'^([A-Za-z][A-Za-z0-9_ ]{1,40}?)\s*:\s*(.+)$')

    if len(lines) > 1:
        for line in lines:
            line = line.strip()
            if not line:
                continue
            m = speaker_line.match(line)
            if m:
                name = m.group(1).strip()
                msg  = m.group(2).strip()
                if name and msg:
                    turns.append({"speaker": name, "text": msg})

    # Fallback: inline format — everything on one block of text
    if not turns:
        # Find all "Name:" occurrences and split on them
        speaker_pattern = re.compile(r'\b([A-Za-z][A-Za-z0-9 ]{1,39}?)\s*:')
        candidates = speaker_pattern.findall(text)
        counts = Counter(c.strip() for c in candidates if len(c.strip()) > 1)

        if counts:
            # Sort by length descending to avoid partial-name shadowing
            speakers = sorted(counts.keys(), key=len, reverse=True)
            escaped  = [re.escape(s) for s in speakers]
            split_pat = re.compile(r'(' + '|'.join(escaped) + r')\s*:')
            parts = split_pat.split(text)

            i = 1
            while i < len(parts) - 1:
                speaker = parts[i].strip()
                msg     = parts[i + 1].strip()
                if speaker in speakers and msg:
                    turns.append({"speaker": speaker, "text": msg})
                i += 2

    return turns


def format_chat_for_ui(turns):
    """
    Maps detected speakers to Speaker 00 / Speaker 01 labels.
    - Speaker 00 = Agent (whoever opens with a greeting or is NOT asking for help)
    - Speaker 01 = Customer
    - Supports 3+ speakers: Speaker 02, Speaker 03, etc.
    """
    if not turns:
        return []

    # Preserve speaker order of appearance
    seen = {}
    for t in turns:
        if t['speaker'] not in seen:
            seen[t['speaker']] = len(seen)

    # Determine who is the agent: first speaker, unless their first message
    # sounds like a customer complaint — then agent is the second speaker
    all_speakers_in_order = list(seen.keys())
    first_speaker         = all_speakers_in_order[0]
    first_msg             = next(
        (t['text'].lower() for t in turns if t['speaker'] == first_speaker), ""
    )

    customer_keywords = [
        "help", "issue", "problem", "broken", "error",
        "not working", "can't", "cannot", "please", "complaint",
        "wrong", "fail", "stuck", "unable", "why is"
    ]
    agent_keywords = [
        "welcome", "hello", "hi", "good morning", "good afternoon",
        "how can i", "how may i", "assist", "support", "thank you for calling"
    ]

    first_msg_is_customer = any(k in first_msg for k in customer_keywords)
    first_msg_is_agent    = any(k in first_msg for k in agent_keywords)

    if first_msg_is_customer and not first_msg_is_agent:
        # Swap: second speaker is the agent
        if len(all_speakers_in_order) > 1:
            agent_speaker = all_speakers_in_order[1]
        else:
            agent_speaker = first_speaker
    else:
        agent_speaker = first_speaker

    formatted = []
    for t in turns:
        speaker_name = t['speaker']
        idx          = seen[speaker_name]

        if speaker_name == agent_speaker:
            label = "Speaker 00"   # Agent
        else:
            label = f"Speaker {idx:02d}"   # Customer or others: 01, 02, ...

        formatted.append({"speaker": label, "text": t['text']})

    return formatted


# ---------------- SUMMARIZE LOGIC ----------------

def summarize_with_deepgram(text):
    """
    Summarizes chat text using Deepgram Text Intelligence REST API directly.
    Bypasses SDK version issues entirely — works on ALL SDK versions.
    """
    try:
        url = "https://api.deepgram.com/v1/read?summarize=true&language=en"

        headers = {
            "Authorization": f"Token {DEEPGRAM_API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {"text": text}

        response = requests.post(url, headers=headers, json=payload, timeout=30)

        if response.status_code != 200:
            print(f"Deepgram API error {response.status_code}: {response.text}")
            return f"Summary failed: HTTP {response.status_code}"

        data = response.json()

        # ✅ Extract summary from response
        summary_text = data["results"]["summary"]["text"]
        return summary_text

    except KeyError as e:
        print(f"Deepgram response missing key: {e}")
        print(f"Full response: {data}")
        return f"Summary failed (missing key): {str(e)}"
    except Exception as e:
        print(f"Deepgram Error: {e}")
        return f"Summary failed: {str(e)}"

# ---------------- ENDPOINTS ----------------

@app.post("/upload-text")
async def upload_text(file: UploadFile = File(...)):
    temp_file = f"temp_{file.filename}"
    try:
        with open(temp_file, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        with open(temp_file, "r", encoding="utf-8") as f:
            chat_content = f.read()

        summary_text = summarize_with_deepgram(chat_content)

        # ✅ Parse chat into speaker turns and format like audio transcript
        turns = parse_chat_to_turns(chat_content)
        formatted = format_chat_for_ui(turns)

        # Fallback: if parsing fails (unrecognized format), store raw
        if not formatted:
            formatted = [{"speaker": "Speaker 00", "text": chat_content}]

        df_t = pd.DataFrame(formatted)
        df_t.to_csv(TRANSCRIPT_FILE, index=False)

        # Append to summary history
        file_exists = os.path.isfile(SUMMARY_FILE)
        with open(SUMMARY_FILE, mode="a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["file_name", "timestamp", "summary"])
            if not file_exists:
                writer.writeheader()
            writer.writerow({
                "file_name": file.filename,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "summary":   summary_text,
            })

         # Save per-file summary for PDF download
        try:
            import re 
            print(f"DEBUG SUMMARY SAVE: file.filename='{file.filename}'")
            safe_name    = re.sub(r'[^a-zA-Z0-9_\-]', '_', file.filename)
            summary_path = os.path.join(SUMMARIES_DIR, f"{safe_name}.json")
            print(f"DEBUG SUMMARY SAVE: saving to '{summary_path}'")
            with open(summary_path, "w") as sf:
                json.dump({
                    "filename": file.filename,
                    "summary":  summary_text,
                    "saved_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                },sf, indent=4)
        except Exception as e:
            print(f"Per-file summary save error: {e}")

        return {"status": "success", "summary": summary_text}

    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)
        gc.collect()


@app.get("/get-text-transcript")
async def get_text_transcript():
    if not os.path.exists(TRANSCRIPT_FILE):
        return []
    return pd.read_csv(TRANSCRIPT_FILE).to_dict(orient="records")


@app.get("/get-text-summary")
async def get_text_summary():
    if not os.path.exists(SUMMARY_FILE):
        return {"summary": "No summary found."}
    df = pd.read_csv(SUMMARY_FILE)
    if df.empty:
        return {"summary": "Empty history."}
    latest = df.iloc[-1]["summary"]
    return JSONResponse(content={"summary": str(latest)})

@app.get("/get-file-summary/{filename:path}")
async def get_file_summary(filename: str):
    try:
        import re as _re
        from urllib.parse import unquote
        decoded   = unquote(filename)
        safe_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', decoded)
        path      = os.path.join(SUMMARIES_DIR, f"{safe_name}.json")
        print(f"DEBUG: Looking for summary at {path}")
        if os.path.exists(path):
            with open(path) as f:
                return json.load(f)
        return {"summary": "No summary available."}
    except Exception as e:
        print(f"Summary fetch error: {e}")
        return {"summary": "Error fetching summary."}


# ---------------- HISTORY ----------------

@app.get("/history")
async def get_history():
    try:
        if os.path.exists(SUMMARY_FILE):
            df = pd.read_csv(SUMMARY_FILE)
            df = df.fillna("")
            df = df.iloc[::-1]
            return df.to_dict(orient="records")
        return []
    except Exception as e:
        print(f"History error: {e}")
        return []


@app.post("/clear-history")
async def clear_history():
    try:
        if os.path.exists(SUMMARY_FILE):
            os.remove(SUMMARY_FILE)
        if os.path.exists(TRANSCRIPT_FILE):
            os.remove(TRANSCRIPT_FILE)

        # Clear file_summaries folde
        if os.path.exists(SUMMARIES_DIR):
            shutil.rmtree(SUMMARIES_DIR)
            os.makedirs(SUMMARIES_DIR)
            print(f"DEBUG: Cleared file_summaries at {SUMMARIES_DIR}")

        return {"status": "cleared"}
    except Exception as e:
        print(f"Clear history error: {e}")
        return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)