import { describe, it, expect } from "vitest";
import { rules } from "@/lint/rules";
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

describe("Lint Rules", () => {
  const vagueInputRule = rules.find((r) => r.id === "vague-input")!;
  const missingConstraintsRule = rules.find((r) => r.id === "missing-constraints")!;
  const noTemplateMatchRule = rules.find((r) => r.id === "no-template-match")!;
  const budgetExceededRule = rules.find((r) => r.id === "budget-exceeded")!;
  const emptySectionsRule = rules.find((r) => r.id === "empty-sections")!;
  const doNotSendLeakRule = rules.find((r) => r.id === "do-not-send-leak")!;

  describe("vague-input rule", () => {
    it("should return warning when rawInput has < 10 words", () => {
      const spec = makeSpec({ rawInput: "Write a research report" }); // 4 words
      const result = vagueInputRule.check(spec, "");
      expect(result).not.toBeNull();
      expect(result?.severity).toBe("warning");
      expect(result?.ruleId).toBe("vague-input");
      expect(result?.message).toContain("4 words");
    });

    it("should return null when rawInput has >= 10 words", () => {
      const spec = makeSpec({
        rawInput: "Write a detailed research report on artificial intelligence for technical leaders and business strategists",
      }); // 15 words
      const result = vagueInputRule.check(spec, "");
      expect(result).toBeNull();
    });

    it("should handle exactly 10 words as passing", () => {
      const spec = makeSpec({
        rawInput: "Write a detailed research report on artificial intelligence for technical leaders",
      }); // 14 words
      const result = vagueInputRule.check(spec, "");
      expect(result).toBeNull();
    });

    it("should handle 9 words as failing", () => {
      const spec = makeSpec({ rawInput: "Write a detailed research report on artificial intelligence" }); // 9 words
      const result = vagueInputRule.check(spec, "");
      expect(result).not.toBeNull();
      expect(result?.severity).toBe("warning");
    });

    it("should include fix suggestion in result", () => {
      const spec = makeSpec({ rawInput: "Write report" }); // 2 words
      const result = vagueInputRule.check(spec, "");
      expect(result?.fix).toBeDefined();
      expect(result?.fix).toContain("Add more detail");
    });
  });

  describe("missing-constraints rule", () => {
    it("should return warning when constraints array is empty", () => {
      const spec = makeSpec({ constraints: [] });
      const result = missingConstraintsRule.check(spec, "");
      expect(result).not.toBeNull();
      expect(result?.severity).toBe("warning");
      expect(result?.ruleId).toBe("missing-constraints");
    });

    it("should return null when constraints are present", () => {
      const spec = makeSpec({ constraints: ["Audience: technical leaders"] });
      const result = missingConstraintsRule.check(spec, "");
      expect(result).toBeNull();
    });

    it("should return null when multiple constraints are present", () => {
      const spec = makeSpec({
        constraints: ["Audience: technical leaders", "Length: 2000 words", "Tone: formal"],
      });
      const result = missingConstraintsRule.check(spec, "");
      expect(result).toBeNull();
    });

    it("should include fix suggestion in result", () => {
      const spec = makeSpec({ constraints: [] });
      const result = missingConstraintsRule.check(spec, "");
      expect(result?.fix).toBeDefined();
      expect(result?.fix).toContain("Specify constraints");
    });
  });

  describe("no-template-match rule", () => {
    it("should return warning when input has no template keywords", () => {
      const spec = makeSpec({
        rawInput: "Write a funny joke about cats",
        templateId: "academic-report",
      });
      const result = noTemplateMatchRule.check(spec, "");
      expect(result).not.toBeNull();
      expect(result?.severity).toBe("warning");
      expect(result?.ruleId).toBe("no-template-match");
    });

    it("should return null when input contains template keywords", () => {
      const spec = makeSpec({
        rawInput: "Write a research report on artificial intelligence methodology and findings",
        templateId: "academic-report",
      });
      const result = noTemplateMatchRule.check(spec, "");
      expect(result).toBeNull();
    });

    it("should match PRD template with product keywords", () => {
      const spec = makeSpec({
        rawInput: "Write a product requirements document with feature specifications",
        templateId: "prd",
      });
      const result = noTemplateMatchRule.check(spec, "");
      expect(result).toBeNull();
    });

    it("should match decision-memo template with decision keywords", () => {
      const spec = makeSpec({
        rawInput: "Create a decision memo comparing options and tradeoffs",
        templateId: "decision-memo",
      });
      const result = noTemplateMatchRule.check(spec, "");
      expect(result).toBeNull();
    });

    it("should match research-brief template with brief keywords", () => {
      const spec = makeSpec({
        rawInput: "Write a brief overview of market trends and competitive landscape",
        templateId: "research-brief",
      });
      const result = noTemplateMatchRule.check(spec, "");
      expect(result).toBeNull();
    });

    it("should include template name in fix suggestion", () => {
      const spec = makeSpec({
        rawInput: "Write something random",
        templateId: "academic-report",
      });
      const result = noTemplateMatchRule.check(spec, "");
      expect(result?.fix).toBeDefined();
      expect(result?.fix).toContain("academic-report");
    });
  });

  describe("budget-exceeded rule", () => {
    it("should return error when rendered tokens exceed budget", () => {
      const longText = "word ".repeat(200); // ~200 words
      const spec = makeSpec({ tokenBudget: 100 });
      const result = budgetExceededRule.check(spec, longText);
      expect(result).not.toBeNull();
      expect(result?.severity).toBe("error");
      expect(result?.ruleId).toBe("budget-exceeded");
    });

    it("should return null when tokenBudget is 0 (unlimited)", () => {
      const longText = "word ".repeat(500); // ~500 words
      const spec = makeSpec({ tokenBudget: 0 });
      const result = budgetExceededRule.check(spec, longText);
      expect(result).toBeNull();
    });

    it("should return null when rendered is within budget", () => {
      const shortText = "word ".repeat(50); // ~50 words
      const spec = makeSpec({ tokenBudget: 1000 });
      const result = budgetExceededRule.check(spec, shortText);
      expect(result).toBeNull();
    });

    it("should include token count in error message", () => {
      const longText = "word ".repeat(200);
      const spec = makeSpec({ tokenBudget: 100 });
      const result = budgetExceededRule.check(spec, longText);
      expect(result?.message).toContain("tokens");
      expect(result?.message).toContain("100");
    });

    it("should include fix suggestion in result", () => {
      const longText = "word ".repeat(300);
      const spec = makeSpec({ tokenBudget: 100 });
      const result = budgetExceededRule.check(spec, longText);
      expect(result?.fix).toBeDefined();
    });
  });

  describe("empty-sections rule", () => {
    it("should return warning for empty sections", () => {
      const spec = makeSpec({
        sections: [
          { heading: "Introduction", instruction: "", injectedBlocks: [] },
          { heading: "Analysis", instruction: "Analyze in depth.", injectedBlocks: [] },
        ],
      });
      const result = emptySectionsRule.check(spec, "");
      expect(result).not.toBeNull();
      expect(result?.severity).toBe("warning");
      expect(result?.ruleId).toBe("empty-sections");
    });

    it("should return null when all sections have instruction or injected blocks", () => {
      const spec = makeSpec({
        sections: [
          { heading: "Introduction", instruction: "Introduce the topic.", injectedBlocks: [] },
          { heading: "Analysis", instruction: "Analyze in depth.", injectedBlocks: [] },
        ],
      });
      const result = emptySectionsRule.check(spec, "");
      expect(result).toBeNull();
    });

    it("should return null when empty section has injected blocks", () => {
      const spec = makeSpec({
        sections: [
          {
            heading: "Data",
            instruction: "",
            injectedBlocks: [
              {
                artifactId: "artifact1",
                artifactName: "Data",
                blockId: "block1",
                blockLabel: "Tables",
                content: "table content",
                tags: [],
                priority: 50,
                tokenCount: 100,
              },
            ],
          },
        ],
      });
      const result = emptySectionsRule.check(spec, "");
      expect(result).toBeNull();
    });

    it("should include section names in warning message", () => {
      const spec = makeSpec({
        sections: [
          { heading: "Introduction", instruction: "", injectedBlocks: [] },
          { heading: "Conclusion", instruction: "", injectedBlocks: [] },
        ],
      });
      const result = emptySectionsRule.check(spec, "");
      expect(result?.message).toContain("Introduction");
      expect(result?.message).toContain("Conclusion");
    });

    it("should include fix suggestion in result", () => {
      const spec = makeSpec({
        sections: [{ heading: "Empty", instruction: "", injectedBlocks: [] }],
      });
      const result = emptySectionsRule.check(spec, "");
      expect(result?.fix).toBeDefined();
    });
  });

  describe("do-not-send-leak rule", () => {
    it("should return error when injected block has do-not-send tag", () => {
      const spec = makeSpec({
        sections: [
          {
            heading: "Data",
            instruction: "Data section",
            injectedBlocks: [
              {
                artifactId: "artifact1",
                artifactName: "Sensitive",
                blockId: "block1",
                blockLabel: "Secret",
                content: "secret content",
                tags: ["do-not-send"],
                priority: 50,
                tokenCount: 100,
              },
            ],
          },
        ],
      });
      const result = doNotSendLeakRule.check(spec, "");
      expect(result).not.toBeNull();
      expect(result?.severity).toBe("error");
      expect(result?.ruleId).toBe("do-not-send-leak");
    });

    it("should return null when no do-not-send tags present", () => {
      const spec = makeSpec({
        sections: [
          {
            heading: "Data",
            instruction: "Data section",
            injectedBlocks: [
              {
                artifactId: "artifact1",
                artifactName: "Public",
                blockId: "block1",
                blockLabel: "Info",
                content: "public content",
                tags: ["public", "included"],
                priority: 50,
                tokenCount: 100,
              },
            ],
          },
        ],
      });
      const result = doNotSendLeakRule.check(spec, "");
      expect(result).toBeNull();
    });

    it("should list leaked block names in error message", () => {
      const spec = makeSpec({
        sections: [
          {
            heading: "Data",
            instruction: "Data section",
            injectedBlocks: [
              {
                artifactId: "artifact1",
                artifactName: "Internal",
                blockId: "block1",
                blockLabel: "Confidential",
                content: "secret",
                tags: ["do-not-send"],
                priority: 50,
                tokenCount: 100,
              },
            ],
          },
        ],
      });
      const result = doNotSendLeakRule.check(spec, "");
      expect(result?.message).toContain("Internal/Confidential");
    });

    it("should handle multiple do-not-send blocks", () => {
      const spec = makeSpec({
        sections: [
          {
            heading: "Data",
            instruction: "Data section",
            injectedBlocks: [
              {
                artifactId: "artifact1",
                artifactName: "Secret1",
                blockId: "block1",
                blockLabel: "Data1",
                content: "secret1",
                tags: ["do-not-send"],
                priority: 50,
                tokenCount: 50,
              },
              {
                artifactId: "artifact2",
                artifactName: "Secret2",
                blockId: "block2",
                blockLabel: "Data2",
                content: "secret2",
                tags: ["do-not-send"],
                priority: 50,
                tokenCount: 50,
              },
            ],
          },
        ],
      });
      const result = doNotSendLeakRule.check(spec, "");
      expect(result?.message).toContain("2");
      expect(result?.message).toContain("Secret1/Data1");
      expect(result?.message).toContain("Secret2/Data2");
    });

    it("should include fix suggestion in result", () => {
      const spec = makeSpec({
        sections: [
          {
            heading: "Data",
            instruction: "Data section",
            injectedBlocks: [
              {
                artifactId: "artifact1",
                artifactName: "Sensitive",
                blockId: "block1",
                blockLabel: "Secret",
                content: "secret",
                tags: ["do-not-send"],
                priority: 50,
                tokenCount: 100,
              },
            ],
          },
        ],
      });
      const result = doNotSendLeakRule.check(spec, "");
      expect(result?.fix).toBeDefined();
    });
  });

  describe("All rules defined", () => {
    it("should have exactly 6 rules", () => {
      expect(rules).toHaveLength(6);
    });

    it("should have unique rule IDs", () => {
      const ids = rules.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("all rules should have name, id, and check function", () => {
      for (const rule of rules) {
        expect(rule.id).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(typeof rule.check).toBe("function");
      }
    });
  });
});
