import json
import os
import urllib.error
import urllib.request

from pydantic import BaseModel


OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://127.0.0.1:11434/api/generate")
OLLAMA_TAGS_URL = os.getenv("OLLAMA_TAGS_URL", "http://127.0.0.1:11434/api/tags")
PRIMARY_MODEL = os.getenv("OLLAMA_MODEL", "llama3:latest")
FALLBACK_MODEL = os.getenv("OLLAMA_FALLBACK_MODEL", "llama3:latest")
OLLAMA_TIMEOUT_SECONDS = 8

_selected_model = None

RISK_BUCKET_SIZE = 15
SEVERITY_BUCKET_SIZE = 0.2

_cached_signature = None
_cached_analysis = None


class CopilotAnalysisResponse(BaseModel):
    root_cause: str
    impact: str
    recommendation: str
    confidence: int


def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def calculate_health_score(telemetry):
    return clamp(
        100
        - telemetry["latency"] * 0.3
        - telemetry["packet_loss"] * 2
        - telemetry["cpu"] * 0.2,
        0,
        100,
    )


def calculate_risk_score(telemetry):
    latency_risk = clamp((telemetry["latency"] - 35) / 85, 0, 1)
    loss_risk = clamp(telemetry["packet_loss"] / 25, 0, 1)
    cpu_risk = clamp((telemetry["cpu"] - 45) / 55, 0, 1)
    bandwidth_risk = clamp((telemetry["bandwidth"] - 70) / 30, 0, 1)

    return round(
        100
        * clamp(
            latency_risk * 0.35
            + loss_risk * 0.32
            + cpu_risk * 0.25
            + bandwidth_risk * 0.08,
            0,
            1,
        )
    )


def normalize_risk_score(risk_score, telemetry):
    if risk_score is None:
        return calculate_risk_score(telemetry)

    risk_score = float(risk_score)
    if risk_score <= 1:
        risk_score *= 100

    return round(clamp(risk_score, 0, 100))


def normalize_severity(severity, risk_score, simulator_severity):
    if isinstance(severity, str) and severity.lower() in {
        "healthy",
        "warning",
        "critical",
    }:
        return severity.capitalize()

    pressure = max(risk_score / 100, simulator_severity)
    if pressure >= 0.7:
        return "Critical"
    if pressure >= 0.35:
        return "Warning"
    return "Healthy"


def build_prompt(telemetry, risk_score, severity, scenario=None):
    scenario_context = ""
    if scenario == "mpls":
        scenario_context = "\n\nIncident Type: MPLS Congestion - High latency and packet loss on core path."
    elif scenario == "branch_failure":
        scenario_context = "\n\nIncident Type: Branch Link Failure - Loss of connectivity to remote branch."
    elif scenario == "cpu_overload":
        scenario_context = "\n\nIncident Type: Router CPU Overload - Device CPU is saturated."
    
    return f"""
You are a senior network operations engineer.

Analyze the following live enterprise network telemetry:

Latency: {telemetry["latency"]}ms
Packet Loss: {telemetry["packet_loss"]}%
CPU: {telemetry["cpu"]}%
Bandwidth: {telemetry["bandwidth"]}%
Risk Score: {risk_score}%
Current Severity: {severity}{scenario_context}

Provide:
1. Most likely root cause
2. Expected business impact
3. Recommended action
4. Confidence score

Keep answers concise and professional.

Respond only as valid JSON using this exact schema:
{{
  "root_cause": "one concise sentence",
  "impact": "one concise sentence",
  "recommendation": "one concise sentence",
  "confidence": 87
}}
""".strip()


def analyze_network(
    telemetry,
    risk_score=None,
    severity=None,
    simulator_severity=0,
    fault_active=False,
    scenario=None,
):
    global _cached_signature, _cached_analysis

    normalized_risk_score = normalize_risk_score(risk_score, telemetry)
    normalized_severity = normalize_severity(
        severity,
        normalized_risk_score,
        simulator_severity,
    )
    signature = _analysis_signature(
        normalized_risk_score,
        normalized_severity,
        simulator_severity,
        fault_active,
    )

    if _cached_signature == signature and _cached_analysis is not None:
        return _cached_analysis

    prompt = build_prompt(telemetry, normalized_risk_score, normalized_severity, scenario)
    analysis = _generate_with_ollama(prompt)
    if analysis is None:
        analysis = _fallback_analysis(telemetry, normalized_risk_score, normalized_severity, scenario)

    _cached_signature = signature
    _cached_analysis = analysis

    return analysis


