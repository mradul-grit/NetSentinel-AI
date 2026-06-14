import { Banknote, BriefcaseBusiness, Clock, Users, type LucideIcon } from "lucide-react";
import type { AgentOrchestration, TelemetryPoint } from "@/types/telemetry";

type ExecutiveModeProps = {
  orchestration?: AgentOrchestration;
  telemetry?: TelemetryPoint;
};

export function ExecutiveMode({ orchestration, telemetry }: ExecutiveModeProps) {
  const executive = orchestration?.executive;
  const impact = orchestration?.impact;
  const remediation = orchestration?.remediation;
  const prediction = orchestration?.prediction;
  const businessRisk = executive?.business_risk ?? "Awaiting telemetry";
  const revenueRisk = impact?.estimated_revenue_risk ?? 0;

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-white/10 bg-zinc-950/80 p-5 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-300/70">
              Executive View
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-50">
              Network Business Risk
            </h2>
          </div>
          <div className="rounded-md border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-100">
            {telemetry ? `${telemetry.time} live` : "Connecting"}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ExecutiveMetric
            label="Business Risk"
            value={businessRisk}
            Icon={BriefcaseBusiness}
          />
          <ExecutiveMetric
            label="Downtime Prevented"
            value={executive?.downtime_prevented ?? "--"}
            Icon={Clock}
          />
          <ExecutiveMetric
            label="Cost Saved"
            value={`$${(executive?.cost_saved ?? 0).toLocaleString()}`}
            Icon={Banknote}
          />
          <ExecutiveMetric
            label="Affected Customers"
            value={(executive?.affected_customers ?? 0).toLocaleString()}
            Icon={Users}
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-white/10 bg-zinc-950/80 p-5 shadow-2xl shadow-black/20">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Recommended Decision
          </p>
          <p className="mt-3 text-2xl font-semibold leading-8 text-zinc-50">
            {executive?.recommended_decision ?? "Waiting for agent recommendation."}
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                Business Impact
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-200">
                {impact?.business_impact ?? "Impact model pending."}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                Estimated Revenue Risk
              </p>
              <p className="mt-2 text-3xl font-semibold text-amber-200">
                ${revenueRisk.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-zinc-950/80 p-5 shadow-2xl shadow-black/20">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            60 Minute Risk
          </p>
          <p className="mt-2 text-5xl font-semibold text-zinc-50">
            {prediction ? `${prediction.risk_60_min}%` : "--"}
          </p>
          <p className="mt-2 text-sm font-medium text-cyan-200">
            {prediction?.trend ?? "Stable"}
          </p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-cyan-300 transition-all duration-500"
              style={{ width: `${prediction?.risk_60_min ?? 0}%` }}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-zinc-950/80 p-5 shadow-2xl shadow-black/20">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
          Action Plan
        </p>
        <ol className="mt-4 grid gap-3 lg:grid-cols-2">
          {(remediation?.action_plan ?? ["Awaiting Remediation Agent output."]).map(
            (step, index) => (
              <li
                key={`${step}-${index}`}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-zinc-200"
              >
                <span className="mr-2 font-mono text-cyan-300">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {step}
              </li>
            ),
          )}
        </ol>
      </section>
    </div>
  );
}

function ExecutiveMetric({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
            {label}
          </p>
          <p className="mt-3 text-2xl font-semibold text-zinc-50">{value}</p>
        </div>
        <div className="rounded-md border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-200">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
