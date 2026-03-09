import os
import json
import pandas as pd
from groq import Groq
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from pathlib import Path 
import dotenv
from dotenv import load_dotenv
print(f"DEBUG: Loading .env from: {dotenv.find_dotenv()}")
load_dotenv(override=True)



# ---------------- CONFIG ----------------
GROQ_API_KEY          = os.getenv("GROQ_API_KEY","").strip()

TRANSCRIPT_AUDIO_FILE = "transcriptions_with_speakers.csv"
TRANSCRIPT_TEXT_FILE  = "text_transcript.csv"
ANALYSIS_OUTPUT_FILE  = "quality_scores.json"

print("Groq Key loaded:", GROQ_API_KEY[:15] + "...")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
client = Groq(api_key=GROQ_API_KEY)


class AnalyzeRequest(BaseModel):
    source: Optional[str] = "audio"


# ---------------- LOAD TRANSCRIPT ----------------

def load_transcript(source: str) -> list:
    fp = TRANSCRIPT_AUDIO_FILE if source == "audio" else TRANSCRIPT_TEXT_FILE
    for path in [fp, os.path.join("customer_support", fp)]:
        if os.path.exists(path):
            df = pd.read_csv(path)
            if not df.empty:
                return df.to_dict(orient="records")  # load ALL rows
    raise HTTPException(status_code=404, detail="Transcript not found: " + source)


# ---------------- BUILD COMPRESSED CONVERSATION ----------------

def build_conversation(transcript_data: list, max_chars: int = 3000) -> str:
    lines = []
    for item in transcript_data:
        spk = str(item.get("speaker", "Unknown"))
        txt = str(item.get("text", "")).strip()
        if not txt:
            continue
        if "00" in spk or "agent" in spk.lower():
            label = "Agent"
        else:
            label = "Customer"
        lines.append(label + ": " + txt)

    full_text = "\n".join(lines)

    # Keep first 40% + last 60% to preserve ending emotion
    if len(full_text) > max_chars:
        keep_start = int(max_chars * 0.4)
        keep_end   = int(max_chars * 0.6)
        full_text  = full_text[:keep_start] + "\n...\n" + full_text[-keep_end:]

    return full_text


# ---------------- EMOTION DETECTION ----------------

def detect_emotion(transcript_data: list) -> dict:
    conversation = build_conversation(transcript_data, max_chars=3000)

    if not conversation.strip():
        return {"emotion": "Neutral", "confidence": "50%", "reason": "No text found"}

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are analyzing a customer support call transcript.\n"
                        "Determine the customer's PRIMARY emotion at the END of the call.\n\n"
                        "RULES:\n"
                        "- Customer completes order smoothly and says thanks = Satisfied\n"
                        "- Customer agrees to buy after hesitation = Satisfied\n"
                        "- Customer calm and cooperative throughout = Neutral\n"
                        "- Only Frustrated/Angry if customer clearly complains or argues\n"
                        "- Only Anxious if customer expresses worry or fear\n"
                        "- Only Confused if customer does not understand what is happening\n\n"
                        "Pick ONE: Angry/Frustrated/Happy/Sad/Neutral/Confused/Satisfied/Anxious\n"
                        "Reply ONLY in this exact format:\n"
                        "EMOTION: x\n"
                        "CONFIDENCE: x%\n"
                        "REASON: one sentence"
                    )
                },
                {
                    "role": "user",
                    "content": "Analyze this full conversation and detect customer emotion:\n\n" + conversation
                }
            ],
            temperature=0.1,
            max_tokens=80
        )

        response = completion.choices[0].message.content.strip()
        result   = {"emotion": "Neutral", "confidence": "50%", "reason": "Could not detect"}

        for line in response.split("\n"):
            line = line.strip()
            if line.startswith("EMOTION:"):      result["emotion"]     = line.replace("EMOTION:", "").strip()
            elif line.startswith("CONFIDENCE:"): result["confidence"]  = line.replace("CONFIDENCE:", "").strip()
            elif line.startswith("REASON:"):     result["reason"]      = line.replace("REASON:", "").strip()

        print("Emotion result:", result)
        return result

    except Exception as e:
        print("Emotion Error:", e)
        return {"emotion": "Neutral", "confidence": "50%", "reason": "Detection failed: " + str(e)[:80]}


