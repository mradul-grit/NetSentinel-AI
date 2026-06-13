"use client";

import { AlertCircle, Zap } from "lucide-react";

type DemoPanelProps = {
  isBusy: boolean;
  onStartScenario: (scenario: "mpls" | "branch_failure" | "cpu_overload") => void;
  onStopScenario: () => void;
  activeScenario: string | null;
};

export function DemoPanel({
  isBusy,
  onStartScenario,
  onStopScenario,
  activeScenario,
}: DemoPanelProps) {
  const scenarios = [
    {
      id: "mpls" as const,
      label: "MPLS Congestion",
      description: "High latency on core path",
    },
    {
      id: "branch_failure" as const,
      label: "Branch Link Failure",
      description: "Loss of remote site connectivity",
    },
    {
      id: "cpu_overload" as const,
      label: "Router CPU Overload",
      description: "Device processing at capacity",
    },
  ];

  return (
    <section className="rounded-lg border border-purple-400/20 bg-purple-950/30 p-4 shadow-2xl shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-300" />
            <h2 className="text-sm font-semibold text-purple-100">Demo Scenarios</h2>
          </div>
          <p className="mt-1 text-xs text-purple-300/70">
            Demonstrate incident detection and response
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => onStartScenario(scenario.id)}
            disabled={isBusy || activeScenario !== null}
            className={`rounded-md border px-3 py-2 text-left text-xs font-medium transition ${
              activeScenario === scenario.id
                ? "border-purple-400 bg-purple-400/20 text-purple-100"
                : "border-purple-400/30 bg-purple-400/10 text-purple-200 hover:bg-purple-400/15 disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
          >
            <div className="font-semibold">{scenario.label}</div>
            <div className="text-xs opacity-75">{scenario.description}</div>
          </button>
        ))}
      </div>

      {activeScenario && (
        <button
          onClick={onStopScenario}
          disabled={isBusy}
          className="mt-4 w-full rounded-md border border-red-400/30 bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <AlertCircle className="mb-1 inline h-3.5 w-3.5" /> Stop Scenario
        </button>
      )}
    </section>
  );
}
