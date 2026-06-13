import math
import time
from threading import Lock


TRANSITION_SECONDS = 30.0

fault_mode = False

_severity = 0.0
_last_updated = time.monotonic()
_started_at = _last_updated
_lock = Lock()


def _clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def _lerp(start, end, amount):
    return start + (end - start) * amount


def _smoothstep(value):
    value = _clamp(value, 0.0, 1.0)
    return value * value * (3.0 - 2.0 * value)


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


def generate_telemetry():
    with _lock:
        now, severity = _advance_severity()
        seconds = now - _started_at

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