# ---------------- SATISFACTION DETECTION ----------------

def detect_satisfaction(transcript_data: list) -> dict:
    conversation = build_conversation(transcript_data, max_chars=3000)

    if not conversation.strip():
        return {"score": "50", "score_percentage": "50%", "status": "Neutral", "reason": "No data"}

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are analyzing a customer support call.\n"
                        "Rate how satisfied the customer was by the END of the call.\n\n"
                        "Scoring guide:\n"
                        "- Customer completes request, says thanks, no complaints = 75-95 (Satisfied)\n"
                        "- Customer agrees to purchase or accepts solution = 65-80 (Satisfied)\n"
                        "- Customer partially helped, some issues remain = 40-60 (Neutral)\n"
                        "- Customer unhappy, issue unresolved = 10-40 (Not Satisfied)\n\n"
                        "Reply ONLY in this exact format:\n"
                        "SCORE: <number 0-100>\n"
                        "STATUS: <Satisfied/Neutral/Not Satisfied>\n"
                        "REASON: <one sentence>"
                    )
                },
                {
                    "role": "user",
                    "content": "Analyze this conversation:\n\n" + conversation
                }
            ],
            temperature=0.1,
            max_tokens=80
        )

        response = completion.choices[0].message.content.strip()
        result   = {"score": "50", "score_percentage": "50%", "status": "Neutral", "reason": "Could not detect"}

        for line in response.split("\n"):
            line = line.strip()
            if line.startswith("SCORE:"):
                val = line.replace("SCORE:", "").strip()
                result["score"]            = val
                result["score_percentage"] = val + "%"
            elif line.startswith("STATUS:"): result["status"] = line.replace("STATUS:", "").strip()
            elif line.startswith("REASON:"): result["reason"] = line.replace("REASON:", "").strip()

        print("Satisfaction result:", result)
        return result

    except Exception as e:
        print("Satisfaction Error:", e)
        return {"score": "50", "score_percentage": "50%", "status": "Neutral", "reason": "Detection failed: " + str(e)[:80]}


# ---------------- SAVE RESULTS ----------------

def save_results(results: dict):
    for path in [ANALYSIS_OUTPUT_FILE, os.path.join("customer_support", ANALYSIS_OUTPUT_FILE)]:
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(results, f, indent=4, ensure_ascii=False)
            break
        except Exception:
            continue


# ================================================
#                   API ENDPOINTS
# ================================================

@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    transcript_data     = load_transcript(request.source)
    emotion_result      = detect_emotion(transcript_data)
    satisfaction_result = detect_satisfaction(transcript_data)

    final_result = {
        "status":  "success",
        "source":  request.source,
        "total_lines_analyzed": len(transcript_data),
        "emotion_analysis": {
            "emotion":    emotion_result["emotion"],
            "confidence": emotion_result["confidence"],
            "reason":     emotion_result["reason"]
        },
        "satisfaction_analysis": {
            "score":            satisfaction_result["score"],
            "score_percentage": satisfaction_result["score_percentage"],
            "status":           satisfaction_result["status"],
            "reason":           satisfaction_result["reason"]
        }
    }

    save_results(final_result)
    return JSONResponse(content=final_result)


@app.get("/get-analysis")
async def get_analysis():
    for path in [ANALYSIS_OUTPUT_FILE, os.path.join("customer_support", ANALYSIS_OUTPUT_FILE)]:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return JSONResponse(content=json.load(f))
    raise HTTPException(status_code=404, detail="No analysis found.")


@app.get("/health")
async def health_check():
    return {"status": "running", "server": "emotion_satisfaction", "port": 8002}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8002)