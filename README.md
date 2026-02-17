📞 Customer Support Quality Auditor
📌 Project Overview

Customer Support Quality Auditor is an AI-powered system developed to automate the analysis of customer support calls.

The system performs:

🎙️ Call transcription (Speech → Text)

📝 Call summarization (Text → Short Summary)

📊 Structured output storage in CSV format

This helps organizations quickly evaluate customer interactions and improve service quality.

🚀 Features

✅ Converts customer call audio to text

✅ Stores transcriptions in CSV

✅ Generates concise AI-powered summaries

✅ Uses Hugging Face Large Language Model (LLM)

✅ Handles multiple call logs automatically

✅ Saves final summaries in structured format

✅ Django-based project structure

🧠 AI Models Used
1️⃣ Speech-to-Text

Used in:

transcribe.py


Purpose:
Convert customer support call recordings into text format.

2️⃣ Text Summarization

Model Used:
facebook/bart-large-cnn

Provider:
Hugging Face Inference API (Router)

Purpose:
Generate short, clear summaries (6–8 words) from call logs.

🛠️ Tech Stack

Python 3.10+

Django

Hugging Face Inference API

Requests library

CSV handling

SQLite3

Virtual Environment (venv)

📂 Project Structure
customer-support-quality-auditor/
│
├── customer_support/
│   ├── calls/
│   ├── members/
│   ├── chat_summary.py
│   ├── summarize.py
│   ├── transcribe.py
│   ├── transcriptions.csv
│   ├── final_summaries.csv
│   ├── db.sqlite3
│
├── newenv/
├── .env
└── manage.py

🔄 System Workflow
Step 1: Transcription

Audio files → transcribe.py
Output → transcriptions.csv

Step 2: Summarization

Text from transcriptions.csv → summarize.py
Output → final_summaries.csv

⚙️ Installation & Setup
1️⃣ Create Virtual Environment
python -m venv newenv


Activate:

Windows:

newenv\Scripts\activate

2️⃣ Install Dependencies
pip install requests django

3️⃣ Set Hugging Face API Token

⚠️ Never hardcode tokens.

Set environment variable:

Windows:

setx HF_TOKEN "your_token_here"


Mac/Linux:

export HF_TOKEN="your_token_here"

▶️ Running the Project
Run Transcription
python transcribe.py

Run Summarization
python summarize.py

Run chat_summary
python chat_summary.py

📊 Example
Input (Call Log)
Customer was charged twice and requested refund.
Agent confirmed refund within 3-5 days.

Output (Summary)
Double charge refund processing

🎯 Use Cases

Customer Support Centers

Call Quality Monitoring

CRM Systems

Helpdesk Automation

AI-powered Call Auditing

🔐 Security Note

API tokens must be stored in .env

Do NOT commit secrets to GitHub

Rotate exposed tokens immediately

📈 Future Enhancements

Sentiment Analysis

Complaint Category Classification

Real-time Dashboard

Call Quality Scoring

Web Interface for Report Viewing

Cloud Deployment

👨‍💻 Internship Project

Developed as part of the Infosys Internship Program

Project Title:
Customer Support Quality Auditor