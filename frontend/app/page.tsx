"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Cpu,
  Gauge,
  HeartPulse,
  Radio,
  Router,
  SignalHigh,
} from "lucide-react";
import {
  clearFault,
  executeAgentCommand,
  getAgentOrchestration,
  getCopilotAnalysis,
  getTelemetry,
  injectFault,
  startScenario,
  stopScenario,
} from "@/lib/api";
import { AgentDetectionFeed } from "@/components/AgentDetectionFeed";
import { CommandAgentPanel } from "@/components/CommandAgentPanel";
import { CopilotPanel } from "@/components/CopilotPanel";
import { ControlPanel } from "@/components/ControlPanel";
import { DemoPanel } from "@/components/DemoPanel";
import { ExecutiveMode } from "@/components/ExecutiveMode";
import { IncidentTimeline } from "@/components/IncidentTimeline";
import { LiveIncidentFeed } from "@/components/LiveIncidentFeed";
import { MetricCard } from "@/components/MetricCard";
import { NetworkTopology } from "@/components/NetworkTopology";
import { PredictionPanel } from "@/components/PredictionPanel";
import { TelemetryChart } from "@/components/TelemetryChart";
import type {
  AgentCommand,
  AgentOrchestration,
  CopilotAnalysis,
  RiskLevel,
  Telemetry,
  TelemetryPoint,
} from "@/types/telemetry";

const MAX_POINTS = 30;
const ANALYSIS_RISK_BUCKET = 15;
const ANALYSIS_SEVERITY_BUCKET = 0.2;

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function calculateHealthScore(telemetry: Telemetry) {
  return clamp(
    100 - telemetry.latency * 0.3 - telemetry.packet_loss * 2 - telemetry.cpu * 0.2,
  );
}

function calculateFailureProbability(telemetry: Telemetry) {
  const latencyRisk = clamp((telemetry.latency - 35) / 85, 0, 1);
  const lossRisk = clamp(telemetry.packet_loss / 25, 0, 1);
  const cpuRisk = clamp((telemetry.cpu - 45) / 55, 0, 1);
  const bandwidthRisk = clamp((telemetry.bandwidth - 70) / 30, 0, 1);

  return clamp(
    latencyRisk * 0.35 + lossRisk * 0.32 + cpuRisk * 0.25 + bandwidthRisk * 0.08,
    0,
    1,
  );
}

function toTelemetryPoint(telemetry: Telemetry): TelemetryPoint {
  const now = new Date();

  return {
    ...telemetry,
    timestamp: now.getTime(),
    time: now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    healthScore: calculateHealthScore(telemetry),
    failureProbability: calculateFailureProbability(telemetry),
  };
}

function getTone(value: number, warning: number, critical: number, inverse = false) {
  if (inverse) {
    if (value <= critical) return "critical";
    if (value <= warning) return "warning";
    return "healthy";
  }

  if (value >= critical) return "critical";
  if (value >= warning) return "warning";
  return "healthy";
}

function getRiskLevel(telemetry?: TelemetryPoint): RiskLevel {
  if (!telemetry) {
    return "Healthy";
  }

  if (telemetry.failureProbability >= 0.7 || telemetry.healthScore < 45) {
    return "Critical";
  }

  if (telemetry.failureProbability >= 0.35 || telemetry.healthScore < 70) {
    return "Warning";
  }

  return "Healthy";
}

function getAnalysisSignature(
  telemetry: TelemetryPoint,
  riskLevel: RiskLevel,
  faultActive: boolean,
) {
  const riskScore = telemetry.failureProbability * 100;
  const severityPressure = Math.max(
    telemetry.failureProbability,
    (100 - telemetry.healthScore) / 100,
  );

  return [
    faultActive,
    riskLevel,
    Math.floor(riskScore / ANALYSIS_RISK_BUCKET),
    Math.floor(severityPressure / ANALYSIS_SEVERITY_BUCKET),
  ].join(":");
}

