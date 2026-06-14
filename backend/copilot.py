import json
import os
import urllib.error
import urllib.request
from datetime import datetime
from threading import Lock

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

_agent_lock = Lock()
_agent_feed = []
_last_agent_signature = None
_last_orchestration = None
_previous_agent_risk = None
MAX_AGENT_FEED_EVENTS = 28


class CopilotAnalysisResponse(BaseModel):
    root_cause: str
    impact: str
    recommendation: str
    confidence: int


class DetectionAgentOutput(BaseModel):
    anomaly_type: str
    confidence: int
    affected_metrics: list[str]
    trend: str
    why: str


class RootCauseAgentOutput(BaseModel):
    primary_cause: str
    alternative_causes: list[str]
    confidence: int


class ImpactAgentOutput(BaseModel):
    business_impact: str
    estimated_users_affected: int
    estimated_revenue_risk: int


class PredictionPoint(BaseModel):
    label: str
    risk: int


class PredictionAgentOutput(BaseModel):
    current_failure_risk: int
    risk_15_min: int
    risk_30_min: int
    risk_60_min: int
    trend: str
    series: list[PredictionPoint]


class RemediationAgentOutput(BaseModel):
    action_plan: list[str]
    recommended_decision: str


class ExecutiveSummary(BaseModel):
    business_risk: str
    downtime_prevented: str
    cost_saved: int
    affected_customers: int
    recommended_decision: str


class AgentFeedEvent(BaseModel):
    timestamp: str
    agent: str
    message: str
    severity: str


class AgentOrchestrationResponse(BaseModel):
    generated_at: str
    flow: list[str]
    detection: DetectionAgentOutput
    root_cause: RootCauseAgentOutput
    impact: ImpactAgentOutput
    prediction: PredictionAgentOutput
    remediation: RemediationAgentOutput
    executive: ExecutiveSummary
    incident_feed: list[AgentFeedEvent]


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


def orchestrate_agents(
    telemetry,
    risk_score=None,
    severity=None,
    simulator_severity=0,
    fault_active=False,
    scenario=None,
    command_state=None,
):
    normalized_risk_score = normalize_risk_score(risk_score, telemetry)
    normalized_severity = normalize_severity(
        severity,
        normalized_risk_score,
        simulator_severity,
    )

    with _agent_lock:
        previous_risk = _previous_agent_risk

    trend = _risk_trend(normalized_risk_score, previous_risk, fault_active)
    detection = _detection_agent(
        telemetry,
        normalized_risk_score,
        normalized_severity,
        trend,
        scenario,
    )
    root_cause = _root_cause_agent(detection, scenario)
    impact = _impact_agent(detection, telemetry, normalized_risk_score)
    prediction = _prediction_agent(
        normalized_risk_score,
        detection,
        bool(fault_active),
        command_state or {},
    )
    remediation = _remediation_agent(detection, prediction)
    executive = _executive_agent(impact, remediation, normalized_risk_score)

    response = AgentOrchestrationResponse(
        generated_at=datetime.now().isoformat(timespec="seconds"),
        flow=[
            "Telemetry",
            "Detection Agent",
            "Root Cause Agent",
            "Impact Agent",
            "Prediction Agent",
            "Remediation Agent",
        ],
        detection=detection,
        root_cause=root_cause,
        impact=impact,
        prediction=prediction,
        remediation=remediation,
        executive=executive,
        incident_feed=[],
    )

    with _agent_lock:
        _store_orchestration(response, normalized_risk_score, normalized_severity)
        response.incident_feed = _latest_feed_events()

    return response


def record_command_event(command_label):
    with _agent_lock:
        _append_feed_event_unlocked(
            "Command Agent",
            f"{command_label} simulated; telemetry mitigation effect applied.",
            "Info",
        )


def _risk_trend(current_risk, previous_risk, fault_active):
    if previous_risk is None:
        if fault_active and current_risk >= 45:
            return "Worsening"
        return "Stable"

    delta = current_risk - previous_risk
    if delta >= 5:
        return "Worsening"
    if delta <= -5:
        return "Improving"
    return "Stable"


def _detection_agent(telemetry, risk_score, severity, trend, scenario):
    affected_metrics = _affected_metrics(telemetry)

    if scenario == "mpls":
        anomaly_type = "MPLS latency spike"
    elif scenario == "branch_failure":
        anomaly_type = "Branch connectivity degradation"
    elif scenario == "cpu_overload":
        anomaly_type = "Router CPU saturation"
    elif telemetry["cpu"] >= 82:
        anomaly_type = "Router CPU saturation"
    elif telemetry["packet_loss"] >= 10 and telemetry["bandwidth"] <= 65:
        anomaly_type = "Branch connectivity degradation"
    elif telemetry["latency"] >= 75 and telemetry["packet_loss"] >= 5:
        anomaly_type = "MPLS latency spike"
    elif risk_score >= 35:
        anomaly_type = "Early network degradation"
    else:
        anomaly_type = "No active anomaly"

    if anomaly_type == "No active anomaly":
        confidence = 78
        why = "Telemetry remains within normal operating thresholds across latency, loss, CPU, and bandwidth."
    else:
        confidence = round(
            clamp(
                68
                + risk_score * 0.24
                + len(affected_metrics) * 4
                + (8 if severity == "Critical" else 0),
                70,
                97,
            )
        )
        why = _detection_explanation(affected_metrics, anomaly_type)

    return DetectionAgentOutput(
        anomaly_type=anomaly_type,
        confidence=confidence,
        affected_metrics=affected_metrics or ["No metric outside baseline"],
        trend=trend,
        why=why,
    )


