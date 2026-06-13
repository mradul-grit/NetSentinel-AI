from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from copilot import CopilotAnalysisResponse, analyze_network, get_selected_model, select_available_model
from simulator import clear_fault, generate_telemetry, get_simulator_state, inject_fault
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


@app.on_event("startup")
async def startup_event():
    """Log which Ollama model is selected on startup."""
    select_available_model()
    selected_model = get_selected_model()
    print(f"\n✓ Ollama Model Selected: {selected_model}\n")


@app.get("/")
def read_root():
    return {"message": "NetSentinel-AI Backend API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/telemetry")
def telemetry():
    return generate_telemetry()

@app.get("/copilot-analysis", response_model=CopilotAnalysisResponse)
def copilot_analysis(
    latency: float | None = None,
    packet_loss: float | None = None,
    cpu: float | None = None,
    bandwidth: float | None = None,
    risk_score: float | None = None,
    severity: str | None = None,
    fault_active: bool | None = None,
):
    telemetry_data = (
        {
            "latency": latency,
            "packet_loss": packet_loss,
            "cpu": cpu,
            "bandwidth": bandwidth,
        }
        if None not in (latency, packet_loss, cpu, bandwidth)
        else generate_telemetry()
    )
    simulator_state = get_simulator_state()

    return analyze_network(
        telemetry_data,
        risk_score=risk_score,
        severity=severity,
        simulator_severity=simulator_state["severity"],
        fault_active=simulator_state["fault_mode"] if fault_active is None else fault_active,
    )

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
