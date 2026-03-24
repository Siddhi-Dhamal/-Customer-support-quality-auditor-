import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import app as audio_app
from chat_app import app as chat_app
from scoring_server import app as scoring_app

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
@app.get("/health")
async def health():
    return {"status": "ok", "service": "AuraQ Combined Server"}

# Include all routes from each server directly
for route in audio_app.routes:
    app.router.routes.append(route)

for route in chat_app.routes:
    app.router.routes.append(route)

for route in scoring_app.routes:
    app.router.routes.append(route)



if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)