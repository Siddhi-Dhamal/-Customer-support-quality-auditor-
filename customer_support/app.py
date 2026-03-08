import os
import csv
import pandas as pd
from datetime import datetime

# --- DEEPGRAM V3.11 MODULAR IMPORTS ---
from deepgram import DeepgramClient, PrerecordedOptions, FileSource

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

# ---------------- CONFIG ----------------
TRANSCRIPT_FILE = "transcriptions_with_speakers.csv"
SUMMARY_FILE = "final_summaries.csv"

# Replace with your actual key

DEEPGRAM_API_KEY=os.getenv("DEEPGRAM_API_KEY","").strip()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

# Initialize Deepgram Client
dg_client = DeepgramClient(DEEPGRAM_API_KEY)

# ---------------- UTILS ----------------

def format_for_ui(dg_raw_data):
    """
    Programmatically identifies roles to save time.
    UI expects 'Speaker 00' for Agent and 'Speaker 01' for Customer.
    """
    if not dg_raw_data:
        return []

    # Simple Logic: The person who starts the call is usually the Agent.
    # You can refine this by checking for keywords like 'help' in the first message.
    first_msg = dg_raw_data[0]['text'].lower()
    
    # If the first person is asking for help immediately, they might be the customer
    if any(word in first_msg for word in ["help", "issue", "problem", "broken"]):
        agent_label = "Speaker 1"
    else:
        agent_label = "Speaker 0"

    refined_transcript = []
    for d in dg_raw_data:
        is_agent = d['speaker'] == agent_label
        refined_transcript.append({
            "speaker": "Speaker 00" if is_agent else "Speaker 01",
            "text": d['text'],
            "start": d['start'] # This ensures the UI time column works
        })
    return refined_transcript

# ---------------- API ENDPOINTS ----------------

