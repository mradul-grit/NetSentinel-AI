"use client";

import { Gauge, GitBranch, RefreshCw, Route, Terminal, type LucideIcon } from "lucide-react";
import type { AgentCommand } from "@/types/telemetry";

type CommandAgentPanelProps = {
  isBusy: boolean;
  actionStatus?: string;
  onExecute: (command: AgentCommand) => void;
};

const commands: {
  command: AgentCommand;
  label: string;
  Icon: LucideIcon;
}[] = [
  {
    command: "reroute_traffic",
    label: "Reroute Traffic",
    Icon: Route,
  },
  {
    command: "restart_router",
    label: "Restart Router",
    Icon: RefreshCw,
  },
  {
    command: "increase_capacity",
    label: "Increase Capacity",
    Icon: Gauge,
  },
  {
    command: "failover_link",
    label: "Failover Link",
    Icon: GitBranch,
  },
];

export function CommandAgentPanel({
  isBusy,
  actionStatus,
  onExecute,
}: CommandAgentPanelProps) {
  return (
    <section className="rounded-lg border border-emerald-400/15 bg-zinc-950/80 p-4 shadow-2xl shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-300" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-zinc-100">Command Agent</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Simulated recovery actions</p>
        </div>
        <span className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-xs font-medium text-emerald-200">
          Local
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {commands.map(({ command, label, Icon }) => (
          <button
            key={command}
            type="button"
            onClick={() => onExecute(command)}
            disabled={isBusy}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-emerald-400/25 bg-emerald-500/10 px-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 min-h-10 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
        <p className="text-sm font-medium text-emerald-200">
          {actionStatus ?? "Command Agent standing by."}
        </p>
      </div>
    </section>
  );
}
