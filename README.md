<<<<<<< HEAD
# NetSentinel-AI


# NetSentinel AI

AI-powered predictive network monitoring system.

## Features

- Real-time telemetry dashboard
- Anomaly detection
- Fault injection simulation
- AI operations copilot
- Live monitoring interface

## Tech Stack

Frontend:
- Next.js
- TypeScript

Backend:
- FastAPI
- Python
- Scikit-learn

## Run Locally

### Backend

cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000

### Frontend

cd frontend
npm install
npm run dev

Frontend:
http://localhost:3000

Backend:
http://localhost:8000

Swagger:
http://localhost:8000/docs
=======
# NetSentinel AI

AI Reliability Copilot for Enterprise Networks.

NetSentinel AI is a hackathon-ready network operations dashboard that monitors live telemetry, detects degraded conditions, explains likely root causes, and estimates the business impact of preventing a network failure.

## What It Shows

- Live enterprise network telemetry from a FastAPI simulator
- Network health score based on latency, packet loss, and CPU utilization
- Failure probability generated from telemetry risk signals
- Recharts-powered live charts for latency, packet loss, and CPU
- Fault injection and recovery controls
- AI Copilot panel with local incident explanations
- Estimated downtime prevented and cost saved

## Architecture

```text
NetSentinel-AI/
├─ backend/
│  ├─ main.py            FastAPI app and API routes
│  ├─ simulator.py       Live telemetry and fault simulation
│  ├─ model.py           Isolation Forest anomaly model
│  └─ requirements.txt
└─ frontend/
   ├─ app/               Next.js dashboard route and global styles
   ├─ components/        Dashboard cards, charts, copilot, controls
   ├─ lib/api.ts         Backend API client
   └─ types/             Shared TypeScript telemetry types
```

## Tech Stack

- Backend: FastAPI, Python, scikit-learn
- Frontend: Next.js 15, TypeScript, Tailwind CSS
- Visualization: Recharts
- UI style: Dark enterprise SOC dashboard

## Backend API

The frontend expects the backend to run at `http://127.0.0.1:8000`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/` | API welcome response |
| GET | `/health` | Health check |
| GET | `/telemetry` | Current telemetry sample |
| POST | `/inject-fault` | Simulate network degradation |
| POST | `/clear-fault` | Return simulator to normal mode |

Telemetry shape:

```json
{
  "latency": 35,
  "packet_loss": 3,
  "cpu": 55,
  "bandwidth": 62
}
```

## Run Locally

### 1. Start Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Backend URL:

```text
http://127.0.0.1:8000
```

### 2. Start Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

```text
http://127.0.0.1:3000
```

If port `3000` is busy:

```bash
npm run dev -- --port 3001
```

## Frontend Environment

The frontend defaults to:

```text
http://127.0.0.1:8000
```

To override it, create `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

## Risk Logic

Health score:

```text
healthScore = 100 - latency * 0.3 - packet_loss * 2 - cpu * 0.2
```

The score is clamped between `0` and `100`.

Failure probability increases as latency, packet loss, CPU usage, and bandwidth utilization rise.

Business impact:

```text
costSaved = failureProbability * 2000
downtimePrevented = failureProbability * 0.5
```

## Copilot Rules

The AI Copilot generates local explanations from telemetry:

| Condition | Explanation |
| --- | --- |
| `latency > 80` | Network congestion detected. |
| `packet_loss > 10` | Packet loss indicates possible link degradation. |
| `cpu > 80` | Network device CPU utilization is critically high. |

It also displays:

- Risk level
- Root cause
- Business impact
- Recommended action

## Demo Flow

1. Start the FastAPI backend.
2. Start the Next.js frontend.
3. Open the dashboard and show live telemetry updating every second.
4. Click `Inject Failure`.
5. Watch latency, packet loss, CPU, and failure probability rise.
6. Explain the Copilot root-cause analysis and business impact.
7. Click `Clear Failure`.
8. Show health score recovery and risk reduction.

## Quality Checks

Run these before presenting:

```bash
cd frontend
npm run lint
npm run build
```

## Hackathon Pitch

Enterprise networks fail silently before they fail visibly. NetSentinel AI turns raw telemetry into an operations-center experience: live health scoring, fault simulation, business impact, and an AI copilot that explains what is going wrong before downtime happens.
>>>>>>> 827d631 (verify project setup and demo flow)
