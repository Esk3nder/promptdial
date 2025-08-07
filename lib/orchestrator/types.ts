// JSON Wire Protocol Schema v3 Types

export interface OrchestrationState {
  userGoal: string;
  plan: PlanStep[];
  cursor: number;
  completedSteps: CompletedStep[];
  context: Record<string, any>;
  clarifications?: Clarification[];
}

export interface PlanStep {
  id: string;
  description: string;
  toolCall?: ToolCall;
  dependencies?: string[]; // IDs of steps that must complete first
}

export interface CompletedStep {
  stepId: string;
  result: any;
  toolResponse?: ToolResponse;
  timestamp: string;
}

export interface ToolCall {
  tool: 'fetch_web';
  parameters: {
    url: string;
  };
}

export interface ToolResponse {
  ok: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

export interface Clarification {
  question: string;
  answer?: string;
  timestamp: string;
}

export interface OrchestrationEvent {
  type: EventType;
  data: any;
  timestamp: string;
  sequence: number;
}

export type EventType =
  | 'plan_created'
  | 'step_started'
  | 'step_completed'
  | 'tool_called'
  | 'tool_response'
  | 'verification_started'
  | 'verification_passed'
  | 'verification_failed'
  | 'policy_violation'
  | 'error'
  | 'warning';

export type NextAction = 'execute' | 'done' | 'safe_refuse' | 'clarify';

// Main JSON Wire Response Schema
export interface OrchestrationResponse {
  ok: boolean;
  state: OrchestrationState;
  events: OrchestrationEvent[];
  next_action: NextAction;
  final_answer?: string;
  refusal_reason?: string;
  clarification_needed?: string;
  schema_version: 'v3';
}

// LLM Call Types
export interface PlannerInput {
  user_goal: string;
  state: Partial<OrchestrationState>;
  context?: Record<string, any>;
}

export interface ExecutorInput {
  state: OrchestrationState;
  current_step: PlanStep;
  tool_available: 'fetch_web';
}

export interface VerifierInput {
  user_goal: string;
  state: OrchestrationState;
  final_output: any;
}

// Policy Matrix
export interface PolicyMatrix {
  privacy: PolicyRule[];
  self_harm: PolicyRule[];
  illicit: PolicyRule[];
  pii: PolicyRule[];
}

export interface PolicyRule {
  pattern: string | RegExp;
  action: 'block' | 'warn' | 'allow';
  message?: string;
}

// Orchestrator Configuration
export interface OrchestratorConfig {
  maxTokensPerResponse: number; // 1800 from PRD
  maxLLMCalls: number; // Target ≤3 from PRD
  maxClarifications: number; // 3 from PRD
  httpTimeout: number; // 5000ms from PRD
  retryOnError: boolean;
  domainAllowList: string[];
}

// Metrics for monitoring
export interface OrchestrationMetrics {
  taskCompletionRate: number; // Target ≥92%
  avgTotalTokens: number; // Target ≤2500
  medianClarificationLoops: number; // Target ≤3
  policyViolationEscapeRate: number; // Target 0%
  userSatisfactionScore: number; // Target ≥4.3/5
}