def _root_cause_agent(detection, scenario):
    anomaly = detection.anomaly_type

    if anomaly == "MPLS latency spike":
        primary = "Core MPLS congestion"
        alternatives = ["Routing loop", "Link saturation", "Carrier path instability"]
    elif anomaly == "Branch connectivity degradation":
        primary = "Branch WAN underlay degradation"
        alternatives = ["ISP outage", "CPE interface errors", "Last-mile packet loss"]
    elif anomaly == "Router CPU saturation":
        primary = "Router CPU saturation on the active forwarding path"
        alternatives = ["Routing churn", "Control-plane punt storm", "Oversubscribed services"]
    elif anomaly == "Early network degradation":
        primary = "Emerging congestion across a shared network path"
        alternatives = ["Burst traffic", "Interface errors", "Policy queue pressure"]
    else:
        primary = "No fault signature detected"
        alternatives = ["Normal baseline variance", "Post-recovery telemetry settling"]

    confidence = detection.confidence
    if scenario:
        confidence = min(98, confidence + 4)
    if anomaly == "No active anomaly":
        confidence = 76

    return RootCauseAgentOutput(
        primary_cause=primary,
        alternative_causes=alternatives,
        confidence=confidence,
    )


def _impact_agent(detection, telemetry, risk_score):
    if detection.anomaly_type == "MPLS latency spike":
        business_impact = (
            "Branch applications, ATM-style authorization, EMR lookups, and POS "
            "transactions may experience delayed responses."
        )
    elif detection.anomaly_type == "Branch connectivity degradation":
        business_impact = (
            "Remote branch users and customer-facing terminals may see failed sessions "
            "or forced failover."
        )
    elif detection.anomaly_type == "Router CPU saturation":
        business_impact = (
            "Shared routing services may delay access to critical applications across "
            "multiple sites."
        )
    elif detection.anomaly_type == "Early network degradation":
        business_impact = (
            "User experience is beginning to degrade; customer transactions may slow if "
            "the trend continues."
        )
    else:
        business_impact = "No material customer or operational impact is expected."

    if risk_score < 20:
        users_affected = 0
        revenue_risk = 0
    else:
        users_affected = round(
            clamp(
                risk_score * 42
                + max(0, telemetry["latency"] - 45) * 18
                + telemetry["packet_loss"] * 55,
                25,
                9000,
            )
        )
        revenue_risk = round((users_affected * 16 + risk_score * 130) / 100) * 100

    return ImpactAgentOutput(
        business_impact=business_impact,
        estimated_users_affected=users_affected,
        estimated_revenue_risk=revenue_risk,
    )


def _prediction_agent(risk_score, detection, fault_active, command_state):
    command_strength = float(command_state.get("command_strength", 0) or 0)
    command_active = command_strength >= 0.15
    trend = detection.trend

    if command_active or trend == "Improving":
        deltas = (-8, -14, -22)
    elif fault_active or trend == "Worsening":
        deltas = (12, 21, 30)
    elif risk_score >= 35:
        deltas = (4, 7, 11)
    else:
        deltas = (1, 2, 4)

    risk_15 = round(clamp(risk_score + deltas[0], 0, 100))
    risk_30 = round(clamp(risk_score + deltas[1], 0, 100))
    risk_60 = round(clamp(risk_score + deltas[2], 0, 100))

    if risk_60 <= risk_score - 5:
        prediction_trend = "Improving"
    elif risk_60 >= risk_score + 8:
        prediction_trend = "Worsening"
    else:
        prediction_trend = "Stable"

    current = round(clamp(risk_score, 0, 100))
    return PredictionAgentOutput(
        current_failure_risk=current,
        risk_15_min=risk_15,
        risk_30_min=risk_30,
        risk_60_min=risk_60,
        trend=prediction_trend,
        series=[
            PredictionPoint(label="Now", risk=current),
            PredictionPoint(label="15m", risk=risk_15),
            PredictionPoint(label="30m", risk=risk_30),
            PredictionPoint(label="60m", risk=risk_60),
        ],
    )


