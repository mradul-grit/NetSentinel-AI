import { BrainCircuit, CircleAlert, CircleCheck, RadioTower } from "lucide-react";
import type { CopilotAnalysis, RiskLevel, TelemetryPoint } from "@/types/telemetry";

type CopilotPanelProps = {
  telemetry?: TelemetryPoint;
  analysis?: CopilotAnalysis;
  riskLevel: RiskLevel;
  isLoading: boolean;
};

const riskStyles: Record<RiskLevel, string> = {
  Healthy: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  Warning: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  Critical: "border-red-400/30 bg-red-400/10 text-red-200",
};

const riskIcons: Record<RiskLevel, typeof CircleCheck> = {
  Healthy: CircleCheck,
  Warning: RadioTower,
  Critical: CircleAlert,
};

export function CopilotPanel({
  telemetry,
  analysis,
  riskLevel,
  isLoading,
}: CopilotPanelProps) {
  const RiskIcon = riskIcons[riskLevel];
  const failureProbability = telemetry?.failureProbability ?? 0;
  const costSaved = failureProbability * 2000;
  const displayAnalysis = analysis ?? {
    root_cause: telemetry
      ? "AI analysis is being prepared from the latest telemetry."
      : "Awaiting live telemetry from the network simulator.",
    impact: telemetry
      ? "Business impact will update when the assistant receives enough signal."
      : "No active operational risk has been observed yet.",
    recommendation: telemetry
      ? "Continue monitoring while the assistant prepares the next assessment."
      : "Start the FastAPI backend and keep telemetry polling active.",
    confidence: 0,
  };

  return (
    <aside className="rounded-lg border border-cyan-400/15 bg-zinc-950/90 p-5 shadow-2xl shadow-cyan-950/20 xl:sticky xl:top-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-300/70">
            AI Network Operations Assistant
          </p>
          <h2 className="mt-2 text-xl font-semibold text-zinc-50">
            Reliability Assessment
          </h2>
        </div>
        <div className="rounded-md border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-200">
          <BrainCircuit className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      <div className={`mt-5 flex items-center gap-3 rounded-lg border p-3 ${riskStyles[riskLevel]}`}>
        <RiskIcon className="h-5 w-5" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] opacity-75">Risk Level</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-lg font-semibold">{riskLevel}</p>
            {isLoading ? (
              <p className="text-xs font-medium uppercase tracking-[0.18em] opacity-75">
                Updating
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <Insight label="Root Cause" value={displayAnalysis.root_cause} />
        <Insight label="Business Impact" value={displayAnalysis.impact} />
        <Insight label="Recommendation" value={displayAnalysis.recommendation} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Assistant Confidence
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-50">
            {displayAnalysis.confidence.toFixed(0)}%
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full transition-all duration-300 ${
                displayAnalysis.confidence >= 85
                  ? "bg-emerald-500"
                  : displayAnalysis.confidence >= 70
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${displayAnalysis.confidence}%` }}
            />
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Estimated Cost Saved
          </p>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">
            ${costSaved.toFixed(0)}
          </p>
        </div>
      </div>
    </aside>
  );
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-sm leading-6 text-zinc-200">{value}</p>
    </div>
  );
}
