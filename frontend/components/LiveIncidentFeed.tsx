import { Bot, RadioTower } from "lucide-react";
import type { AgentFeedEvent } from "@/types/telemetry";

type LiveIncidentFeedProps = {
  events?: AgentFeedEvent[];
};

const severityStyles: Record<AgentFeedEvent["severity"], string> = {
  Healthy: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  Warning: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  Critical: "border-red-400/30 bg-red-400/10 text-red-200",
  Info: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
};

export function LiveIncidentFeed({ events = [] }: LiveIncidentFeedProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-zinc-950/80 p-4 shadow-2xl shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <RadioTower className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-zinc-100">Live Incident Feed</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Agent handoffs</p>
        </div>
        <span className="rounded-md border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-xs font-medium text-cyan-200">
          {events.length}
        </span>
      </div>

      <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
        {events.length ? (
          events.map((event, index) => (
            <div
              key={`${event.timestamp}-${event.agent}-${index}`}
              className="rounded-lg border border-white/10 bg-white/[0.035] p-3"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-md border p-1.5 ${severityStyles[event.severity]}`}>
                  <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono text-xs text-zinc-500">
                      {event.timestamp}
                    </span>
                    <span className="text-xs font-semibold text-zinc-100">
                      {event.agent}:
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-zinc-300">{event.message}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm text-zinc-500">
            Awaiting agent activity.
          </div>
        )}
      </div>
    </section>
  );
}
