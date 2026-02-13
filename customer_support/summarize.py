import csv
import os
import time
from huggingface_hub import InferenceClient

# ===== Configuration =====
# Replace with your actual token
HF_TOKEN = "MY_API_KEY" 

# We use Qwen2.5-72B because it is widely available on all providers right now
client = InferenceClient(api_key=HF_TOKEN)

def summarize_call(transcript):
    if not transcript.strip():
        return "Empty transcript"

    try:
        # This function handles the Router logic for you (No 404s)
        completion = client.chat.completions.create(
            model="Qwen/Qwen2.5-72B-Instruct",
            messages=[
                {
                    "role": "system", 
                    "content": "Summarize this call in exactly one sentence. Format: [Name] called to [Action] resulting in [Outcome]."
                },
                {"role": "user", "content": transcript}
            ],
            max_tokens=100,
            temperature=0.1
        )
        return completion.choices[0].message.content.strip()
    
    except Exception as e:
        # If the model is busy, it will tell us to wait
        if "503" in str(e):
            print("Model is warming up... waiting 20s")
            time.sleep(20)
            return summarize_call(transcript)
        return f"Error: {str(e)}"

# ===== CSV Processing =====
input_file = "transcriptions.csv"
output_file = "final_summaries.csv"

if not os.path.exists(input_file):
    print(f"Error: {input_file} not found!")
    exit()

with open(input_file, mode="r", encoding="utf-8") as file:
    reader = csv.DictReader(file)
    rows = list(reader)
    
    print(f"Processing {len(rows)} calls via Inference Router...")

    with open(output_file, mode="w", newline="", encoding="utf-8") as out_file:
        writer = csv.DictWriter(out_file, fieldnames=reader.fieldnames + ["summary"])
        writer.writeheader()

        for idx, row in enumerate(rows, start=1):
            # IMPORTANT: Change "text" to your actual CSV column name
            text_data = row.get("text", "") 
            row["summary"] = summarize_call(text_data)
            writer.writerow(row)
            print(f"✅ Call #{idx} summarized.")

print(f"\nSuccess! Your summaries are in: {output_file}")

