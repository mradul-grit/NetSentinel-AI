"use client";

import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import type { RiskLevel } from "@/types/telemetry";

type IncidentTimelineProps = {
  currentLevel: RiskLevel;
};

export function IncidentTimeline({ currentLevel }: IncidentTimelineProps) {
  const stages: { level: RiskLevel; label: string; icon: typeof CheckCircle; color: string }[] = [
    {
      level: "Healthy",
      label: "Healthy",
      icon: CheckCircle,
      color: "emerald",
    },
    {
      level: "Warning",
      label: "Warning",
      icon: AlertTriangle,
      color: "amber",
    },
    {
      level: "Critical",
      label: "Critical",
      icon: AlertCircle,
      color: "red",
    },
  ];

  return (
    <section className="rounded-lg border border-white/10 bg-zinc-950/80 p-4 shadow-2xl shadow-black/20">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        Incident Timeline
      </p>

      <div className="mt-4 flex items-center justify-between gap-2">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const isActive = currentLevel === stage.level;
          const isComplete =
            (currentLevel === "Warning" && stage.level === "Healthy") ||
            (currentLevel === "Critical" && stage.level !== "Critical");
          const colorClass =
            stage.color === "emerald"
              ? "text-emerald-400"
              : stage.color === "amber"
                ? "text-amber-400"
                : "text-red-400";

          return (
            <div key={stage.level} className="flex flex-col items-center gap-2">
              <div
                className={`rounded-full p-2 ${
                  isActive
                    ? `border-${stage.color}-400 border-2 bg-${stage.color}-400/20`
                    : isComplete
                      ? `border-${stage.color}-400/50 border opacity-50`
                      : "border-white/10 border opacity-25"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${isActive || isComplete ? colorClass : "text-zinc-600"}`}
                />
              </div>
              <span className={`text-xs font-semibold ${isActive ? "text-white" : "text-zinc-500"}`}>
                {stage.label}
              </span>

              {index < stages.length - 1 && (
                <div
                  className={`h-8 w-0.5 ${
                    isComplete || isActive ? "bg-white/20" : "bg-white/5"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-zinc-400">
        Current Status: <span className="font-semibold text-white">{currentLevel}</span>
      </p>
    </section>
  );
}
