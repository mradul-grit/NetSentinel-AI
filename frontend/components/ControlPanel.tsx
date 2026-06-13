"use client";

import { AlertTriangle, ShieldCheck, Zap } from "lucide-react";

type ControlPanelProps = {
  isFaultActive: boolean;
  isBusy: boolean;
  onInjectFault: () => void;
  onClearFault: () => void;
};

export function ControlPanel({
  isFaultActive,
  isBusy,
  onInjectFault,
  onClearFault,
}: ControlPanelProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-zinc-950/80 p-4 shadow-2xl shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Fault Controls</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Simulate degraded network behavior and validate recovery posture.
          </p>
        </div>
        <div
          className={`rounded-md border p-2 ${
            isFaultActive
              ? "border-red-400/30 bg-red-400/10 text-red-300"
              : "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
          }`}
        >
          {isFaultActive ? (
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onInjectFault}
          disabled={isBusy}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-red-400/30 bg-red-500/15 px-4 text-sm font-semibold text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Zap className="h-4 w-4" aria-hidden="true" />
          Inject Failure
        </button>
        <button
          type="button"
          onClick={onClearFault}
          disabled={isBusy}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-500/15 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Clear Failure
        </button>
      </div>
    </section>
  );
}
