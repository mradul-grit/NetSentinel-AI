import { BrainCircuit, CircleAlert, CircleCheck, RadioTower } from "lucide-react";
import type {
  AgentOrchestration,
  CopilotAnalysis,
  RiskLevel,
  TelemetryPoint,
} from "@/types/telemetry";

type CopilotPanelProps = {
  telemetry?: TelemetryPoint;
  analysis?: CopilotAnalysis;
  orchestration?: AgentOrchestration;
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
  orchestration,
  riskLevel,
  isLoading,
}: CopilotPanelProps) {
  const RiskIcon = riskIcons[riskLevel];
  const failureProbability = telemetry?.failureProbability ?? 0;
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
  const rootCause = orchestration?.root_cause.primary_cause ?? displayAnalysis.root_cause;
  const alternatives = orchestration?.root_cause.alternative_causes ?? [];
  const businessImpact = orchestration?.impact.business_impact ?? displayAnalysis.impact;
  const actionPlan = orchestration?.remediation.action_plan;
  const recommendation =
    orchestration?.remediation.recommended_decision ?? displayAnalysis.recommendation;
  const confidence = orchestration?.root_cause.confidence ?? displayAnalysis.confidence;
  const costSaved = orchestration?.executive.cost_saved ?? failureProbability * 2000;

  return (
    <aside className="rounded-lg border border-cyan-400/15 bg-zinc-950/90 p-5 shadow-2xl shadow-cyan-950/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-300/70">
            AI Network Operations Assistant
          </p>
          <h2 className="mt-2 text-xl font-semibold text-zinc-50">
            Copilot Panel
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
        <Insight label="Primary Cause" value={rootCause} />
        {alternatives.length ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              Alternative Causes
            </p>
            <ul className="mt-2 space-y-2">
              {alternatives.map((cause) => (
                <li key={cause} className="flex gap-2 text-sm leading-5 text-zinc-300">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                  {cause}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <Insight label="Business Impact" value={businessImpact} />
        <Insight label="Recommended Decision" value={recommendation} />
        {actionPlan?.length ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              Action Plan
            </p>
            <ol className="mt-2 space-y-2">
              {actionPlan.map((step, index) => (
                <li key={step} className="flex gap-2 text-sm leading-5 text-zinc-300">
                  <span className="font-mono text-xs text-cyan-300">
                    {index + 1}.
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Assistant Confidence
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-50">
            {confidence.toFixed(0)}%
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full transition-all duration-300 ${
                confidence >= 85
                  ? "bg-emerald-500"
                  : confidence >= 70
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${confidence}%` }}
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
