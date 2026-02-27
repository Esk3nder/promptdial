// ============================================================
// Prompt Dial — Shared TypeScript Types
// ============================================================

/** Dial level: 0 (minimal) to 5 (maximum depth) */
export type DialLevel = 0 | 1 | 2 | 3 | 4 | 5;

/** Template identifiers */
export type TemplateId =
  | "academic-report"
  | "prd"
  | "decision-memo"
  | "critique"
  | "research-brief";

/** Section depth at each dial level */
export interface SectionSpec {
  /** Section heading */
  heading: string;
  /** Minimum dial level to include this section */
  minDial: DialLevel;
  /** Prompt instructions for this section */
  instruction: string;
  /** Whether this section is required (always included at its min dial) */
  required: boolean;
}

/** Template definition */
export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  description: string;
  sections: SectionSpec[];
  /** Base system instruction for this template */
  systemInstruction: string;
}

// ---- PromptSpec IR ----

export interface PromptSpecSection {
  heading: string;
  instruction: string;
  injectedBlocks: InjectedBlock[];
}

export interface InjectedBlock {
  artifactId: string;
  artifactName: string;
  blockId: string;
  blockLabel: string;
  content: string;
  tags: string[];
  priority: number;
  tokenCount: number;
}

export interface PromptSpec {
  /** Unique compilation ID */
  id: string;
  /** Original user input */
  rawInput: string;
  /** Detected template */
  templateId: TemplateId;
  /** Dial level used */
  dial: DialLevel;
  /** Token budget (0 = unlimited) */
  tokenBudget: number;
  /** System-level instruction */
  systemInstruction: string;
  /** Ordered sections */
  sections: PromptSpecSection[];
  /** Constraints extracted from input */
  constraints: string[];
  /** Resolved artifact references */
  artifactRefs: ArtifactRef[];
  /** Compilation metadata */
  meta: CompilationMeta;
}

export interface ArtifactRef {
  /** Raw @reference from input */
  raw: string;
  /** Resolved artifact ID */
  artifactId: string;
  /** Resolved artifact name */
  artifactName: string;
  /** Whether resolution succeeded */
  resolved: boolean;
}

export interface CompilationMeta {
  /** Total tokens in rendered prompt */
  totalTokens: number;
  /** Compilation duration in ms */
  compileDurationMs: number;
  /** Timestamp */
  compiledAt: string;
  /** Lint score (0-100) */
  lintScore: number;
}

// ---- Artifact System ----

export interface ArtifactBlock {
  id: string;
  label: string;
  content: string;
  tags: string[];
  priority: number;
  /** If true, never include in output unless explicitly overridden */
  doNotSend: boolean;
  /** Estimated token count */
  tokenCount: number;
}

export interface Artifact {
  id: string;
  name: string;
  /** Lowercase aliases for @-reference resolution */
  aliases: string[];
  description: string;
  blocks: ArtifactBlock[];
  version: number;
  createdAt: string;
  updatedAt: string;
  /** Whether this is a built-in seed artifact */
  isSeed: boolean;
}

// ---- Lint System ----

export type LintSeverity = "error" | "warning" | "info";

export interface LintResult {
  ruleId: string;
  ruleName: string;
  severity: LintSeverity;
  message: string;
  /** Suggested fix (if applicable) */
  fix?: string;
}

export interface LintReport {
  score: number;
  results: LintResult[];
  passed: boolean;
}

// ---- Injection Report ----

export interface InjectionReportEntry {
  artifactId: string;
  artifactName: string;
  blockId: string;
  blockLabel: string;
  included: boolean;
  reason: string;
  priority: number;
  tokenCount: number;
}

export interface InjectionReport {
  entries: InjectionReportEntry[];
  totalTokensUsed: number;
  totalTokensBudget: number;
  blocksIncluded: number;
  blocksOmitted: number;
}

// ---- Compilation Pipeline ----

export interface CompileInput {
  rawInput: string;
  dial: DialLevel;
  tokenBudget: number;
  /** Override template (otherwise auto-detected) */
  templateOverride?: TemplateId;
  /** Additional artifact refs to force-include */
  forceArtifacts?: string[];
}

export interface CompileOutput {
  spec: PromptSpec;
  rendered: string;
  lint: LintReport;
  injection: InjectionReport;
}
