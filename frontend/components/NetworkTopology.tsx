import { Building2, Router, Server } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import type { TelemetryPoint } from "@/types/telemetry";

type Tone = "healthy" | "warning" | "critical";

type NodeConfig = {
  id: string;
  label: string;
  detail: string;
  x: number;
  y: number;
  tone: Tone;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const toneStyles: Record<
  Tone,
  {
    border: string;
    panel: string;
    icon: string;
    dot: string;
    text: string;
    stroke: string;
    glow: string;
    label: string;
  }
> = {
  healthy: {
    border: "border-emerald-400/30",
    panel: "bg-emerald-400/10",
    icon: "text-emerald-200",
    dot: "bg-emerald-300",
    text: "text-emerald-200",
    stroke: "#34d399",
    glow: "shadow-emerald-950/30",
    label: "Nominal",
  },
  warning: {
    border: "border-amber-400/35",
    panel: "bg-amber-400/10",
    icon: "text-amber-200",
    dot: "bg-amber-300",
    text: "text-amber-200",
    stroke: "#f59e0b",
    glow: "shadow-amber-950/30",
    label: "Degrading",
  },
  critical: {
    border: "border-red-400/40",
    panel: "bg-red-400/10",
    icon: "text-red-200",
    dot: "bg-red-300",
    text: "text-red-200",
    stroke: "#ef4444",
    glow: "shadow-red-950/40",
    label: "Critical",
  },
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function getTopologySeverity(telemetry?: TelemetryPoint) {
  if (!telemetry) return 0;

  const healthPressure = (100 - telemetry.healthScore) / 100;
  return clamp(Math.max(telemetry.failureProbability, healthPressure));
}

function getTone(severity: number): Tone {
  if (severity >= 0.7) return "critical";
  if (severity >= 0.35) return "warning";
  return "healthy";
}

export function NetworkTopology({ telemetry }: { telemetry?: TelemetryPoint }) {
  const severity = getTopologySeverity(telemetry);
  const coreTone = getTone(severity);
  const branchBTone = coreTone;
  const riskPercent = Math.round(severity * 100);

  const nodes: NodeConfig[] = [
    {
      id: "branch-a",
      label: "Branch A",
      detail: "WAN Edge",
      x: 16,
      y: 24,
      tone: "healthy",
      Icon: Building2,
    },
    {
      id: "branch-b",
      label: "Branch B",
      detail: "Remote Site",
      x: 16,
      y: 76,
      tone: "healthy",
      Icon: Building2,
    },
    {
      id: "core-router",
      label: "Core Router",
      detail: telemetry ? `${telemetry.latency.toFixed(0)} ms latency` : "Awaiting telemetry",
      x: 50,
      y: 50,
      tone: coreTone,
      Icon: Router,
    },
    {
      id: "data-center",
      label: "Data Center",
      detail: telemetry ? `${telemetry.bandwidth.toFixed(0)}% utilization` : "Primary Services",
      x: 84,
      y: 50,
      tone: "healthy",
      Icon: Server,
    },
  ];

  return (
    <section className="rounded-lg border border-white/10 bg-zinc-950/80 p-4 shadow-2xl shadow-black/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Network Topology</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Branch connectivity and core routing health
          </p>
        </div>
        <div
          className={`inline-flex h-9 w-fit items-center gap-2 rounded-md border px-3 text-sm ${toneStyles[coreTone].border} ${toneStyles[coreTone].panel} ${toneStyles[coreTone].text}`}
        >
          <span className={`h-2 w-2 rounded-full ${toneStyles[coreTone].dot}`} />
          <span className="font-medium">{toneStyles[coreTone].label}</span>
          <span className="text-zinc-400">{riskPercent}%</span>
        </div>
      </div>

      <div className="relative mt-4 h-[340px] overflow-hidden rounded-lg border border-white/10 bg-[#070a0f]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:100%_25%,12.5%_100%]" />
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <TopologyLink x1={25} y1={28} x2={43} y2={47} tone="healthy" />
          <TopologyLink x1={25} y1={72} x2={43} y2={53} tone={branchBTone} />
          <TopologyLink x1={57} y1={50} x2={75} y2={50} tone="healthy" />
        </svg>

        <div className="absolute left-[34%] top-[18%] h-4 w-4 rounded-full border border-emerald-300/30 bg-emerald-300/20 blur-sm" />
        <div
          className={`absolute left-[35%] top-[68%] h-5 w-5 rounded-full border blur-sm ${toneStyles[branchBTone].border} ${toneStyles[branchBTone].panel}`}
        />

        {nodes.map((node) => (
          <TopologyNode key={node.id} node={node} />
        ))}
      </div>
    </section>
  );
}

function TopologyLink({
  x1,
  y1,
  x2,
  y2,
  tone,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tone: Tone;
}) {
  const styles = toneStyles[tone];

  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={styles.stroke}
        strokeOpacity="0.16"
        strokeWidth="4"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={styles.stroke}
        strokeOpacity="0.85"
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function TopologyNode({ node }: { node: NodeConfig }) {
  const styles = toneStyles[node.tone];
  const Icon = node.Icon;

  return (
    <div
      className="absolute w-[150px] -translate-x-1/2 -translate-y-1/2 sm:w-[170px]"
      style={{ left: `${node.x}%`, top: `${node.y}%` }}
    >
      <div
        className={`rounded-lg border bg-zinc-950/95 p-3 shadow-xl backdrop-blur ${styles.border} ${styles.glow}`}
      >
        <div className="flex items-start gap-3">
          <div className={`rounded-md border p-2 ${styles.border} ${styles.panel}`}>
            <Icon className={`h-4 w-4 ${styles.icon}`} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
              <p className="truncate text-sm font-semibold text-zinc-50">{node.label}</p>
            </div>
            <p className="mt-1 truncate text-xs text-zinc-500">{node.detail}</p>
            <p className={`mt-2 text-xs font-medium ${styles.text}`}>{styles.label}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
