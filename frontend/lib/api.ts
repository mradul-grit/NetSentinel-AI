import type {
  AgentCommand,
  AgentCommandResponse,
  AgentOrchestration,
  CopilotAnalysis,
  RiskLevel,
  Telemetry,
  TelemetryPoint,
} from "@/types/telemetry";

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

export function getCopilotAnalysis({
  telemetry,
  riskScore,
  severity,
  faultActive,
}: {
  telemetry: TelemetryPoint;
  riskScore: number;
  severity: RiskLevel;
  faultActive: boolean;
}) {
  const params = new URLSearchParams({
    latency: telemetry.latency.toFixed(1),
    packet_loss: telemetry.packet_loss.toFixed(2),
    cpu: telemetry.cpu.toFixed(1),
    bandwidth: telemetry.bandwidth.toFixed(1),
    risk_score: riskScore.toFixed(0),
    severity,
    fault_active: String(faultActive),
  });

  return request<CopilotAnalysis>(`/copilot-analysis?${params.toString()}`);
}

export function getAgentOrchestration({
  telemetry,
  riskScore,
  severity,
  faultActive,
}: {
  telemetry: TelemetryPoint;
  riskScore: number;
  severity: RiskLevel;
  faultActive: boolean;
}) {
  const params = new URLSearchParams({
    latency: telemetry.latency.toFixed(1),
    packet_loss: telemetry.packet_loss.toFixed(2),
    cpu: telemetry.cpu.toFixed(1),
    bandwidth: telemetry.bandwidth.toFixed(1),
    risk_score: riskScore.toFixed(0),
    severity,
    fault_active: String(faultActive),
  });

  return request<AgentOrchestration>(`/agent-orchestration?${params.toString()}`);
}

export function executeAgentCommand(command: AgentCommand) {
  return request<AgentCommandResponse>(`/agent-command/${command}`, {
    method: "POST",
  });
}

export function startScenario(scenario: "mpls" | "branch_failure" | "cpu_overload") {
  return request<{ status: string; scenario: string }>(`/scenario/${scenario}`, {
    method: "POST",
  });
}

export function stopScenario() {
  return request<{ status: string }>(`/scenario/stop`, { method: "POST" });
}

export function getCurrentScenario() {
  return request<{ scenario: string | null }>(`/scenario`);
}

export function injectFault() {
  return request<{ status: string }>("/inject-fault", { method: "POST" });
}

export function clearFault() {
  return request<{ status: string }>("/clear-fault", { method: "POST" });
}
