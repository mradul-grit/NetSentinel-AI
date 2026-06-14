import math
import time
from threading import Lock


TRANSITION_SECONDS = 30.0
COMMAND_EFFECT_SECONDS = 55.0

fault_mode = False
scenario = None  # Can be "mpls", "branch_failure", "cpu_overload", or None

_severity = 0.0
_last_updated = time.monotonic()
_started_at = _last_updated
_last_command = None
_last_command_started_at = None
_lock = Lock()

COMMAND_PROFILES = {
    "reroute_traffic": {
        "label": "Reroute Traffic",
        "latency_delta": -24,
        "packet_loss_delta": -4.5,
        "cpu_delta": 2,
        "bandwidth_delta": -10,
    },
    "restart_router": {
        "label": "Restart Router",
        "latency_delta": -10,
        "packet_loss_delta": -2.5,
        "cpu_delta": -24,
        "bandwidth_delta": 0,
    },
    "increase_capacity": {
        "label": "Increase Capacity",
        "latency_delta": -15,
        "packet_loss_delta": -3,
        "cpu_delta": -3,
        "bandwidth_delta": -18,
    },
    "failover_link": {
        "label": "Failover Link",
        "latency_delta": -20,
        "packet_loss_delta": -7,
        "cpu_delta": 1,
        "bandwidth_delta": -8,
    },
}


def _clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def _lerp(start, end, amount):
    return start + (end - start) * amount


def _smoothstep(value):
    value = _clamp(value, 0.0, 1.0)
    return value * value * (3.0 - 2.0 * value)


def _command_strength(now):
    if _last_command is None or _last_command_started_at is None:
        return 0.0

    elapsed = max(0.0, now - _last_command_started_at)
    remaining = 1.0 - elapsed / COMMAND_EFFECT_SECONDS
    return _smoothstep(_clamp(remaining, 0.0, 1.0))


def _apply_command_effect(telemetry, now):
    strength = _command_strength(now)
    if strength <= 0:
        return telemetry

    profile = COMMAND_PROFILES[_last_command]
    return {
        "latency": _clamp(
            telemetry["latency"] + profile["latency_delta"] * strength,
            20,
            120,
        ),
        "packet_loss": _clamp(
            telemetry["packet_loss"] + profile["packet_loss_delta"] * strength,
            0,
            25,
        ),
        "cpu": _clamp(
            telemetry["cpu"] + profile["cpu_delta"] * strength,
            15,
            95,
        ),
        "bandwidth": _clamp(
            telemetry["bandwidth"] + profile["bandwidth_delta"] * strength,
            20,
            100,
        ),
    }


def _advance_severity():
    global _severity, _last_updated

    now = time.monotonic()
    elapsed = max(0.0, now - _last_updated)
    target = 1.0 if fault_mode else 0.0
    step = elapsed / TRANSITION_SECONDS

    if _severity < target:
        _severity = min(target, _severity + step)
    elif _severity > target:
        _severity = max(target, _severity - step)

    _last_updated = now
    return now, _smoothstep(_severity)


def _healthy_baseline(seconds):
    bandwidth = 50 + 7 * math.sin(seconds / 18) + 4 * math.sin(seconds / 7 + 1.4)
    cpu = 39 + 8 * math.sin(seconds / 21 + 0.6) + 5 * math.sin(seconds / 9 + 2.3)
    latency = 29 + 3 * math.sin(seconds / 16 + 2.0) + 2 * math.sin(seconds / 7)
    packet_loss = 0.7 + 0.35 * math.sin(seconds / 15 + 1.0) + 0.25 * math.sin(seconds / 6)

    return {
        "latency": _clamp(latency, 20, 50),
        "packet_loss": _clamp(packet_loss, 0, 3),
        "cpu": _clamp(cpu, 20, 60),
        "bandwidth": _clamp(bandwidth, 30, 70),
    }


def _critical_baseline(seconds):
    bandwidth = 92 + 5 * math.sin(seconds / 13 + 0.4) + 3 * math.sin(seconds / 6 + 1.2)
    cpu = 82 + 7 * math.sin(seconds / 11 + 2.1) + 3 * math.sin(seconds / 5)
    latency = 86 + 8 * math.sin(seconds / 10 + 0.8) + 4 * math.sin(seconds / 19)
    packet_loss = 11 + 3 * math.sin(seconds / 8 + 1.0) + 2 * math.sin(seconds / 17)

    return {
        "latency": latency,
        "packet_loss": packet_loss,
        "cpu": _clamp(cpu, 70, 95),
        "bandwidth": _clamp(bandwidth, 85, 100),
    }


def _scenario_mpls_baseline(seconds):
    """MPLS Congestion: High latency, moderate packet loss."""
    bandwidth = 80 + 6 * math.sin(seconds / 12)
    cpu = 60 + 4 * math.sin(seconds / 14 + 1.0)
    latency = 95 + 12 * math.sin(seconds / 9 + 1.5)  # High latency
    packet_loss = 8 + 2 * math.sin(seconds / 11)  # Moderate loss

    return {
        "latency": _clamp(latency, 80, 130),
        "packet_loss": _clamp(packet_loss, 5, 15),
        "cpu": _clamp(cpu, 50, 80),
        "bandwidth": _clamp(bandwidth, 70, 95),
    }


def _scenario_branch_failure_baseline(seconds):
    """Branch Link Failure: High packet loss, normal latency."""
    bandwidth = 20 + 3 * math.sin(seconds / 10)  # Very low bandwidth on failed branch
    cpu = 45 + 3 * math.sin(seconds / 16 + 0.5)
    latency = 55 + 5 * math.sin(seconds / 13 + 1.0)  # Moderate latency
    packet_loss = 18 + 4 * math.sin(seconds / 7 + 1.5)  # Very high packet loss

    return {
        "latency": _clamp(latency, 40, 80),
        "packet_loss": _clamp(packet_loss, 12, 25),
        "cpu": _clamp(cpu, 35, 70),
        "bandwidth": _clamp(bandwidth, 15, 50),
    }


