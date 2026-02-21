import os
import shutil
import gc
import csv
import pandas as pd
import warnings
import time
from datetime import datetime
from groq import Groq  # Import Groq
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# --- CONFIGURATION ---
TRANSCRIPT_FILE = "transcriptions_with_speakers.csv"
SUMMARY_FILE = "final_summaries.csv"
# Get your free key at https://console.groq.com/
GROQ_API_KEY = os.getenv("GROQ_API_KEY")  # Use environment variable for security
DEVICE = "cpu"
MODEL_SIZE = "tiny" 
COMPUTE_TYPE = "int8"

app = FastAPI()

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq Client
client = Groq(api_key=GROQ_API_KEY)

# Initialize WhisperX for Transcription
import whisperx
from whisperx.diarize import DiarizationPipeline

print(f"🚀 Loading WhisperX ({MODEL_SIZE})...")
model = whisperx.load_model(MODEL_SIZE, DEVICE, compute_type=COMPUTE_TYPE)

try:
    # Use your existing HF token for Diarization only
    HF_TOKEN = os.getenv("HF_TOKEN")
    diarize_model = DiarizationPipeline(token=HF_TOKEN, device=DEVICE, model_name="pyannote/speaker-diarization-3.1")
except:
    diarize_model = None

# History for UI Sidebar
analysis_history = [] 

def generate_ai_summary(text):
    """
    Generates a high-quality summary using Groq's Llama-3.3-70b model.
    Strictly follows the [Name] called to [Action] resulting in [Outcome] format.
    """
    try:
        print("🤖 Requesting high-speed summary from Groq...")
        
        # Using Llama-3.3-70b for the best quality
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system", 
                    "content": (
                        "You are a professional call logger. Summarize the conversation in EXACTLY one sentence "
                        "using this format: [Name] called to [Action] from [Business], resulting in [Outcome].\n"
                        "Example: Brando Thomas called to order a dozen long-stem red roses from Martha's Flores, "
                        "resulting in a successful transaction and shipment confirmation within 24 hours."
                    )
                },
                {"role": "user", "content": f"Transcript: {text[:4000]}"}
            ],
            temperature=0.1, # Low temperature for high accuracy
            max_tokens=100
        )
        
        return completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"❌ Groq Error: {e}")
        return "Summary currently unavailable due to API limits."

@app.post("/upload")
async def process_upload(file: UploadFile = File(...)):
    temp_file = f"temp_{file.filename}"
    file_extension = file.filename.split('.')[-1].lower()
    
    try:
        with open(temp_file, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        full_text_for_summary = ""

        # --- BRANCH A: CHAT UPLOAD ---
        # --- BRANCH A: CHAT UPLOAD (.txt or .csv) ---
        if file_extension in ['txt', 'csv']:
            formatted_data = []
            speaker_map = {}
            with open(temp_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                for i, line in enumerate(lines):
                    line = line.strip()
                    if not line: continue
                    
                    # Improved logic: Check if line starts with "Name:"
                    if ":" in line:
                        raw_speaker, text_content = line.split(":", 1)
                        raw_speaker = raw_speaker.strip()
                        text_content = text_content.strip()
                        
                        # Create a consistent speaker ID (e.g., SPEAKER_00)
                        if raw_speaker not in speaker_map:
                            speaker_map[raw_speaker] = f"SPEAKER_{len(speaker_map):02d}"
                        
                        current_speaker = speaker_map[raw_speaker]
                        full_text_for_summary += f" {text_content}"
                        
                        formatted_data.append({
                            "speaker": current_speaker,
                            "text": text_content,
                            "start": i, 
                            "end": i + 1
                        })
                    else:
                        # Fallback for lines without a colon (assign to "UNKNOWN" or previous speaker)
                        text_content = line
                        full_text_for_summary += f" {text_content}"
                        formatted_data.append({
                            "speaker": "UNKNOWN",
                            "text": text_content,
                            "start": i, 
                            "end": i + 1
                        })
            pd.DataFrame(formatted_data).to_csv(TRANSCRIPT_FILE, index=False)

        # --- BRANCH B: AUDIO TRANSCRIPTION ---
        else:
            audio = whisperx.load_audio(temp_file)
            result = model.transcribe(audio, batch_size=4)
            
            # Alignment & Diarization
            model_a, metadata = whisperx.load_align_model(language_code=result["language"], device=DEVICE)
            result = whisperx.align(result["segments"], model_a, metadata, audio, DEVICE)
            
            if diarize_model:
                diarize_segments = diarize_model(audio)
                result = whisperx.assign_word_speakers(diarize_segments, result)
            
            formatted_data = []
            for seg in result["segments"]:
                text_content = seg.get("text", "").strip()
                full_text_for_summary += f" {text_content}"
                formatted_data.append({
                    "speaker": seg.get("speaker", "UNKNOWN"),
                    "text": text_content,
                    "start": round(seg.get("start", 0), 2),
                    "end": round(seg.get("end", 0), 2)
                })
            pd.DataFrame(formatted_data).to_csv(TRANSCRIPT_FILE, index=False)

        # --- GENERATE AND SAVE SUMMARY ---
        summary_text = generate_ai_summary(full_text_for_summary)
        
        file_exists = os.path.isfile(SUMMARY_FILE)
        with open(SUMMARY_FILE, mode="a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["file_name", "text", "summary"])
            if not file_exists:
                writer.writeheader()
            writer.writerow({
                "file_name": file.filename,
                "text": full_text_for_summary[:500], 
                "summary": summary_text
            })

        analysis_history.insert(0, {
            "id": len(analysis_history) + 1,
            "name": file.filename,
            "timestamp": datetime.now().strftime("%I:%M %p"),
            "status": "Ready"
        })
        
        return {"status": "success", "summary": summary_text}

    finally:
        if os.path.exists(temp_file): os.remove(temp_file)
        gc.collect()

@app.get("/get-summary")
async def get_summary():
    if not os.path.exists(SUMMARY_FILE):
        return {"summary": "No summary available."}
    try:
        df = pd.read_csv(SUMMARY_FILE)
        if not df.empty:
            # Return the latest summary from the CSV [cite: 1, 25]
            return {"summary": df["summary"].iloc[-1]}
    except:
        pass
    return {"summary": "Error reading summary file."}

@app.get("/get-transcript")
async def get_transcript():
    if not os.path.exists(TRANSCRIPT_FILE): return []
    return pd.read_csv(TRANSCRIPT_FILE).to_dict(orient="records")

@app.get("/history")
async def get_history():
    return analysis_history

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)