def _remediation_agent(detection, prediction):
    anomaly = detection.anomaly_type

    if anomaly == "MPLS latency spike":
        plan = [
            "Verify MPLS utilization and carrier handoff errors.",
            "Shift priority traffic to SD-WAN or the secondary WAN path.",
            "Validate latency and packet loss recovery for branch applications.",
            "Close the incident after the risk trend remains stable for 15 minutes.",
        ]
        decision = "Approve SD-WAN failover for impacted branch traffic."
    elif anomaly == "Branch connectivity degradation":
        plan = [
            "Confirm branch WAN circuit health and CPE interface status.",
            "Fail over the branch to the backup link.",
            "Validate application reachability for users at the affected site.",
            "Notify the site owner and monitor packet loss for recovery.",
        ]
        decision = "Fail over the branch link and keep customer traffic online."
    elif anomaly == "Router CPU saturation":
        plan = [
            "Identify the router process or traffic class consuming CPU.",
            "Restart the affected routing service or router during the approved window.",
            "Offload non-critical traffic or increase forwarding capacity.",
            "Validate CPU recovery and routing adjacency stability.",
        ]
        decision = "Reduce router CPU pressure before packet drops increase."
    elif anomaly == "Early network degradation":
        plan = [
            "Watch latency, packet loss, CPU, and bandwidth for the next polling window.",
            "Check interface utilization and queue drops on the shared path.",
            "Prepare failover capacity if the 30 minute risk continues rising.",
            "Escalate to network engineering if user impact appears.",
        ]
        decision = "Prepare mitigation while keeping the incident in observation."
    else:
        plan = [
            "Continue live telemetry monitoring.",
            "Keep failover and capacity controls ready.",
            "No recovery action is required while risk remains low.",
        ]
        decision = "Maintain current routing policy."

    if prediction.trend == "Worsening" and anomaly != "No active anomaly":
        decision = f"{decision} Prediction is worsening; act within 15 minutes."

    return RemediationAgentOutput(action_plan=plan, recommended_decision=decision)


def _executive_agent(impact, remediation, risk_score):
    if risk_score >= 70:
        business_risk = "High business risk"
    elif risk_score >= 35:
        business_risk = "Moderate business risk"
    else:
        business_risk = "Low business risk"

    downtime_minutes = round(clamp(risk_score * 0.42, 0, 45))
    cost_saved = round((impact.estimated_revenue_risk * 0.62) / 100) * 100
    affected_customers = round(impact.estimated_users_affected * 0.72)

    return ExecutiveSummary(
        business_risk=business_risk,
        downtime_prevented=f"{downtime_minutes} min",
        cost_saved=cost_saved,
        affected_customers=affected_customers,
        recommended_decision=remediation.recommended_decision,
    )


def _affected_metrics(telemetry):
    metrics = []
    if telemetry["latency"] >= 70:
        metrics.append(f"Latency {telemetry['latency']:.0f} ms")
    if telemetry["packet_loss"] >= 5:
        metrics.append(f"Packet loss {telemetry['packet_loss']:.1f}%")
    if telemetry["cpu"] >= 75:
        metrics.append(f"CPU {telemetry['cpu']:.0f}%")
    if telemetry["bandwidth"] >= 80:
        metrics.append(f"Bandwidth {telemetry['bandwidth']:.0f}%")
    return metrics


def _detection_explanation(affected_metrics, anomaly_type):
    if affected_metrics:
        metrics = ", ".join(affected_metrics)
    else:
        metrics = "telemetry pressure"

    return (
        f"{anomaly_type} was detected because {metrics} crossed the local "
        "baseline thresholds for the monitored path."
    )


def _store_orchestration(response, risk_score, severity):
    global _last_agent_signature, _last_orchestration, _previous_agent_risk

    detection = response.detection
    root_cause = response.root_cause
    impact = response.impact
    prediction = response.prediction
    remediation = response.remediation

    signature = (
        detection.anomaly_type,
        detection.trend,
        int(risk_score // 10),
        root_cause.primary_cause,
        prediction.trend,
        remediation.recommended_decision,
    )

    if signature != _last_agent_signature:
        _append_feed_event_unlocked(
            "Detection Agent",
            f"{detection.anomaly_type}: {detection.why}",
            severity,
        )
        _append_feed_event_unlocked(
            "Root Cause Agent",
            f"Primary cause: {root_cause.primary_cause}.",
            severity,
        )
        _append_feed_event_unlocked(
            "Impact Agent",
            f"{impact.business_impact} Users affected: {impact.estimated_users_affected}.",
            severity,
        )
        _append_feed_event_unlocked(
            "Prediction Agent",
            f"60 minute risk is {prediction.risk_60_min}% and {prediction.trend.lower()}.",
            severity,
        )
        _append_feed_event_unlocked(
            "Remediation Agent",
            remediation.recommended_decision,
            severity,
        )
        _last_agent_signature = signature

    _previous_agent_risk = risk_score
    _last_orchestration = response


def _append_feed_event_unlocked(agent, message, severity):
    _agent_feed.append(
        AgentFeedEvent(
            timestamp=datetime.now().strftime("%H:%M"),
            agent=agent,
            message=message,
            severity=severity,
        )
    )

    if len(_agent_feed) > MAX_AGENT_FEED_EVENTS:
        del _agent_feed[: len(_agent_feed) - MAX_AGENT_FEED_EVENTS]


def _latest_feed_events():
    return list(reversed(_agent_feed[-MAX_AGENT_FEED_EVENTS:]))


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