def _scenario_cpu_overload_baseline(seconds):
    """Router CPU Overload: High CPU, elevated latency."""
    bandwidth = 75 + 5 * math.sin(seconds / 14)
    cpu = 88 + 6 * math.sin(seconds / 8 + 2.0)  # Very high CPU
    latency = 70 + 8 * math.sin(seconds / 11 + 1.2)  # High latency
    packet_loss = 6 + 1.5 * math.sin(seconds / 15)  # Minimal loss

    return {
        "latency": _clamp(latency, 60, 110),
        "packet_loss": _clamp(packet_loss, 3, 10),
        "cpu": _clamp(cpu, 80, 98),
        "bandwidth": _clamp(bandwidth, 65, 90),
    }



def generate_telemetry():
    with _lock:
        now, severity = _advance_severity()
        seconds = now - _started_at

        # If a scenario is active, use scenario-specific baselines
        if scenario:
            if scenario == "mpls":
                scenario_baseline = _scenario_mpls_baseline(seconds)
                healthy = _healthy_baseline(seconds)
                critical = scenario_baseline
            elif scenario == "branch_failure":
                scenario_baseline = _scenario_branch_failure_baseline(seconds)
                healthy = _healthy_baseline(seconds)
                critical = scenario_baseline
            elif scenario == "cpu_overload":
                scenario_baseline = _scenario_cpu_overload_baseline(seconds)
                healthy = _healthy_baseline(seconds)
                critical = scenario_baseline
            else:
                healthy = _healthy_baseline(seconds)
                critical = _critical_baseline(seconds)
        else:
            healthy = _healthy_baseline(seconds)
            critical = _critical_baseline(seconds)

        bandwidth = _lerp(healthy["bandwidth"], critical["bandwidth"], severity)
        cpu = _lerp(healthy["cpu"], critical["cpu"], severity)

        latency = _lerp(healthy["latency"], critical["latency"], severity)
        latency += max(0, bandwidth - 55) * (0.08 + 0.16 * severity)
        latency += max(0, cpu - 50) * (0.03 + 0.08 * severity)

        packet_loss = _lerp(healthy["packet_loss"], critical["packet_loss"], severity)
        packet_loss += max(0, latency - 35) * (0.015 + 0.1 * severity)

        telemetry = {
            "latency": _clamp(latency, 20, 120),
            "packet_loss": _clamp(packet_loss, 0, 25),
            "cpu": _clamp(cpu, 20, 95),
            "bandwidth": _clamp(bandwidth, 30, 100),
        }

        if severity == 0.0:
            telemetry["latency"] = _clamp(telemetry["latency"], 20, 50)
            telemetry["packet_loss"] = _clamp(telemetry["packet_loss"], 0, 3)
            telemetry["cpu"] = _clamp(telemetry["cpu"], 20, 60)
            telemetry["bandwidth"] = _clamp(telemetry["bandwidth"], 30, 70)
        elif severity == 1.0:
            telemetry["latency"] = _clamp(telemetry["latency"], 80, 120)
            telemetry["packet_loss"] = _clamp(telemetry["packet_loss"], 10, 25)
            telemetry["cpu"] = _clamp(telemetry["cpu"], 70, 95)
            telemetry["bandwidth"] = _clamp(telemetry["bandwidth"], 85, 100)

        telemetry = _apply_command_effect(telemetry, now)

        return {
            "latency": round(telemetry["latency"], 1),
            "packet_loss": round(telemetry["packet_loss"], 2),
            "cpu": round(telemetry["cpu"], 1),
            "bandwidth": round(telemetry["bandwidth"], 1),
        }


def inject_fault():
    global fault_mode

    with _lock:
        _advance_severity()
        fault_mode = True


def clear_fault():
    global fault_mode

    with _lock:
        _advance_severity()
        fault_mode = False


def get_simulator_state():
    with _lock:
        now, severity = _advance_severity()
        command_strength = _command_strength(now)

        return {
            "fault_mode": fault_mode,
            "severity": round(severity, 3),
            "scenario": scenario,
            "last_command": _last_command,
            "last_command_label": COMMAND_PROFILES[_last_command]["label"] if _last_command else None,
            "command_strength": round(command_strength, 3),
        }


def start_scenario(scenario_name):
    """Start a demo scenario."""
    global scenario, _severity, _started_at, _last_updated
    
    with _lock:
        scenario = scenario_name
        _severity = 0.0
        _last_updated = time.monotonic()
        _started_at = _last_updated
        # Inject fault automatically to trigger scenario
        globals()["fault_mode"] = True
        _advance_severity()


def stop_scenario():
    """Stop the current scenario and reset to normal."""
    global scenario, fault_mode
    
    with _lock:
        scenario = None
        fault_mode = False
        _advance_severity()


def get_scenario():
    """Get the current scenario."""
    return scenario


def execute_ai_action(command_name):
    """Apply a temporary local simulation effect for the command agent."""
    global _last_command, _last_command_started_at

    if command_name not in COMMAND_PROFILES:
        return None

    with _lock:
        _advance_severity()
        _last_command = command_name
        _last_command_started_at = time.monotonic()
        profile = COMMAND_PROFILES[command_name]

        return {
            "status": "AI Action Executed",
            "command": command_name,
            "command_label": profile["label"],
            "effect_seconds": COMMAND_EFFECT_SECONDS,
        }