@app.post("/upload")
async def process_upload(file: UploadFile = File(...)):
    try:
        audio_data = await file.read()
        payload: FileSource = {"buffer": audio_data}

        # Nova-2 is the fastest and most accurate model
        options = PrerecordedOptions(
            model="nova-2",
            smart_format=True,
            diarize=True,
            summarize="v2",  # 🔥 Generates summary instantly with transcription
            punctuate=True,
        )

        print(f"DEBUG: Processing {file.filename}...")
        
        # ONE call to Deepgram handles everything
        response = dg_client.listen.prerecorded.v("1").transcribe_file(payload, options)
        
        # 1. Get the Instant Summary
        # Note: Short summary is usually better for UI panels
        deepgram_summary = "No summary available."
        if hasattr(response.results, 'summary'):
            deepgram_summary = response.results.summary.short
        
        # 2. Extract Words and Group by Speaker
        words = response.results.channels[0].alternatives[0].words
        if not words:
            raise HTTPException(status_code=400, detail="Empty audio content.")

        dg_raw = []
        curr_spk = words[0].speaker
        curr_start = words[0].start
        curr_txt = []

        for w in words:
            if w.speaker == curr_spk:
                curr_txt.append(w.word)
            else:
                dg_raw.append({
                    "speaker": f"Speaker {curr_spk}", 
                    "text": " ".join(curr_txt), 
                    "start": curr_start
                })
                curr_spk = w.speaker
                curr_start = w.start
                curr_txt = [w.word]
        
        dg_raw.append({
            "speaker": f"Speaker {curr_spk}", 
            "text": " ".join(curr_txt), 
            "start": curr_start
        })

        # 3. Fast Formatting (No LLM wait time)
        refined_data = format_for_ui(dg_raw)

        # 4. Save to CSV
        df = pd.DataFrame(refined_data)
        df.to_csv(TRANSCRIPT_FILE, index=False)

        # 5. Update History
        file_exists = os.path.isfile(SUMMARY_FILE)
        with open(SUMMARY_FILE, mode="a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["file_name", "timestamp", "summary"])
            if not file_exists: writer.writeheader()
            writer.writerow({
                "file_name": file.filename,
                "timestamp": datetime.now().strftime("%I:%M %p"),
                "summary": deepgram_summary,
            })

        # Save per-file summary for audio

        try:
            import re as _re, json as _json, os as _os
            AUDIO_SUMMARIES_DIR = "file_summaries"
            _os.makedirs(AUDIO_SUMMARIES_DIR, exist_ok=True)
            safe_name = _re.sub(r'[^a-zA-Z0-9_\-]', '_', file.filename)
            summary_path = _os.path.join(AUDIO_SUMMARIES_DIR, f"{safe_name}.json")
            with open(summary_path, "w") as f:
                _json.dump({
                    "filename": file.filename,
                    "summary":  deepgram_summary,
                    "saved_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }, f, indent=4)
        except Exception as e:
            print(f"Per-file summary save error: {e}")

        return {"status": "success", "summary": deepgram_summary}

    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get-transcript")
async def get_transcript():
    if not os.path.exists(TRANSCRIPT_FILE):
        return []
    try:
        df = pd.read_csv(TRANSCRIPT_FILE)
        df = df.where(pd.notnull(df), None)
        return df.to_dict(orient="records")
    except Exception as e:
        print(f"Transcript fetch error: {e}")
        return []

@app.get("/get-file-summary/{filename:path}")
async def get_file_summary(filename: str):
    try:
        import re as _re, json as _json
        from urllib.parse import unquote
        # Decode URL encoding first, then convert to safe filename
        decoded = unquote(filename)
        safe_name = _re.sub(r'[^a-zA-Z0-9_\-]', '_', decoded)
        BASE = os.path.dirname(os.path.abspath(__file__))
        path = os.path.join(BASE, "file_summaries", f"{safe_name}.json")
        print(f"DEBUG: Looking for summary at {path}")
        if os.path.exists(path):
            with open(path) as f:
                return _json.load(f)
        return {"summary": "No summary available."}
    except Exception as e:
        print(f"Summary fetch error: {e}")
        return {"summary": "No summary available."}


@app.get("/get-summary")
async def get_summary():
    if not os.path.exists(SUMMARY_FILE):
        return {"summary": "No summary available."}
    try:
        df = pd.read_csv(SUMMARY_FILE)
        if df.empty: return {"summary": "No data."}
        return {"summary": df["summary"].iloc[-1]}
    except:
        return {"summary": "No summary available."}

@app.get("/history")
async def get_history():
    if not os.path.exists(SUMMARY_FILE):
        return []
    try:
        df = pd.read_csv(SUMMARY_FILE)
        # Return last 10 items in reverse order (newest first)
        return df.iloc[::-1].to_dict(orient="records")
    except:
        return []

@app.post("/clear-history")
async def clear_history():
    try:
        if os.path.exists(SUMMARY_FILE):
            with open(SUMMARY_FILE, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=["file_name", "timestamp", "summary"])
                writer.writeheader()
        if os.path.exists(TRANSCRIPT_FILE):
            os.remove(TRANSCRIPT_FILE)

        # Clear file_scores folder
        import shutil
        BASE = os.path.dirname(os.path.abspath(__file__))

        # Clear file_scores folder
        file_scores_path = os.path.join(BASE, "file_scores")
        if os.path.exists(file_scores_path):
            shutil.rmtree(file_scores_path)
            os.makedirs(file_scores_path)
            print(f"DEBUG: Cleared file_scores at {file_scores_path}")

        # Clear file_summaries folder
        file_summaries_path = os.path.join(BASE, "file_summaries")
        if os.path.exists(file_summaries_path):
            shutil.rmtree(file_summaries_path)
            os.makedirs(file_summaries_path)
            print(f"DEBUG: Cleared file_summaries at {file_summaries_path}")

        return {"status": "cleared"}
    except Exception as e:
        print(f"Clear history error: {e}")
        return {"status": "error", "message": str(e)}
    
if __name__ == "__main__":
    import uvicorn
    # Local dev: http://127.0.0.1:8000
    uvicorn.run(app, host="127.0.0.1", port=8000)