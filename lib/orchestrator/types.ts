// JSON Wire Protocol Schema Types (Academic-Grade Prompt Synthesizer)

export interface OrchestrationState {
  userGoal: string;
  certainty: number;
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

// Prompt Dial Settings
export interface PromptDials {
  preset: 'laser' | 'scholar' | 'builder' | 'strategist' | 'socratic' | 'brainstorm' | 'pm' | 'analyst';
  depth: number;
  breadth: number;
  verbosity: number;
  creativity: number;
  risk_tolerance: number;
  evidence_strictness: number;
  browse_aggressiveness: number;
  clarifying_threshold: number;
  reasoning_exposure: 'none' | 'brief' | 'outline';
  self_consistency_n: number;
  token_budget: number;
  output_format: 'markdown' | 'json' | 'hybrid';
}

// Prompt Blueprint
export interface PromptBlueprint {
  purpose: string;
  instructions: string[];
  reference: string[];
  output: Record<string, any>;
}

// Main JSON Wire Response Schema
export interface OrchestrationResponse {
  ok: boolean;
  dials: PromptDials;
  state: OrchestrationState;
  prompt_blueprint: PromptBlueprint;
  synthesized_prompt?: string;
  events: OrchestrationEvent[];
  next_action: NextAction;
  final_answer?: string;
  public_rationale?: string;
  assumptions?: string[];
  limitations?: string[];
  confidence: number;
  refusal_reason?: string;
  clarification_needed?: string;
  schema_version: string;
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