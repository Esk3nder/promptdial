import { describe, it, expect } from "vitest";
import { calculateScore } from "@/lint/scorer";
import type { LintResult } from "@/core/types";

// Helper to create lint results
function makeError(ruleId: string = "error-rule"): LintResult {
  return {
    ruleId,
    ruleName: "Error Rule",
    severity: "error",
    message: "An error occurred",
  };
}

function makeWarning(ruleId: string = "warning-rule"): LintResult {
  return {
    ruleId,
    ruleName: "Warning Rule",
    severity: "warning",
    message: "A warning",
  };
}

function makeInfo(ruleId: string = "info-rule"): LintResult {
  return {
    ruleId,
    ruleName: "Info Rule",
    severity: "info",
    message: "Info message",
  };
}

describe("Lint Scorer", () => {
  describe("calculateScore function", () => {
    it("should return score=100 and passed=true for 0 results", () => {
      const report = calculateScore([]);
      expect(report.score).toBe(100);
      expect(report.passed).toBe(true);
      expect(report.results).toEqual([]);
    });

    it("should deduct 25 points for each error", () => {
      const results = [makeError("error1")];
      const report = calculateScore(results);
      expect(report.score).toBe(75);
      expect(report.passed).toBe(true);
    });

    it("should deduct 10 points for each warning", () => {
      const results = [makeWarning("warning1")];
      const report = calculateScore(results);
      expect(report.score).toBe(90);
      expect(report.passed).toBe(true);
    });

    it("should deduct 3 points for each info", () => {
      const results = [makeInfo("info1")];
      const report = calculateScore(results);
      expect(report.score).toBe(97);
      expect(report.passed).toBe(true);
    });

    it("should handle 3 errors = 25*3 = 75, score=25", () => {
      const results = [makeError("error1"), makeError("error2"), makeError("error3")];
      const report = calculateScore(results);
      expect(report.score).toBe(25);
      expect(report.passed).toBe(false);
    });

    it("should handle 1 error + 1 warning = -25-10 = 65", () => {
      const results = [makeError("error1"), makeWarning("warning1")];
      const report = calculateScore(results);
      expect(report.score).toBe(65);
      expect(report.passed).toBe(false);
    });

    it("should floor score at 0 (no negative scores)", () => {
      const results = [
        makeError("error1"),
        makeError("error2"),
        makeError("error3"),
        makeError("error4"),
        makeError("error5"),
      ];
      const report = calculateScore(results);
      expect(report.score).toBe(0);
      expect(report.passed).toBe(false);
    });

    it("should pass with score exactly at 70", () => {
      const results = [makeError("error1"), makeWarning("warning1")]; // 100-25-10=65, still fails
      // Need 70: 100-30=70, so 3 warnings
      const results70 = [
        makeWarning("warning1"),
        makeWarning("warning2"),
        makeWarning("warning3"),
      ];
      const report = calculateScore(results70);
      expect(report.score).toBe(70);
      expect(report.passed).toBe(true);
    });

    it("should fail with score below 70", () => {
      const results = [
        makeWarning("warning1"),
        makeWarning("warning2"),
        makeWarning("warning3"),
        makeWarning("warning4"),
      ];
      const report = calculateScore(results);
      expect(report.score).toBe(60);
      expect(report.passed).toBe(false);
    });

    it("should include all results in the report", () => {
      const results = [
        makeError("error1"),
        makeWarning("warning1"),
        makeInfo("info1"),
      ];
      const report = calculateScore(results);
      expect(report.results).toEqual(results);
      expect(report.results).toHaveLength(3);
    });

    it("should handle large number of violations", () => {
      const results = Array(10)
        .fill(null)
        .map((_, i) => makeError(`error${i}`));
      const report = calculateScore(results);
      expect(report.score).toBe(0); // 100 - (10 * 25) = -150, floored to 0
      expect(report.passed).toBe(false);
    });

    it("should handle mixed severity with complex calculation", () => {
      // 2 errors (50) + 3 warnings (30) + 2 info (6) = 86 deducted
      // 100 - 86 = 14
      const results = [
        makeError("error1"),
        makeError("error2"),
        makeWarning("warning1"),
        makeWarning("warning2"),
        makeWarning("warning3"),
        makeInfo("info1"),
        makeInfo("info2"),
      ];
      const report = calculateScore(results);
      expect(report.score).toBe(14);
      expect(report.passed).toBe(false);
    });

    it("should preserve result order in report", () => {
      const results = [
        makeWarning("warning1"),
        makeError("error1"),
        makeInfo("info1"),
      ];
      const report = calculateScore(results);
      expect(report.results[0].ruleId).toBe("warning1");
      expect(report.results[1].ruleId).toBe("error1");
      expect(report.results[2].ruleId).toBe("info1");
    });

    it("should have correct passed threshold at boundary", () => {
      // Score of 71 should pass: 100 - (20 + 9) = 100 - 29 = 71
      const results71 = [
        makeWarning("warning1"),
        makeWarning("warning2"),
        makeInfo("info1"),
        makeInfo("info2"),
        makeInfo("info3"),
      ];
      const report71 = calculateScore(results71);
      expect(report71.score).toBe(71);
      expect(report71.passed).toBe(true);

      // Score of 69 should fail: 100 - (20 + 12) = 100 - 32 = 68
      const results69 = [
        makeWarning("warning1"),
        makeWarning("warning2"),
        makeInfo("info1"),
        makeInfo("info2"),
        makeInfo("info3"),
        makeInfo("info4"),
      ];
      const report69 = calculateScore(results69);
      expect(report69.score).toBe(68);
      expect(report69.passed).toBe(false);
    });
  });

  describe("Scoring formula validation", () => {
    it("should correctly apply scoring formula: 100 - (errors*25 + warnings*10 + info*3)", () => {
      const errors = 2;
      const warnings = 1;
      const info = 3;
      const results = [
        ...Array(errors).fill(null).map((_, i) => makeError(`error${i}`)),
        ...Array(warnings).fill(null).map((_, i) => makeWarning(`warning${i}`)),
        ...Array(info).fill(null).map((_, i) => makeInfo(`info${i}`)),
      ];
      const report = calculateScore(results);
      const expected = 100 - errors * 25 - warnings * 10 - info * 3;
      expect(report.score).toBe(expected);
    });

    it("should handle zero deductions correctly", () => {
      const report = calculateScore([]);
      expect(report.score).toBe(100);
      expect(report.passed).toBe(true);
    });

    it("should handle maximum reasonable violations", () => {
      const results = Array(20)
        .fill(null)
        .map((_, i) => makeError(`error${i}`));
      const report = calculateScore(results);
      expect(report.score).toBe(0);
      expect(report.passed).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle single violation of each type", () => {
      const errorReport = calculateScore([makeError()]);
      expect(errorReport.score).toBe(75);

      const warningReport = calculateScore([makeWarning()]);
      expect(warningReport.score).toBe(90);

      const infoReport = calculateScore([makeInfo()]);
      expect(infoReport.score).toBe(97);
    });

    it("should not modify input results array", () => {
      const results = [makeError("error1"), makeWarning("warning1")];
      const resultsCopy = JSON.stringify(results);
      calculateScore(results);
      expect(JSON.stringify(results)).toBe(resultsCopy);
    });

    it("should return new report object on each call", () => {
      const results = [makeError()];
      const report1 = calculateScore(results);
      const report2 = calculateScore(results);
      expect(report1).not.toBe(report2);
      expect(report1.score).toBe(report2.score);
    });

    it("should include all required properties in report", () => {
      const report = calculateScore([makeError()]);
      expect(report).toHaveProperty("score");
      expect(report).toHaveProperty("results");
      expect(report).toHaveProperty("passed");
      expect(typeof report.score).toBe("number");
      expect(Array.isArray(report.results)).toBe(true);
      expect(typeof report.passed).toBe("boolean");
    });

    it("should be consistent across multiple calls with same input", () => {
      const results = [
        makeError("error1"),
        makeWarning("warning1"),
        makeInfo("info1"),
      ];
      const report1 = calculateScore(results);
      const report2 = calculateScore(results);
      expect(report1.score).toBe(report2.score);
      expect(report1.passed).toBe(report2.passed);
    });
  });

  describe("Realistic scenarios", () => {
    it("should handle typical good quality spec (minor issues)", () => {
      const results = [makeWarning("vague-input")];
      const report = calculateScore(results);
      expect(report.score).toBe(90);
      expect(report.passed).toBe(true);
    });

    it("should handle typical poor quality spec (multiple issues)", () => {
      const results = [
        makeWarning("vague-input"),
        makeWarning("missing-constraints"),
        makeError("budget-exceeded"),
        makeWarning("no-template-match"),
      ];
      const report = calculateScore(results);
      // 1 error (-25) + 3 warnings (-30) = -55 deducted
      // 100 - 55 = 45
      expect(report.score).toBe(45);
      expect(report.passed).toBe(false);
    });

    it("should handle critical issues (data leaks)", () => {
      const results = [
        makeError("do-not-send-leak"),
        makeError("budget-exceeded"),
      ];
      const report = calculateScore(results);
      expect(report.score).toBe(50);
      expect(report.passed).toBe(false);
    });

    it("should handle info-only issues", () => {
      const results = [
        makeInfo("info1"),
        makeInfo("info2"),
        makeInfo("info3"),
        makeInfo("info4"),
      ];
      const report = calculateScore(results);
      expect(report.score).toBe(88);
      expect(report.passed).toBe(true);
    });
  });
});
