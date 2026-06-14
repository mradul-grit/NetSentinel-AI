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

export type CopilotAnalysis = {
  root_cause: string;
  impact: string;
  recommendation: string;
  confidence: number;
};

export type AgentTrend = "Improving" | "Stable" | "Worsening";

export type DetectionAgentOutput = {
  anomaly_type: string;
  confidence: number;
  affected_metrics: string[];
  trend: AgentTrend;
  why: string;
};

export type RootCauseAgentOutput = {
  primary_cause: string;
  alternative_causes: string[];
  confidence: number;
};

export type ImpactAgentOutput = {
  business_impact: string;
  estimated_users_affected: number;
  estimated_revenue_risk: number;
};

export type PredictionPoint = {
  label: string;
  risk: number;
};

export type PredictionAgentOutput = {
  current_failure_risk: number;
  risk_15_min: number;
  risk_30_min: number;
  risk_60_min: number;
  trend: AgentTrend;
  series: PredictionPoint[];
};

export type RemediationAgentOutput = {
  action_plan: string[];
  recommended_decision: string;
};

export type ExecutiveSummary = {
  business_risk: string;
  downtime_prevented: string;
  cost_saved: number;
  affected_customers: number;
  recommended_decision: string;
};

export type AgentFeedEvent = {
  timestamp: string;
  agent: string;
  message: string;
  severity: RiskLevel | "Info";
};

export type AgentOrchestration = {
  generated_at: string;
  flow: string[];
  detection: DetectionAgentOutput;
  root_cause: RootCauseAgentOutput;
  impact: ImpactAgentOutput;
  prediction: PredictionAgentOutput;
  remediation: RemediationAgentOutput;
  executive: ExecutiveSummary;
  incident_feed: AgentFeedEvent[];
};

export type AgentCommand =
  | "reroute_traffic"
  | "restart_router"
  | "increase_capacity"
  | "failover_link";

export type AgentCommandResponse = {
  status: string;
  command?: AgentCommand;
  command_label?: string;
  effect_seconds?: number;
  telemetry?: Telemetry;
  message?: string;
  allowed_commands?: AgentCommand[];
};
