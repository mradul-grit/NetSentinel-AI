import { BrainCircuit, CircleAlert, CircleCheck, RadioTower } from "lucide-react";
import type { CopilotAssessment, RiskLevel, TelemetryPoint } from "@/types/telemetry";

type CopilotPanelProps = {
  telemetry?: TelemetryPoint;
  assessment: CopilotAssessment;
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

export function CopilotPanel({ telemetry, assessment }: CopilotPanelProps) {
  const RiskIcon = riskIcons[assessment.riskLevel];
  const failureProbability = telemetry?.failureProbability ?? 0;
  const costSaved = failureProbability * 2000;
  const downtimePrevented = failureProbability * 0.5;

  return (
    <aside className="rounded-lg border border-cyan-400/15 bg-zinc-950/90 p-5 shadow-2xl shadow-cyan-950/20 xl:sticky xl:top-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-300/70">
            AI Copilot
          </p>
          <h2 className="mt-2 text-xl font-semibold text-zinc-50">
            Reliability Assessment
          </h2>
        </div>
        <div className="rounded-md border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-200">
          <BrainCircuit className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      <div className={`mt-5 flex items-center gap-3 rounded-lg border p-3 ${riskStyles[assessment.riskLevel]}`}>
        <RiskIcon className="h-5 w-5" aria-hidden="true" />
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-75">Risk Level</p>
          <p className="text-lg font-semibold">{assessment.riskLevel}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <Insight label="Root Cause" value={assessment.rootCause} />
        <Insight label="Business Impact" value={assessment.businessImpact} />
        <Insight label="Recommended Action" value={assessment.recommendedAction} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Estimated Downtime Prevented
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-50">
            {downtimePrevented.toFixed(2)}h
          </p>
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
