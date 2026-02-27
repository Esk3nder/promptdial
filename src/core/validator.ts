// ============================================================
// Prompt Dial — Schema Validator + Auto-Repair
// ============================================================

import { ZodError, type ZodSchema } from "zod";
import { PromptSpecSchema } from "./schema";
import type { PromptSpec, DialLevel } from "./types";

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors?: string[];
  repaired: boolean;
}

/** Validate data against a Zod schema */
export function validate<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
  try {
    const parsed = schema.parse(data);
    return { valid: true, data: parsed, repaired: false };
  } catch (err) {
    if (err instanceof ZodError) {
      return {
        valid: false,
        errors: err.issues.map((e) => `${e.path.join(".")}: ${e.message}`),
        repaired: false,
      };
    }
    throw err;
  }
}

/** Validate a PromptSpec with auto-repair for common issues */
export function validateAndRepairSpec(data: unknown): ValidationResult<PromptSpec> {
  // First try direct validation
  const direct = validate(PromptSpecSchema, data);
  if (direct.valid) return direct;

  // Attempt auto-repair on a copy
  const repaired = structuredClone(data) as Record<string, unknown>;
  let didRepair = false;

  // Repair: missing id
  if (!repaired.id) {
    repaired.id = crypto.randomUUID();
    didRepair = true;
  }

  // Repair: missing or invalid dial → default to 3
  if (typeof repaired.dial !== "number" || repaired.dial < 0 || repaired.dial > 5) {
    repaired.dial = 3 as DialLevel;
    didRepair = true;
  }

  // Repair: missing tokenBudget → unlimited
  if (typeof repaired.tokenBudget !== "number") {
    repaired.tokenBudget = 0;
    didRepair = true;
  }

  // Repair: missing constraints
  if (!Array.isArray(repaired.constraints)) {
    repaired.constraints = [];
    didRepair = true;
  }

  // Repair: missing artifactRefs
  if (!Array.isArray(repaired.artifactRefs)) {
    repaired.artifactRefs = [];
    didRepair = true;
  }

  // Repair: missing meta
  if (!repaired.meta || typeof repaired.meta !== "object") {
    repaired.meta = {
      totalTokens: 0,
      compileDurationMs: 0,
      compiledAt: new Date().toISOString(),
      lintScore: 0,
    };
    didRepair = true;
  }

  // Repair: sections with missing injectedBlocks
  if (Array.isArray(repaired.sections)) {
    for (const section of repaired.sections as Record<string, unknown>[]) {
      if (!Array.isArray(section.injectedBlocks)) {
        section.injectedBlocks = [];
        didRepair = true;
      }
    }
  }

  // Try again after repairs
  const afterRepair = validate(PromptSpecSchema, repaired);
  if (afterRepair.valid) {
    return { ...afterRepair, repaired: didRepair };
  }

  // Repair failed — return original errors + repair note
  return {
    valid: false,
    errors: [
      ...(afterRepair.errors || []),
      didRepair ? "Auto-repair was attempted but validation still failed." : "",
    ].filter(Boolean),
    repaired: didRepair,
  };
}
