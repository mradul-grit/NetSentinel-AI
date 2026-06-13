export type Telemetry = {
  latency: number;
  packet_loss: number;
  cpu: number;
  bandwidth: number;
};

export type TelemetryPoint = Telemetry & {
  timestamp: number;
  time: string;
  healthScore: number;
  failureProbability: number;
};

export type RiskLevel = "Healthy" | "Warning" | "Critical";

export type CopilotAssessment = {
  riskLevel: RiskLevel;
  rootCause: string;
  businessImpact: string;
  recommendedAction: string;
};
