import os
import csv
import json
import re
import time
import shutil
import gc
import pandas as pd
from datetime import datetime
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# --- AI SDKS ---
from deepgram import DeepgramClient, PrerecordedOptions, FileSource
from groq import Groq

# ---------------- CONFIG & DIRECTORIES ----------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Audio Transcription Files
TRANSCRIPT_AUDIO_FILE = "transcriptions_with_speakers.csv"
SUMMARY_AUDIO_FILE = "final_summaries.csv"

# Text/Chat Files
TRANSCRIPT_TEXT_FILE = "text_transcript.csv"
SUMMARY_TEXT_FILE = "text_summaries.csv"
SUMMARIES_DIR = os.path.join(BASE_DIR, "file_summaries")

# Scoring Files
SCORES_FILE = os.path.join(BASE_DIR, "audit_scores.json")
SCORES_DIR = os.path.join(BASE_DIR, "file_scores")
ANALYSIS_OUTPUT_FILE = "quality_scores.json"

os.makedirs(SUMMARIES_DIR, exist_ok=True)
os.makedirs(SCORES_DIR, exist_ok=True)

# ---------------- ENVIRONMENT VARIABLES ----------------
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "").strip()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()

app = FastAPI(title="GenAI Quality Auditor Unified Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

dg_client = DeepgramClient(DEEPGRAM_API_KEY)
groq_client = Groq(api_key=GROQ_API_KEY)

# ---------------- SHARED UTILITIES ----------------

def anonymize_text(text: str):
    exclude = {'Speaker', 'Agent', 'Customer', 'Hello', 'Thank', 'Sorry', 'Please', 'Yes', 'No', 'Good', 'Great', 'Okay'}
    words_found = re.findall(r"\b[A-Z][a-z]{2,}\b", text)
    names_found = list(set([w for w in words_found if w not in exclude]))
    def replace_name(match): return match.group(0) if match.group(0) in exclude else "[NAME]"
    return re.sub(r"\b[A-Z][a-z]{2,}\b", replace_name, text), names_found

class AnalyzeRequest(BaseModel):
    source: Optional[str] = "audio"

# ---------------- AUDIO ENDPOINTS (from app.py) ----------------

@app.post("/upload")
async def process_audio_upload(file: UploadFile = File(...)):
    try:
        audio_data = await file.read()
        payload: FileSource = {"buffer": audio_data}
        options = PrerecordedOptions(model="nova-2", smart_format=True, diarize=True, summarize="v2", punctuate=True)
        
        response = dg_client.listen.prerecorded.v("1").transcribe_file(payload, options)
        words = response.results.channels[0].alternatives[0].words
        
        # Grouping by speaker logic
        dg_raw = []
        if words:
            curr_spk, curr_start, curr_txt = words[0].speaker, words[0].start, [words[0].word]
            for w in words[1:]:
                if w.speaker == curr_spk: curr_txt.append(w.word)
                else:
                    dg_raw.append({"speaker": f"Speaker {curr_spk}", "text": " ".join(curr_txt), "start": curr_start})
                    curr_spk, curr_start, curr_txt = w.speaker, w.start, [w.word]
            dg_raw.append({"speaker": f"Speaker {curr_spk}", "text": " ".join(curr_txt), "start": curr_start})

        pd.DataFrame(dg_raw).to_csv(TRANSCRIPT_AUDIO_FILE, index=False)
        summary = response.results.summary.short if hasattr(response.results, 'summary') else "N/A"
        return {"status": "success", "summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------- TEXT ENDPOINTS (from chat_app.py) ----------------

@app.post("/upload-text")
async def upload_text(file: UploadFile = File(...)):
    # ... logic from chat_app.py ...
    return {"status": "success"}

# ---------------- SCORING & EMOTION (from scoring_server.py / Emotion.py) ----------------

@app.post("/analyze-quality")
async def analyze_quality(file: UploadFile = File(...), original_filename: str = Form(None)):
    # Logic to call Groq Llama-3 for empathy, compliance, and resolution
    pass

@app.post("/analyze-emotion")
async def analyze_emotion(request: AnalyzeRequest):
    # Logic to detect sentiment and customer satisfaction percentage
    pass

# ---------------- GETTERS & HEALTH ----------------

@app.get("/get-transcript")
async def get_transcript():
    if os.path.exists(TRANSCRIPT_AUDIO_FILE):
        return pd.read_csv(TRANSCRIPT_AUDIO_FILE).to_dict(orient="records")
    return []

@app.get("/health")
async def health():
    return {"status": "running", "unified": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))