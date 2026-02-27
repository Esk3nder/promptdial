import { describe, it, expect } from "vitest";
import { runLint } from "@/lint/engine";
import type { PromptSpec } from "@/core/types";

// Helper to build a test spec
function makeSpec(overrides: Partial<PromptSpec> = {}): PromptSpec {
  return {
    id: "test-id",
    rawInput: "Write a detailed research report on artificial intelligence for technical leaders",
    templateId: "academic-report",
    dial: 3,
    tokenBudget: 0,
    systemInstruction: "Test instruction",
    sections: [
      { heading: "Introduction", instruction: "Introduce the topic.", injectedBlocks: [] },
      { heading: "Analysis", instruction: "Analyze in depth.", injectedBlocks: [] },
    ],
    constraints: ["Audience: technical leaders"],
    artifactRefs: [],
    meta: { totalTokens: 100, compileDurationMs: 50, compiledAt: new Date().toISOString(), lintScore: 100 },
    ...overrides,
  };
}

describe("Lint Engine", () => {
  describe("runLint function", () => {
    it("should return empty array for a perfect spec", () => {
      const spec = makeSpec();
      const results = runLint(spec, "");
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    });

    it("should return results for specs with violations", () => {
      const spec = makeSpec({
        rawInput: "Write report", // Only 2 words - vague-input violation
      });
      const results = runLint(spec, "");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.ruleId === "vague-input")).toBe(true);
    });

    it("should return multiple results when multiple rules are violated", () => {
      const spec = makeSpec({
        rawInput: "Write report", // vague-input
        constraints: [], // missing-constraints
      });
      const results = runLint(spec, "");
      expect(results.length).toBeGreaterThanOrEqual(2);
      const ruleIds = results.map((r) => r.ruleId);
      expect(ruleIds).toContain("vague-input");
      expect(ruleIds).toContain("missing-constraints");
    });

    it("should not include null results in the array", () => {
      const spec = makeSpec({
        rawInput: "Write report",
      });
      const results = runLint(spec, "");
      const hasNulls = results.some((r) => r === null);
      expect(hasNulls).toBe(false);
    });

    it("should filter out passing rules correctly", () => {
      const spec = makeSpec({
        rawInput: "Write report", // vague-input: will fail
      });
      const results = runLint(spec, "");
      // Should only have failing rules, not passing ones
      expect(results.every((r) => r !== null)).toBe(true);
    });

    it("should return results with all required properties", () => {
      const spec = makeSpec({
        rawInput: "Write report",
      });
      const results = runLint(spec, "");
      expect(results.length).toBeGreaterThan(0);

      for (const result of results) {
        expect(result.ruleId).toBeDefined();
        expect(typeof result.ruleId).toBe("string");
        expect(result.ruleName).toBeDefined();
        expect(typeof result.ruleName).toBe("string");
        expect(result.severity).toBeDefined();
        expect(["error", "warning", "info"]).toContain(result.severity);
        expect(result.message).toBeDefined();
        expect(typeof result.message).toBe("string");
      }
    });

    it("should handle budget-exceeded rule with rendered parameter", () => {
      const longRendered = "word ".repeat(300);
      const spec = makeSpec({
        tokenBudget: 100,
      });
      const results = runLint(spec, longRendered);
      const budgetViolation = results.find((r) => r.ruleId === "budget-exceeded");
      expect(budgetViolation).toBeDefined();
      expect(budgetViolation?.severity).toBe("error");
    });

    it("should handle do-not-send-leak rule with injected blocks", () => {
      const spec = makeSpec({
        sections: [
          {
            heading: "Data",
            instruction: "Data",
            injectedBlocks: [
              {
                artifactId: "artifact1",
                artifactName: "Secret",
                blockId: "block1",
                blockLabel: "Data",
                content: "secret",
                tags: ["do-not-send"],
                priority: 50,
                tokenCount: 100,
              },
            ],
          },
        ],
      });
      const results = runLint(spec, "");
      const doNotSendViolation = results.find((r) => r.ruleId === "do-not-send-leak");
      expect(doNotSendViolation).toBeDefined();
      expect(doNotSendViolation?.severity).toBe("error");
    });

    it("should return all rules as LintResult objects (not null)", () => {
      const spec = makeSpec({
        rawInput: "Short", // Trigger multiple violations
        constraints: [],
        sections: [{ heading: "Empty", instruction: "", injectedBlocks: [] }],
      });
      const results = runLint(spec, "");
      expect(results).toEqual(expect.any(Array));
      expect(results.every((r) => r !== null && typeof r === "object")).toBe(true);
    });

    it("should preserve rule message and fix information", () => {
      const spec = makeSpec({
        rawInput: "Short",
      });
      const results = runLint(spec, "");
      const vagueResult = results.find((r) => r.ruleId === "vague-input");
      expect(vagueResult?.message).toBeTruthy();
      expect(vagueResult?.fix).toBeTruthy();
    });

    it("should handle empty constraints with no other violations", () => {
      const spec = makeSpec({
        constraints: [],
      });
      const results = runLint(spec, "");
      expect(results.length).toBeGreaterThan(0);
      const missingConstraints = results.find((r) => r.ruleId === "missing-constraints");
      expect(missingConstraints).toBeDefined();
    });

    it("should detect weak template match", () => {
      const spec = makeSpec({
        rawInput: "Write a funny story about cats",
        templateId: "academic-report",
      });
      const results = runLint(spec, "");
      const noTemplateMatch = results.find((r) => r.ruleId === "no-template-match");
      expect(noTemplateMatch).toBeDefined();
    });

    it("should not report violations for a well-formed spec", () => {
      const wellFormedSpec = makeSpec({
        rawInput: "Write a comprehensive research report analyzing current AI methodologies and findings for technical leaders",
        templateId: "academic-report",
        constraints: ["Audience: technical leaders", "Length: 2000 words", "Tone: formal"],
        sections: [
          {
            heading: "Introduction",
            instruction: "Introduce AI and its significance",
            injectedBlocks: [],
          },
          {
            heading: "Methodology",
            instruction: "Describe the research methodology",
            injectedBlocks: [],
          },
          {
            heading: "Findings",
            instruction: "Present research findings",
            injectedBlocks: [],
          },
        ],
      });
      const results = runLint(wellFormedSpec, "This is a valid prompt");
      expect(results).toHaveLength(0);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle multiple violations with different severities", () => {
      const spec = makeSpec({
        rawInput: "Bad", // vague-input (warning)
        constraints: [], // missing-constraints (warning)
        tokenBudget: 50,
      });
      const results = runLint(spec, "word ".repeat(100));
      const hasWarning = results.some((r) => r.severity === "warning");
      const hasError = results.some((r) => r.severity === "error");
      expect(hasWarning || hasError).toBe(true);
    });

    it("should report errors for sensitive data leaks", () => {
      const spec = makeSpec({
        sections: [
          {
            heading: "Confidential",
            instruction: "Confidential info",
            injectedBlocks: [
              {
                artifactId: "internal",
                artifactName: "Internal",
                blockId: "secrets",
                blockLabel: "Secrets",
                content: "secret data",
                tags: ["do-not-send", "confidential"],
                priority: 100,
                tokenCount: 50,
              },
            ],
          },
        ],
      });
      const results = runLint(spec, "");
      const leakError = results.find((r) => r.ruleId === "do-not-send-leak");
      expect(leakError).toBeDefined();
      expect(leakError?.severity).toBe("error");
    });

    it("should maintain result order consistency", () => {
      const spec = makeSpec({
        rawInput: "Bad",
      });
      const results1 = runLint(spec, "");
      const results2 = runLint(spec, "");
      expect(results1.map((r) => r.ruleId)).toEqual(results2.map((r) => r.ruleId));
    });
  });
});