export default function Home() {
  const [points, setPoints] = useState<TelemetryPoint[]>([]);
  const [isFaultActive, setIsFaultActive] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [copilotAnalysis, setCopilotAnalysis] = useState<CopilotAnalysis>();
  const [agentOrchestration, setAgentOrchestration] = useState<AgentOrchestration>();
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);
  const [isAgentLoading, setIsAgentLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<"connecting" | "online" | "offline">(
    "connecting",
  );
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"Technical" | "Executive">("Technical");
  const [isCommandBusy, setIsCommandBusy] = useState(false);
  const [commandStatus, setCommandStatus] = useState<string>();
  const analysisSignatureRef = useRef<string | undefined>(undefined);
  const analysisInFlightRef = useRef(false);
  const agentInFlightRef = useRef(false);

  const latest = points.at(-1);
  const riskLevel = getRiskLevel(latest);
  const hasAgentData = Boolean(agentOrchestration);

  const pollTelemetry = useCallback(async () => {
    try {
      const telemetry = await getTelemetry();
      const point = toTelemetryPoint(telemetry);
      setPoints((current) => [...current, point].slice(-MAX_POINTS));
      setApiStatus("online");
    } catch {
      setApiStatus("offline");
    }
  }, []);

  useEffect(() => {
    void pollTelemetry();
    const interval = window.setInterval(() => {
      void pollTelemetry();
    }, 1000);

    return () => window.clearInterval(interval);
  }, [pollTelemetry]);

  useEffect(() => {
    if (!latest || analysisInFlightRef.current) return;

    const signature = getAnalysisSignature(latest, riskLevel, isFaultActive);
    if (analysisSignatureRef.current === signature) return;

    analysisSignatureRef.current = signature;
    analysisInFlightRef.current = true;
    setIsCopilotLoading(true);

    void getCopilotAnalysis({
      telemetry: latest,
      riskScore: latest.failureProbability * 100,
      severity: riskLevel,
      faultActive: isFaultActive,
    })
      .then((analysis) => {
        setCopilotAnalysis(analysis);
      })
      .catch(() => {
        setCopilotAnalysis((current) => current);
      })
      .finally(() => {
        analysisInFlightRef.current = false;
        setIsCopilotLoading(false);
      });
  }, [latest, riskLevel, isFaultActive]);

  useEffect(() => {
    if (!latest || agentInFlightRef.current) return;

    agentInFlightRef.current = true;
    if (!hasAgentData) {
      setIsAgentLoading(true);
    }

    void getAgentOrchestration({
      telemetry: latest,
      riskScore: latest.failureProbability * 100,
      severity: riskLevel,
      faultActive: isFaultActive,
    })
      .then((orchestration) => {
        setAgentOrchestration(orchestration);
      })
      .catch(() => {
        setAgentOrchestration((current) => current);
      })
      .finally(() => {
        agentInFlightRef.current = false;
        setIsAgentLoading(false);
      });
  }, [latest, riskLevel, isFaultActive, hasAgentData]);

  const handleInjectFault = async () => {
    setIsBusy(true);
    try {
      await injectFault();
      setIsFaultActive(true);
      await pollTelemetry();
    } finally {
      setIsBusy(false);
    }
  };

  const handleClearFault = async () => {
    setIsBusy(true);
    try {
      await clearFault();
      setIsFaultActive(false);
      await pollTelemetry();
    } finally {
      setIsBusy(false);
    }
  };

  const handleStartScenario = async (scenario: "mpls" | "branch_failure" | "cpu_overload") => {
    setIsBusy(true);
    try {
      await startScenario(scenario);
      setActiveScenario(scenario);
      setIsFaultActive(true);
      await pollTelemetry();
    } finally {
      setIsBusy(false);
    }
  };

  const handleStopScenario = async () => {
    setIsBusy(true);
    try {
      await stopScenario();
      setActiveScenario(null);
      setIsFaultActive(false);
      await pollTelemetry();
    } finally {
      setIsBusy(false);
    }
  };

  const handleAgentCommand = async (command: AgentCommand) => {
    setIsCommandBusy(true);
    setCommandStatus(undefined);
    try {
      const result = await executeAgentCommand(command);
      if (result.status === "AI Action Executed") {
        const label = result.command_label ?? "Command";
        setCommandStatus(`AI Action Executed: ${label}`);
        if (result.telemetry) {
          const point = toTelemetryPoint(result.telemetry);
          setPoints((current) => [...current, point].slice(-MAX_POINTS));
        }
        await pollTelemetry();
      } else {
        setCommandStatus(result.message ?? "Command rejected by local simulator.");
      }
    } catch {
      setCommandStatus("Command Agent unavailable.");
    } finally {
      setIsCommandBusy(false);
    }
  };

  const healthScore = latest?.healthScore ?? 0;
  const failureProbability = latest?.failureProbability ?? 0;

  return (
    <main className="min-h-screen bg-[#05070a] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.10),transparent_34%),linear-gradient(180deg,rgba(20,184,166,0.05),transparent_42%)]" />
      <div className="relative mx-auto flex w-full max-w-[1520px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
              <Router className="h-3.5 w-3.5" aria-hidden="true" />
              Live Network Operations
            </div>
            <h1 className="text-4xl font-semibold tracking-normal text-white sm:text-5xl">
              NetSentinel AI
            </h1>
            <p className="mt-2 text-base text-zinc-400 sm:text-lg">
              AI Reliability Copilot for Enterprise Networks
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ViewToggle value={viewMode} onChange={setViewMode} />
            <StatusPill label="Backend" value={apiStatus} />
            <StatusPill
              label="Fault Mode"
              value={isFaultActive ? "active" : "clear"}
              alert={isFaultActive}
            />
          </div>
        </header>

        {viewMode === "Executive" ? (
          <ExecutiveMode orchestration={agentOrchestration} telemetry={latest} />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="flex min-w-0 flex-col gap-6">
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <MetricCard
                  title="Network Health Score"
                  value={`${healthScore.toFixed(0)}/100`}
                  detail="Composite score from latency, packet loss, and CPU pressure."
                  icon={HeartPulse}
                  tone={getTone(healthScore, 70, 45, true)}
                >
                  <ProgressBar value={healthScore} tone={getTone(healthScore, 70, 45, true)} />
                </MetricCard>
                <MetricCard
                  title="Latency"
                  value={`${latest?.latency.toFixed(0) ?? "--"} ms`}
                  detail="Round-trip delay across monitored network paths."
                  icon={Activity}
                  tone={getTone(latest?.latency ?? 0, 70, 90)}
                />
                <MetricCard
                  title="Packet Loss"
                  value={`${latest?.packet_loss.toFixed(0) ?? "--"}%`}
                  detail="Dropped packets detected in the active telemetry stream."
                  icon={Radio}
                  tone={getTone(latest?.packet_loss ?? 0, 5, 10)}
                />
                <MetricCard
                  title="CPU Usage"
                  value={`${latest?.cpu.toFixed(0) ?? "--"}%`}
                  detail="Network device compute utilization."
                  icon={Cpu}
                  tone={getTone(latest?.cpu ?? 0, 70, 85)}
                />
                <MetricCard
                  title="Bandwidth Usage"
                  value={`${latest?.bandwidth.toFixed(0) ?? "--"}%`}
                  detail="Observed link utilization against available capacity."
                  icon={SignalHigh}
                  tone={getTone(latest?.bandwidth ?? 0, 75, 90)}
                />
                <MetricCard
                  title="Failure Probability"
                  value={`${(failureProbability * 100).toFixed(0)}%`}
                  detail="Risk estimate generated locally from live telemetry signals."
                  icon={Gauge}
                  tone={getTone(failureProbability * 100, 35, 70)}
                >
                  <ProgressBar
                    value={failureProbability * 100}
                    tone={getTone(failureProbability * 100, 35, 70)}
                  />
                </MetricCard>
              </section>

              <AgentDetectionFeed
                orchestration={agentOrchestration}
                riskLevel={riskLevel}
                isLoading={isAgentLoading}
              />

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ControlPanel
                  isFaultActive={isFaultActive}
                  isBusy={isBusy}
                  onInjectFault={handleInjectFault}
                  onClearFault={handleClearFault}
                />
                <CommandAgentPanel
                  isBusy={isCommandBusy || isBusy}
                  actionStatus={commandStatus}
                  onExecute={handleAgentCommand}
                />
              </section>

              <DemoPanel
                isBusy={isBusy}
                onStartScenario={handleStartScenario}
                onStopScenario={handleStopScenario}
                activeScenario={activeScenario}
              />

              <IncidentTimeline currentLevel={riskLevel} />

              <NetworkTopology telemetry={latest} />

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <TelemetryChart
                  title="Latency"
                  dataKey="latency"
                  unit="ms"
                  data={points}
                  color="#22d3ee"
                  domain={[0, 130]}
                />
                <TelemetryChart
                  title="Packet Loss"
                  dataKey="packet_loss"
                  unit="%"
                  data={points}
                  color="#f59e0b"
                  domain={[0, 30]}
                />
                <TelemetryChart
                  title="CPU"
                  dataKey="cpu"
                  unit="%"
                  data={points}
                  color="#ef4444"
                  domain={[0, 100]}
                />
              </section>
            </div>

            <div className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-6 xl:self-start">
              <CopilotPanel
                telemetry={latest}
                analysis={copilotAnalysis}
                orchestration={agentOrchestration}
                riskLevel={riskLevel}
                isLoading={isCopilotLoading || isAgentLoading}
              />
              <PredictionPanel prediction={agentOrchestration?.prediction} />
              <LiveIncidentFeed events={agentOrchestration?.incident_feed} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function ProgressBar({ value, tone }: { value: number; tone: string }) {
  const color =
    tone === "critical"
      ? "bg-red-400"
      : tone === "warning"
        ? "bg-amber-300"
        : "bg-emerald-300";

  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full rounded-full ${color} transition-all duration-500`}
        style={{ width: `${clamp(value)}%` }}
      />
    </div>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: "Technical" | "Executive";
  onChange: (value: "Technical" | "Executive") => void;
}) {
  return (
    <div className="inline-flex h-10 overflow-hidden rounded-md border border-white/10 bg-white/[0.04] p-1">
      {(["Technical", "Executive"] as const).map((mode) => {
        const isActive = value === mode;

        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className={`rounded px-3 text-sm font-semibold transition ${
              isActive
                ? "bg-cyan-400/20 text-cyan-100"
                : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            {mode} View
          </button>
        );
      })}
    </div>
  );
}

function StatusPill({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  const isOffline = value === "offline";
  const dotColor = alert || isOffline ? "bg-red-400" : "bg-emerald-300";

  return (
    <div className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-300">
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium capitalize text-zinc-100">{value}</span>
    </div>
  );
}
