// Types for the Dial (prompt optimization) system

export interface DialSettings {
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

export interface PlanStep {
  id: string;
  description: string;
  toolCall?: {
    tool: 'fetch_web';
    parameters: { url: string };
  };
  dependencies?: string[];
}

export interface CompletedStep {
  stepId: string;
  result: any;
  toolResponse?: object;
  timestamp: string;
}

export interface Clarification {
  question: string;
  answer?: string;
  timestamp: string;
}

export interface OrchestrationState {
  userGoal: string;
  certainty: number;
  plan: PlanStep[];
  cursor: number;
  completedSteps: CompletedStep[];
  context: object;
  clarifications?: Clarification[];
}

export interface PromptBlueprint {
  purpose: string;
  instructions: string[];
  reference: string[];
  output: object;
}

export interface OrchestrationEvent {
  type: string;
  data: any;
  timestamp: string;
  sequence: number;
}

export interface OrchestrationResponse {
  ok: boolean;
  dials: DialSettings;
  state: OrchestrationState;
  prompt_blueprint: PromptBlueprint;
  synthesized_prompt: string;
  events: OrchestrationEvent[];
  next_action: 'execute' | 'done' | 'clarify';
  final_answer?: string;
  public_rationale?: string;
  assumptions?: string[];
  limitations?: string[];
  confidence: number;
  clarification_needed?: string;
  schema_version: string;
}

// Response type used by the UI
export interface DialResponse {
  ok: boolean;
  next_action?: 'execute' | 'done' | 'clarify';
  confidence?: number;
  final_answer?: string;
  synthesized_prompt?: string;
  error?: string;
  metadata?: {
    tokensUsed?: number;
    model?: string;
    stage?: string;
  };
}

// ============================================
// UI Dial Settings Types
// ============================================

// Preset types for UI (includes 'default' and 'custom')
export type DialPreset =
  | 'default'
  | 'custom'
  | 'laser'
  | 'scholar'
  | 'builder'
  | 'strategist'
  | 'socratic'
  | 'brainstorm'
  | 'pm'
  | 'analyst';

// Core dial values exposed in the UI
export interface DialValues {
  depth: number;        // 0-5: How deeply to analyze
  breadth: number;      // 0-5: How many alternatives
  verbosity: number;    // 0-5: Response detail level
  creativity: number;   // 0-5: Novel ideas tolerance
  riskTolerance: number; // 0-5: Bold suggestions
  outputFormat: 'markdown' | 'json' | 'hybrid';
}

// Complete UI state for dial settings
export interface DialUIState {
  preset: DialPreset;
  values: DialValues;
}
