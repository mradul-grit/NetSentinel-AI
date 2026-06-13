from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from simulator import generate_telemetry, inject_fault, clear_fault
import uvicorn

app = FastAPI(title="NetSentinel-AI API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "NetSentinel-AI Backend API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/telemetry")
def telemetry():
    return generate_telemetry()

@app.post("/inject-fault")
def fault():
    inject_fault()
    return {"status": "fault injected"}

@app.post("/clear-fault")
def clear():
    clear_fault()
    return {"status": "fault cleared"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)