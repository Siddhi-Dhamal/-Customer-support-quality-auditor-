import os
import shutil
import gc
import csv
import requests
import pandas as pd
from datetime import datetime
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")  # goes up to root

from deepgram import DeepgramClient

# ---------------- CONFIG ----------------
TRANSCRIPT_FILE = "text_transcript.csv"
SUMMARY_FILE = "text_summaries.csv"
# Load sensitive keys from the environment (so they are not committed into source control)
DEEPGRAM_API_KEY = os.environ.get("DEEPGRAM_API_KEY")
if not DEEPGRAM_API_KEY:
    raise RuntimeError("Missing required env var: DEEPGRAM_API_KEY")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

dg_client = DeepgramClient(DEEPGRAM_API_KEY)

# ---------------- CHAT PARSING + FORMAT FOR UI ----------------

def parse_chat_to_turns(text):
    """
    Dynamically detects ANY speaker format:
      - "John: Hi!"  /  "Sarah: Hello"
      - "Human 1: Hi!"  /  "Human 2: Hello"
      - "Agent: ..."  /  "Customer: ..."
      - "Alice Johnson: ..."  /  "Bob Smith: ..."
      - Line-by-line OR inline (all on one line)
    No hardcoded names needed.
    """
    import re
    from collections import Counter

    lines = text.strip().split('\n')
    turns = []

    if len(lines) > 1:
        # Line-by-line format: each line starts with "Speaker: message"
        speaker_line = re.compile(r'^([A-Za-z][A-Za-z0-9_ ]{0,30}?)\s*:\s*(.+)$')
        for line in lines:
            line = line.strip()
            m = speaker_line.match(line)
            if m:
                turns.append({"speaker": m.group(1).strip(), "text": m.group(2).strip()})

    if not turns:
        # Inline format: "Name: text Name2: text" all in one block
        speaker_pattern = re.compile(r'\b([A-Za-z][A-Za-z0-9_ ]{0,30}?)\s*:')
        candidates = speaker_pattern.findall(text)
        counts = Counter(c.strip() for c in candidates)
        # Accept speakers that appear at least once (could be genuine single-message speakers)
        speakers = [s for s, _ in counts.items()]

        if speakers:
            speakers_sorted = sorted(speakers, key=len, reverse=True)
            escaped = [re.escape(s) for s in speakers_sorted]
            split_pattern = re.compile(r'(' + '|'.join(escaped) + r')\s*:')
            parts = split_pattern.split(text)

            i = 1
            while i < len(parts) - 1:
                speaker = parts[i].strip()
                msg = parts[i + 1].strip()
                if speaker in speakers and msg:
                    turns.append({"speaker": speaker, "text": msg})
                i += 2

    return turns


def format_chat_for_ui(turns):
    """
    Same logic as audio's format_for_ui.
    Maps the first speaker to 'Speaker 00' (Agent) and second to 'Speaker 01' (Customer),
    unless the first message suggests they are the customer.
    """
    if not turns:
        return []

    first_msg = turns[0]['text'].lower()
    all_speakers = list(dict.fromkeys(t['speaker'] for t in turns))  # preserve order, deduplicate

    # If first speaker is asking for help, they're the customer
    if any(word in first_msg for word in ["help", "issue", "problem", "broken", "error"]):
        agent_speaker = all_speakers[1] if len(all_speakers) > 1 else all_speakers[0]
    else:
        agent_speaker = all_speakers[0]

    formatted = []
    for t in turns:
        is_agent = t['speaker'].lower() == agent_speaker.lower()
        formatted.append({
            "speaker": "Speaker 00" if is_agent else "Speaker 01",
            "text": t['text']
        })
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

        summary = summarize_with_deepgram(chat_content)

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
                "summary": summary
            })

        return {"status": "success", "summary": summary}

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



@app.get("/history")
async def get_history():
    if not os.path.exists(SUMMARY_FILE):
        return []
    try:
        df = pd.read_csv(SUMMARY_FILE)
        return df.tail(10).iloc[::-1].to_dict(orient="records")
    except Exception:
        return []


@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)