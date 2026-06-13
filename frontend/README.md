# NetSentinel AI Frontend

Next.js 15 dashboard for the NetSentinel AI network reliability copilot.

## Run

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:3000
```

Use another port if needed:

```bash
npm run dev -- --port 3001
```

## Backend URL

The API client defaults to:

```text
http://127.0.0.1:8000
```

To override it, create `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

## Scripts

```bash
npm run lint
npm run build
npm run start
```

## Dashboard Modules

- `app/page.tsx`: live dashboard state, polling, scoring, and layout
- `components/MetricCard.tsx`: health and telemetry cards
- `components/TelemetryChart.tsx`: live Recharts visualizations
- `components/CopilotPanel.tsx`: local AI incident explanation panel
- `components/ControlPanel.tsx`: fault injection and recovery controls
- `lib/api.ts`: FastAPI integration
- `types/telemetry.ts`: shared dashboard types