def _analysis_signature(risk_score, severity, simulator_severity, fault_active):
    risk_bucket = int(risk_score // RISK_BUCKET_SIZE)
    severity_bucket = int(simulator_severity // SEVERITY_BUCKET_SIZE)

    return (
        risk_bucket,
        severity,
        severity_bucket,
        bool(fault_active),
    )


def _generate_with_ollama(prompt):
    for model in (PRIMARY_MODEL, FALLBACK_MODEL):
        try:
            return _request_ollama(model, prompt)
        except (
            OSError,
            TimeoutError,
            urllib.error.URLError,
            AttributeError,
            KeyError,
            TypeError,
            ValueError,
            json.JSONDecodeError,
        ):
            continue

    return None


def _request_ollama(model, prompt):
    payload = {
        "model": model,
        "prompt": prompt,
        "format": "json",
        "stream": False,
        "keep_alive": "5m",
        "options": {
            "temperature": 0.2,
            "num_predict": 220,
        },
    }
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        OLLAMA_API_URL,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=OLLAMA_TIMEOUT_SECONDS) as response:
        response_body = json.loads(response.read().decode("utf-8"))

    return _normalize_analysis(json.loads(response_body["response"]))


def _normalize_analysis(raw_analysis):
    return CopilotAnalysisResponse(
        root_cause=_as_sentence(raw_analysis.get("root_cause")),
        impact=_as_sentence(raw_analysis.get("impact")),
        recommendation=_as_sentence(raw_analysis.get("recommendation")),
        confidence=round(clamp(int(raw_analysis.get("confidence", 80)), 0, 100)),
    )


def _fallback_analysis(telemetry, risk_score, severity, scenario=None):
    findings = []
    if telemetry["latency"] > 80:
        findings.append("high latency")
    if telemetry["packet_loss"] > 10:
        findings.append("packet loss")
    if telemetry["cpu"] > 80:
        findings.append("router CPU pressure")
    if telemetry["bandwidth"] > 85:
        findings.append("link saturation")

    # Scenario-specific fallback responses
    if scenario == "mpls":
        root_cause = "MPLS core path congestion causing elevated latency and packet loss."
        impact = "Branch office users experiencing slow application response times."
        recommendation = "Reroute traffic via secondary MPLS tunnel or increase core capacity."
        confidence = 92
    elif scenario == "branch_failure":
        root_cause = "Branch link failure or severe degradation detected."
        impact = "Complete or partial loss of connectivity to the branch office."
        recommendation = "Activate backup WAN link and verify branch router status."
        confidence = 95
    elif scenario == "cpu_overload":
        root_cause = "Router CPU utilization critically high, causing packet processing delays."
        impact = "All traffic through this device experiencing increased latency and drops."
        recommendation = "Enable load balancing, offload non-critical traffic, or upgrade device."
        confidence = 93
    elif severity == "Critical":
        root_cause = (
            "Core path congestion is likely driving elevated latency, packet loss, "
            "and device pressure."
        )
        impact = (
            "Enterprise applications may see degraded response times, retries, "
            "and intermittent service disruption."
        )
        recommendation = (
            "Prioritize the Core Router and Branch B path, validate interface errors, "
            "and shift traffic if capacity is constrained."
        )
        confidence = 88
    elif severity == "Warning":
        root_cause = (
            "Early degradation is emerging across "
            f"{', '.join(findings) if findings else 'network telemetry'}."
        )
        impact = "User experience may degrade if the current trend continues."
        recommendation = (
            "Monitor the affected path, check link utilization, and prepare failover capacity."
        )
        confidence = 82
    else:
        root_cause = "Telemetry is within normal operating thresholds."
        impact = "No material business impact is expected from the current telemetry."
        recommendation = "Continue monitoring and maintain current routing policy."
        confidence = 78

    if risk_score >= 85 and len(findings) >= 3 and not scenario:
        confidence = 92

    return CopilotAnalysisResponse(
        root_cause=root_cause,
        impact=impact,
        recommendation=recommendation,
        confidence=confidence,
    )


def _as_sentence(value):
    if not isinstance(value, str) or not value.strip():
        return "Analysis unavailable for this telemetry sample."

    return value.strip().replace("\n", " ")


def _get_available_models():
    """Fetch list of available models from Ollama."""
    try:
        request = urllib.request.Request(
            OLLAMA_TAGS_URL,
            method="GET",
        )
        with urllib.request.urlopen(request, timeout=5) as response:
            data = json.loads(response.read().decode("utf-8"))
            models = data.get("models", [])
            return [m["name"] for m in models]
    except Exception:
        return []


def select_available_model():
    """Select the best available model, preferring PRIMARY_MODEL."""
    global _selected_model
    
    if _selected_model is not None:
        return _selected_model
    
    available = _get_available_models()
    available_set = {model.lower() for model in available}
    
    # Check if primary model is available
    primary_lower = PRIMARY_MODEL.lower()
    if primary_lower in available_set:
        _selected_model = PRIMARY_MODEL
        return _selected_model
    
    # Check if fallback model is available
    fallback_lower = FALLBACK_MODEL.lower()
    if fallback_lower in available_set:
        _selected_model = FALLBACK_MODEL
        return _selected_model
    
    # If primary or fallback available but with different tags, try them anyway
    if primary_lower.startswith(PRIMARY_MODEL.split(":")[0].lower()):
        _selected_model = PRIMARY_MODEL
        return _selected_model
    
    if fallback_lower.startswith(FALLBACK_MODEL.split(":")[0].lower()):
        _selected_model = FALLBACK_MODEL
        return _selected_model
    
    # Default to primary if no models available (will fail gracefully with fallback_analysis)
    _selected_model = PRIMARY_MODEL
    return _selected_model


def get_selected_model():
    """Get the currently selected model."""
    return _selected_model if _selected_model else select_available_model()
