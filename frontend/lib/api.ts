import type { Telemetry } from "@/types/telemetry";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getTelemetry() {
  return request<Telemetry>("/telemetry");
}

export function injectFault() {
  return request<{ status: string }>("/inject-fault", { method: "POST" });
}

export function clearFault() {
  return request<{ status: string }>("/clear-fault", { method: "POST" });
}
