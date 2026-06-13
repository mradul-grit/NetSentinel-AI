import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type MetricTone = "healthy" | "warning" | "critical" | "neutral";

type MetricCardProps = {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: MetricTone;
  children?: ReactNode;
};

const toneStyles: Record<MetricTone, string> = {
  healthy: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  warning: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  critical: "border-red-400/30 bg-red-400/10 text-red-300",
  neutral: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
};

export function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
  children,
}: MetricCardProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-zinc-950/80 p-4 shadow-2xl shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            {title}
          </p>
          <p className="mt-3 text-2xl font-semibold text-zinc-50">{value}</p>
        </div>
        <div className={`rounded-md border p-2 ${toneStyles[tone]}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 text-sm text-zinc-400">{detail}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
