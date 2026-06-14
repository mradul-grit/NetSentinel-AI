from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from copilot import (
    AgentOrchestrationResponse,
    CopilotAnalysisResponse,
    analyze_network,
    get_selected_model,
    orchestrate_agents,
    record_command_event,
    select_available_model,
)
from simulator import (
    clear_fault,
    execute_ai_action,
    generate_telemetry,
    get_scenario,
    get_simulator_state,
    inject_fault,
    start_scenario,
    stop_scenario,
)
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
        scenario=simulator_state.get("scenario"),
    )


@app.get("/agent-orchestration", response_model=AgentOrchestrationResponse)
def agent_orchestration(
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

    return orchestrate_agents(
        telemetry_data,
        risk_score=risk_score,
        severity=severity,
        simulator_severity=simulator_state["severity"],
        fault_active=simulator_state["fault_mode"] if fault_active is None else fault_active,
        scenario=simulator_state.get("scenario"),
        command_state=simulator_state,
    )


@app.post("/agent-command/{command_name}")
def execute_agent_command(command_name: str):
    result = execute_ai_action(command_name)
    if result is None:
        return {
            "status": "error",
            "message": "Invalid command",
            "allowed_commands": [
                "reroute_traffic",
                "restart_router",
                "increase_capacity",
                "failover_link",
            ],
        }

    record_command_event(result["command_label"])
    result["telemetry"] = generate_telemetry()
    return result


@app.post("/inject-fault")
def fault():
    inject_fault()
    return {"status": "fault injected"}

@app.post("/clear-fault")
def clear():
    clear_fault()
    return {"status": "fault cleared"}

@app.post("/scenario/{scenario_name}")
def start_demo_scenario(scenario_name: str):
    """Start a demo scenario: mpls, branch_failure, or cpu_overload."""
    if scenario_name not in ("mpls", "branch_failure", "cpu_overload"):
        return {"status": "error", "message": "Invalid scenario"}
    start_scenario(scenario_name)
    return {"status": "scenario started", "scenario": scenario_name}

@app.post("/scenario/stop")
def stop_demo_scenario():
    """Stop the current demo scenario."""
    stop_scenario()
    return {"status": "scenario stopped"}

@app.get("/scenario")
def get_current_scenario():
    """Get the current scenario."""
    return {"scenario": get_scenario()}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
