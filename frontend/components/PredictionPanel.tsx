import { Activity, TrendingDown, TrendingUp, Waves, type LucideIcon } from "lucide-react";
import type { AgentTrend, PredictionAgentOutput } from "@/types/telemetry";

type PredictionPanelProps = {
  prediction?: PredictionAgentOutput;
};

const trendStyles: Record<AgentTrend, string> = {
  Improving: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  Stable: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
  Worsening: "border-red-400/30 bg-red-400/10 text-red-200",
};

const trendIcons: Record<AgentTrend, LucideIcon> = {
  Improving: TrendingDown,
  Stable: Activity,
  Worsening: TrendingUp,
};

const emptySeries = [
  { label: "Now", risk: 0 },
  { label: "15m", risk: 0 },
  { label: "30m", risk: 0 },
  { label: "60m", risk: 0 },
];

export function PredictionPanel({ prediction }: PredictionPanelProps) {
  const trend = prediction?.trend ?? "Stable";
  const TrendIcon = trendIcons[trend];
  const series = prediction?.series ?? emptySeries;

  return (
    <section className="rounded-lg border border-white/10 bg-zinc-950/80 p-4 shadow-2xl shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-zinc-100">Prediction Agent</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Failure risk forecast</p>
        </div>
        <div className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm ${trendStyles[trend]}`}>
          <TrendIcon className="h-4 w-4" aria-hidden="true" />
          <span className="font-medium">{trend}</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <RiskCell label="Current Failure Risk" value={prediction?.current_failure_risk} />
        <RiskCell label="15 Minute Risk" value={prediction?.risk_15_min} />
        <RiskCell label="30 Minute Risk" value={prediction?.risk_30_min} />
        <RiskCell label="60 Minute Risk" value={prediction?.risk_60_min} />
      </div>

      <div className="mt-5 flex h-36 items-end gap-3 rounded-lg border border-white/10 bg-[#070a0f] p-3">
        {series.map((point) => (
          <div key={point.label} className="flex h-full flex-1 flex-col justify-end gap-2">
            <div className="flex min-h-0 flex-1 items-end">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-cyan-500/30 to-cyan-300 shadow-lg shadow-cyan-950/30 transition-all duration-500"
                style={{ height: `${Math.max(6, point.risk)}%` }}
              />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-zinc-200">{point.risk}%</p>
              <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                {point.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RiskCell({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-zinc-50">
        {value === undefined ? "--" : `${value}%`}
      </p>
    </div>
  );
}
