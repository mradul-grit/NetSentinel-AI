import random

fault_mode = False

def generate_telemetry():

    if fault_mode:
        latency = random.randint(80, 120)
        packet_loss = random.randint(10, 25)
        cpu = random.randint(70, 95)
        bandwidth = random.randint(85, 100)

    else:
        latency = random.randint(20, 50)
        packet_loss = random.randint(0, 3)
        cpu = random.randint(20, 60)
        bandwidth = random.randint(30, 70)

    return {
        "latency": latency,
        "packet_loss": packet_loss,
        "cpu": cpu,
        "bandwidth": bandwidth
    }

def inject_fault():
    global fault_mode
    fault_mode = True

def clear_fault():
    global fault_mode
    fault_mode = False