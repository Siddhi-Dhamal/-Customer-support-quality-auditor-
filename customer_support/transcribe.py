import whisper
import os
import pandas as pd

# Load Whisper model
model = whisper.load_model("base")  
# tiny (fast), base (balanced), small (better accuracy)

audio_folder = "calls"

data = []

for file in os.listdir(audio_folder):
    if file.endswith(".m4a"):
        
        print(f"Processing {file}...")
        
        file_path = os.path.join(audio_folder, file)
        result = model.transcribe(file_path, language="en")
        
        data.append({
            "file_name": file,
            "transcription": result["text"]
        })

# Save to CSV
df = pd.DataFrame(data)
df.to_csv("transcriptions.csv", index=False)

print("All .m4a files transcribed successfully!")
