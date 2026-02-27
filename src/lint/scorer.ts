import type { LintResult, LintReport } from "@/core/types";

export function calculateScore(results: LintResult[]): LintReport {
  let score = 100;
  for (const r of results) {
    switch (r.severity) {
      case "error":
        score -= 25;
        break;
      case "warning":
        score -= 10;
        break;
      case "info":
        score -= 3;
        break;
    }
  }
  score = Math.max(0, score);
  return {
    score,
    results,
    passed: score >= 70,
  };
}
