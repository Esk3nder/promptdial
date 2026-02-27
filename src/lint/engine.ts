import type { PromptSpec, LintResult } from "@/core/types";
import { rules } from "./rules";

export function runLint(spec: PromptSpec, rendered: string): LintResult[] {
  return rules
    .map((rule) => rule.check(spec, rendered))
    .filter((result): result is LintResult => result !== null);
}
