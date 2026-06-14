import {
  Activity,
  Minus,
  Radar,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { AgentOrchestration, AgentTrend, RiskLevel } from "@/types/telemetry";

type AgentDetectionFeedProps = {
  orchestration?: AgentOrchestration;
  riskLevel: RiskLevel;
  isLoading: boolean;
};

const trendIcons: Record<AgentTrend, LucideIcon> = {
  Improving: TrendingDown,
  Stable: Minus,
  Worsening: TrendingUp,
};

const trendStyles: Record<AgentTrend, string> = {
  Improving: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  Stable: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
  Worsening: "border-red-400/30 bg-red-400/10 text-red-200",
};

const riskStyles: Record<RiskLevel, string> = {
  Healthy: "border-emerald-400/25 text-emerald-200",
  Warning: "border-amber-400/30 text-amber-200",
  Critical: "border-red-400/35 text-red-200",
};

export function AgentDetectionFeed({
  orchestration,
  riskLevel,
  isLoading,
}: AgentDetectionFeedProps) {
  const detection = orchestration?.detection;
  const trend = detection?.trend ?? "Stable";
  const TrendIcon = trendIcons[trend];

  return (
    <section className="rounded-lg border border-cyan-400/15 bg-zinc-950/80 p-4 shadow-2xl shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radar className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-zinc-100">AI Detection Feed</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Detection Agent continuously classifies live telemetry.
          </p>
        </div>
        <div
          className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold uppercase tracking-[0.16em] ${riskStyles[riskLevel]}`}
        >
          <span className="h-2 w-2 rounded-full bg-current" />
          {riskLevel}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_170px]">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Anomaly Type
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-50">
            {detection?.anomaly_type ?? "Awaiting telemetry"}
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            {detection?.why ??
              "The Detection Agent will explain the next anomaly once telemetry arrives."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
              Confidence
            </p>
            <p className="mt-2 text-2xl font-semibold text-cyan-100">
              {detection ? `${detection.confidence}%` : "--"}
            </p>
          </div>
          <div className={`rounded-lg border p-3 ${trendStyles[trend]}`}>
            <div className="flex items-center gap-2">
              <TrendIcon className="h-4 w-4" aria-hidden="true" />
              <p className="text-xs font-medium uppercase tracking-[0.16em] opacity-75">
                Trend
              </p>
            </div>
            <p className="mt-2 text-lg font-semibold">{trend}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(detection?.affected_metrics ?? ["Telemetry stream pending"]).map((metric) => (
          <span
            key={metric}
            className="inline-flex min-h-8 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-zinc-300"
          >
            <Activity className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
            {metric}
          </span>
        ))}
      </div>

      {isLoading ? (
        <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-cyan-300/70">
          Agents synchronizing
        </p>
      ) : null}
    </section>
  );
}
