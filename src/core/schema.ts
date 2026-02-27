// ============================================================
// Prompt Dial — Zod Schemas for runtime validation
// ============================================================

import { z } from "zod";

// ---- Dial ----

export const DialLevelSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

// ---- Templates ----

export const TemplateIdSchema = z.enum([
  "academic-report",
  "prd",
  "decision-memo",
  "critique",
  "research-brief",
]);

export const SectionSpecSchema = z.object({
  heading: z.string().min(1),
  minDial: DialLevelSchema,
  instruction: z.string().min(1),
  required: z.boolean(),
});

export const TemplateDefinitionSchema = z.object({
  id: TemplateIdSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  sections: z.array(SectionSpecSchema).min(1),
  systemInstruction: z.string().min(1),
});

// ---- Artifact ----

export const ArtifactBlockSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  content: z.string(),
  tags: z.array(z.string()),
  priority: z.number().int().min(0).max(100),
  doNotSend: z.boolean().default(false),
  tokenCount: z.number().int().min(0),
});

export const ArtifactSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  aliases: z.array(z.string()),
  description: z.string(),
  blocks: z.array(ArtifactBlockSchema),
  version: z.number().int().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  isSeed: z.boolean().default(false),
});

// ---- PromptSpec IR ----

export const InjectedBlockSchema = z.object({
  artifactId: z.string(),
  artifactName: z.string(),
  blockId: z.string(),
  blockLabel: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  priority: z.number(),
  tokenCount: z.number().int().min(0),
});

export const PromptSpecSectionSchema = z.object({
  heading: z.string().min(1),
  instruction: z.string(),
  injectedBlocks: z.array(InjectedBlockSchema),
});

export const ArtifactRefSchema = z.object({
  raw: z.string(),
  artifactId: z.string(),
  artifactName: z.string(),
  resolved: z.boolean(),
});

export const CompilationMetaSchema = z.object({
  totalTokens: z.number().int().min(0),
  compileDurationMs: z.number().min(0),
  compiledAt: z.string().datetime(),
  lintScore: z.number().min(0).max(100),
});

export const PromptSpecSchema = z.object({
  id: z.string().min(1),
  rawInput: z.string(),
  templateId: TemplateIdSchema,
  dial: DialLevelSchema,
  tokenBudget: z.number().int().min(0),
  systemInstruction: z.string(),
  sections: z.array(PromptSpecSectionSchema).min(1),
  constraints: z.array(z.string()),
  artifactRefs: z.array(ArtifactRefSchema),
  meta: CompilationMetaSchema,
});

// ---- Lint ----

export const LintSeveritySchema = z.enum(["error", "warning", "info"]);

export const LintResultSchema = z.object({
  ruleId: z.string(),
  ruleName: z.string(),
  severity: LintSeveritySchema,
  message: z.string(),
  fix: z.string().optional(),
});

export const LintReportSchema = z.object({
  score: z.number().min(0).max(100),
  results: z.array(LintResultSchema),
  passed: z.boolean(),
});

// ---- Injection Report ----

export const InjectionReportEntrySchema = z.object({
  artifactId: z.string(),
  artifactName: z.string(),
  blockId: z.string(),
  blockLabel: z.string(),
  included: z.boolean(),
  reason: z.string(),
  priority: z.number(),
  tokenCount: z.number().int().min(0),
});

export const InjectionReportSchema = z.object({
  entries: z.array(InjectionReportEntrySchema),
  totalTokensUsed: z.number().int().min(0),
  totalTokensBudget: z.number().int().min(0),
  blocksIncluded: z.number().int().min(0),
  blocksOmitted: z.number().int().min(0),
});

// ---- Compile I/O ----

export const CompileInputSchema = z.object({
  rawInput: z.string().min(1),
  dial: DialLevelSchema,
  tokenBudget: z.number().int().min(0),
  templateOverride: TemplateIdSchema.optional(),
  forceArtifacts: z.array(z.string()).optional(),
});

export const CompileOutputSchema = z.object({
  spec: PromptSpecSchema,
  rendered: z.string(),
  lint: LintReportSchema,
  injection: InjectionReportSchema,
});
