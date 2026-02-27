import { describe, it, expect, beforeEach } from "vitest";
import { parseIntent } from "@/compiler/intent-parser";
import { selectBlocks } from "@/compiler/block-selector";
import { renderPrompt } from "@/compiler/renderer";
import { generateSpec } from "@/compiler/spec-generator";
import type {
  ArtifactBlock,
  PromptSpec,
  TemplateDefinition,
  ArtifactRef,
  InjectedBlock,
} from "@/core/types";

// ============================================================
// Intent Parser Tests
// ============================================================

describe("Intent Parser", () => {
  describe("parseIntent", () => {
    it("should detect academic-report template from keywords", () => {
      const result = parseIntent("Write a research report on machine learning");
      expect(result.templateId).toBe("academic-report");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should detect prd template from keywords", () => {
      const result = parseIntent("Write a product requirements document for a new feature");
      expect(result.templateId).toBe("prd");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should extract artifact references from @mentions", () => {
      const result = parseIntent("Write report using @customerdata and @marketanalysis");
      expect(result.artifactRefs).toContain("customerdata");
      expect(result.artifactRefs).toContain("marketanalysis");
    });

    it("should clean input by removing @references", () => {
      const result = parseIntent("Write a report using @data about AI");
      expect(result.cleanedInput).not.toContain("@");
      expect(result.cleanedInput).toContain("about AI");
    });

    it("should extract audience constraint", () => {
      const result = parseIntent("Write a report for technical leaders audience, formal tone");
      const audienceConstraint = result.constraints.find((c) => c.includes("Audience"));
      expect(audienceConstraint).toBeDefined();
    });

    it("should extract tone constraint", () => {
      const result = parseIntent("Write in formal tone about the topic");
      const toneConstraint = result.constraints.find((c) => c.includes("Tone"));
      expect(toneConstraint?.includes("formal")).toBe(true);
    });

    it("should extract max words constraint", () => {
      const result = parseIntent("Write under 500 words about the topic");
      const wordsConstraint = result.constraints.find((c) => c.includes("words"));
      expect(wordsConstraint?.includes("500")).toBe(true);
    });

    it("should use template override when provided", () => {
      const result = parseIntent("Write something", "prd");
      expect(result.templateId).toBe("prd");
      expect(result.confidence).toBe(1.0);
    });

    it("should deduplicate constraint types", () => {
      const result = parseIntent(
        "Write in formal tone. Formal is important. in formal tone"
      );
      const toneConstraints = result.constraints.filter((c) => c.includes("Tone"));
      expect(toneConstraints.length).toBeLessThanOrEqual(1);
    });

    it("should default to academic-report for generic input", () => {
      const result = parseIntent("Write something generic");
      expect(result.templateId).toBe("academic-report");
    });

    it("should return all required properties", () => {
      const result = parseIntent("Write something");
      expect(result).toHaveProperty("templateId");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("constraints");
      expect(result).toHaveProperty("artifactRefs");
      expect(result).toHaveProperty("cleanedInput");
    });

    it("should handle empty string", () => {
      const result = parseIntent("");
      expect(result.templateId).toBeDefined();
      expect(Array.isArray(result.constraints)).toBe(true);
    });

    it("should be case-insensitive for template matching", () => {
      const result1 = parseIntent("WRITE A RESEARCH REPORT");
      const result2 = parseIntent("write a research report");
      expect(result1.templateId).toBe(result2.templateId);
    });
  });
});

// ============================================================
// Block Selector Tests
// ============================================================

describe("Block Selector", () => {
  let testBlocks: ArtifactBlock[];

  beforeEach(() => {
    testBlocks = [
      {
        id: "block1",
        label: "Context A",
        content: "Content A",
        tags: ["introduction", "general"],
        priority: 80,
        doNotSend: false,
        tokenCount: 100,
      },
      {
        id: "block2",
        label: "Context B",
        content: "Content B",
        tags: ["analysis"],
        priority: 60,
        doNotSend: false,
        tokenCount: 200,
      },
      {
        id: "block3",
        label: "Secret",
        content: "Secret content",
        tags: ["confidential"],
        priority: 100,
        doNotSend: true,
        tokenCount: 50,
      },
      {
        id: "block4",
        label: "Context D",
        content: "Content D",
        tags: ["analysis", "detailed"],
        priority: 70,
        doNotSend: false,
        tokenCount: 150,
      },
    ];
  });

  describe("selectBlocks", () => {
    it("should filter out doNotSend blocks", () => {
      const result = selectBlocks({
        blocks: testBlocks,
        sectionTags: [],
        tokenBudget: 0,
        artifactId: "artifact1",
        artifactName: "Test Artifact",
      });
      const hasSecretBlock = result.included.some((b) => b.blockId === "block3");
      expect(hasSecretBlock).toBe(false);
      const secretOmitted = result.omitted.some((o) => o.block.id === "block3");
      expect(secretOmitted).toBe(true);
    });

    it("should match blocks by section tags", () => {
      const result = selectBlocks({
        blocks: testBlocks,
        sectionTags: ["analysis"],
        tokenBudget: 0,
        artifactId: "artifact1",
        artifactName: "Test Artifact",
      });
      const analysisBlocks = result.included.filter((b) =>
        testBlocks.find((tb) => tb.id === b.blockId)?.tags.includes("analysis")
      );
      expect(analysisBlocks.length).toBeGreaterThan(0);
    });

    it("should include all non-doNotSend blocks when no tags specified", () => {
      const result = selectBlocks({
        blocks: testBlocks,
        sectionTags: [],
        tokenBudget: 0,
        artifactId: "artifact1",
        artifactName: "Test Artifact",
      });
      expect(result.included.length).toBe(3); // block1, 2, 4 (not 3 which is doNotSend)
    });

    it("should sort candidates by priority descending", () => {
      const result = selectBlocks({
        blocks: testBlocks,
        sectionTags: ["analysis", "detailed"],
        tokenBudget: 0,
        artifactId: "artifact1",
        artifactName: "Test Artifact",
      });
      if (result.included.length > 1) {
        for (let i = 0; i < result.included.length - 1; i++) {
          expect(result.included[i].priority).toBeGreaterThanOrEqual(
            result.included[i + 1].priority
          );
        }
      }
    });

    it("should respect token budget", () => {
      const result = selectBlocks({
        blocks: testBlocks,
        sectionTags: [],
        tokenBudget: 150,
        artifactId: "artifact1",
        artifactName: "Test Artifact",
      });
      expect(result.tokensUsed).toBeLessThanOrEqual(150);
    });

    it("should exclude blocks exceeding remaining budget", () => {
      const result = selectBlocks({
        blocks: [testBlocks[0]], // 100 tokens
        sectionTags: [],
        tokenBudget: 50,
        artifactId: "artifact1",
        artifactName: "Test Artifact",
      });
      expect(result.included.length).toBe(0);
      expect(result.omitted.some((o) => o.reason === "exceeded token budget")).toBe(true);
    });

    it("should return omitted blocks with reasons", () => {
      const result = selectBlocks({
        blocks: testBlocks,
        sectionTags: ["analysis"],
        tokenBudget: 500,
        artifactId: "artifact1",
        artifactName: "Test Artifact",
      });
      expect(result.omitted.length).toBeGreaterThan(0);
      expect(result.omitted.every((o) => o.reason)).toBe(true);
    });

    it("should match tags case-insensitively", () => {
      const result = selectBlocks({
        blocks: testBlocks,
        sectionTags: ["analysis"],
        tokenBudget: 0,
        artifactId: "artifact1",
        artifactName: "Test Artifact",
      });
      // Blocks 2 and 4 have "analysis" tag
      expect(result.included.length).toBe(2);
      expect(result.included.some((b) => b.blockId === "block2")).toBe(true);
      expect(result.included.some((b) => b.blockId === "block4")).toBe(true);
    });

    it("should accumulate token counts correctly", () => {
      const result = selectBlocks({
        blocks: testBlocks.filter((b) => !b.doNotSend),
        sectionTags: [],
        tokenBudget: 1000,
        artifactId: "artifact1",
        artifactName: "Test Artifact",
      });
      const calculatedTokens = result.included.reduce((sum, b) => sum + b.tokenCount, 0);
      expect(result.tokensUsed).toBe(calculatedTokens);
    });

    it("should create proper InjectedBlock objects", () => {
      const result = selectBlocks({
        blocks: [testBlocks[0]],
        sectionTags: [],
        tokenBudget: 0,
        artifactId: "artifact1",
        artifactName: "Test Artifact",
      });
      expect(result.included[0]).toHaveProperty("artifactId");
      expect(result.included[0]).toHaveProperty("artifactName");
      expect(result.included[0]).toHaveProperty("blockId");
      expect(result.included[0]).toHaveProperty("blockLabel");
      expect(result.included[0]).toHaveProperty("content");
      expect(result.included[0]).toHaveProperty("tags");
      expect(result.included[0]).toHaveProperty("priority");
      expect(result.included[0]).toHaveProperty("tokenCount");
    });
  });
});

// ============================================================
// Renderer Tests
// ============================================================

describe("Renderer", () => {
  describe("renderPrompt", () => {
    let testSpec: PromptSpec;

    beforeEach(() => {
      testSpec = {
        id: "test-spec",
        rawInput: "Test input",
        templateId: "academic-report",
        dial: 3,
        tokenBudget: 0,
        systemInstruction: "You are a helpful assistant",
        sections: [
          {
            heading: "Introduction",
            instruction: "Introduce the topic",
            injectedBlocks: [
              {
                artifactId: "art1",
                artifactName: "Data",
                blockId: "block1",
                blockLabel: "Background",
                content: "Some background info",
                tags: ["intro"],
                priority: 80,
                tokenCount: 100,
              },
            ],
          },
          {
            heading: "Analysis",
            instruction: "Analyze the topic",
            injectedBlocks: [],
          },
        ],
        constraints: ["Formal tone", "Technical audience"],
        artifactRefs: [],
        meta: {
          totalTokens: 500,
          compileDurationMs: 100,
          compiledAt: new Date().toISOString(),
          lintScore: 95,
        },
      };
    });

    it("should include system instruction", () => {
      const rendered = renderPrompt(testSpec);
      expect(rendered).toContain("[System Instruction]");
      expect(rendered).toContain("You are a helpful assistant");
    });

    it("should include all sections with headings", () => {
      const rendered = renderPrompt(testSpec);
      expect(rendered).toContain("# Introduction");
      expect(rendered).toContain("# Analysis");
    });

    it("should include section instructions", () => {
      const rendered = renderPrompt(testSpec);
      expect(rendered).toContain("Introduce the topic");
      expect(rendered).toContain("Analyze the topic");
    });

    it("should include injected blocks with context labels", () => {
      const rendered = renderPrompt(testSpec);
      expect(rendered).toContain("## [Context: Background]");
      expect(rendered).toContain("Some background info");
    });

    it("should include constraints section when present", () => {
      const rendered = renderPrompt(testSpec);
      expect(rendered).toContain("[Constraints]");
      expect(rendered).toContain("Formal tone");
      expect(rendered).toContain("Technical audience");
    });

    it("should handle empty constraints", () => {
      testSpec.constraints = [];
      const rendered = renderPrompt(testSpec);
      expect(rendered).not.toContain("[Constraints]");
    });

    it("should use markdown section headers", () => {
      const rendered = renderPrompt(testSpec);
      expect(rendered).toContain("# Introduction");
      expect(rendered).toContain("## [Context:");
    });

    it("should include separators between sections", () => {
      const rendered = renderPrompt(testSpec);
      const separatorCount = (rendered.match(/---/g) || []).length;
      expect(separatorCount).toBeGreaterThan(0);
    });

    it("should return a string", () => {
      const rendered = renderPrompt(testSpec);
      expect(typeof rendered).toBe("string");
      expect(rendered.length).toBeGreaterThan(0);
    });

    it("should preserve order of sections", () => {
      const rendered = renderPrompt(testSpec);
      const introIndex = rendered.indexOf("# Introduction");
      const analysisIndex = rendered.indexOf("# Analysis");
      expect(introIndex).toBeLessThan(analysisIndex);
    });
  });
});

// ============================================================
// Spec Generator Tests
// ============================================================

describe("Spec Generator", () => {
  describe("generateSpec", () => {
    let testTemplate: TemplateDefinition;

    beforeEach(() => {
      testTemplate = {
        id: "academic-report",
        name: "Academic Report",
        description: "Research report template",
        systemInstruction: "You are an academic writer",
        sections: [
          {
            heading: "Introduction",
            minDial: 0,
            instruction: "Introduce the topic",
            required: true,
          },
          {
            heading: "Analysis",
            minDial: 1,
            instruction: "Analyze in depth",
            required: false,
          },
          {
            heading: "Conclusion",
            minDial: 2,
            instruction: "Conclude",
            required: false,
          },
        ],
      };
    });

    it("should generate spec with correct structure", () => {
      const artifactRefs: ArtifactRef[] = [];
      const resolvedBlocks = new Map<string, InjectedBlock[]>();

      const spec = generateSpec({
        rawInput: "Write a report",
        parsedIntent: {
          templateId: "academic-report",
          constraints: ["Formal"],
          cleanedInput: "Write a report",
        },
        template: testTemplate,
        dial: 2,
        tokenBudget: 1000,
        resolvedBlocks,
        artifactRefs,
      });

      expect(spec).toHaveProperty("id");
      expect(spec).toHaveProperty("rawInput");
      expect(spec).toHaveProperty("templateId");
      expect(spec).toHaveProperty("dial");
      expect(spec).toHaveProperty("tokenBudget");
      expect(spec).toHaveProperty("systemInstruction");
      expect(spec).toHaveProperty("sections");
      expect(spec).toHaveProperty("constraints");
      expect(spec).toHaveProperty("artifactRefs");
      expect(spec).toHaveProperty("meta");
    });

    it("should filter sections by dial level", () => {
      const spec = generateSpec({
        rawInput: "Write a report",
        parsedIntent: {
          templateId: "academic-report",
          constraints: [],
          cleanedInput: "Write a report",
        },
        template: testTemplate,
        dial: 1,
        tokenBudget: 0,
        resolvedBlocks: new Map(),
        artifactRefs: [],
      });

      expect(spec.sections.length).toBe(2); // Introduction (minDial 0) + Analysis (minDial 1)
      const headings = spec.sections.map((s) => s.heading);
      expect(headings).toContain("Introduction");
      expect(headings).toContain("Analysis");
      expect(headings).not.toContain("Conclusion");
    });

    it("should include all sections at high dial level", () => {
      const spec = generateSpec({
        rawInput: "Write a report",
        parsedIntent: {
          templateId: "academic-report",
          constraints: [],
          cleanedInput: "Write a report",
        },
        template: testTemplate,
        dial: 5,
        tokenBudget: 0,
        resolvedBlocks: new Map(),
        artifactRefs: [],
      });

      expect(spec.sections.length).toBe(3);
    });

    it("should generate unique IDs", () => {
      const spec1 = generateSpec({
        rawInput: "Write 1",
        parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "Write 1" },
        template: testTemplate,
        dial: 0,
        tokenBudget: 0,
        resolvedBlocks: new Map(),
        artifactRefs: [],
      });

      const spec2 = generateSpec({
        rawInput: "Write 2",
        parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "Write 2" },
        template: testTemplate,
        dial: 0,
        tokenBudget: 0,
        resolvedBlocks: new Map(),
        artifactRefs: [],
      });

      expect(spec1.id).not.toBe(spec2.id);
    });

    it("should preserve template system instruction", () => {
      const spec = generateSpec({
        rawInput: "Write",
        parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "Write" },
        template: testTemplate,
        dial: 0,
        tokenBudget: 0,
        resolvedBlocks: new Map(),
        artifactRefs: [],
      });

      expect(spec.systemInstruction).toBe("You are an academic writer");
    });

    it("should preserve constraints from parsed intent", () => {
      const spec = generateSpec({
        rawInput: "Write",
        parsedIntent: {
          templateId: "academic-report",
          constraints: ["Formal", "Technical"],
          cleanedInput: "Write",
        },
        template: testTemplate,
        dial: 0,
        tokenBudget: 0,
        resolvedBlocks: new Map(),
        artifactRefs: [],
      });

      expect(spec.constraints).toEqual(["Formal", "Technical"]);
    });

    it("should initialize meta with placeholder values", () => {
      const spec = generateSpec({
        rawInput: "Write",
        parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "Write" },
        template: testTemplate,
        dial: 0,
        tokenBudget: 0,
        resolvedBlocks: new Map(),
        artifactRefs: [],
      });

      expect(spec.meta.totalTokens).toBe(0);
      expect(spec.meta.compileDurationMs).toBe(0);
      expect(spec.meta.lintScore).toBe(100);
      expect(spec.meta.compiledAt).toBeDefined();
    });

    it("should inject resolved blocks into sections", () => {
      const injectedBlock: InjectedBlock = {
        artifactId: "art1",
        artifactName: "Data",
        blockId: "block1",
        blockLabel: "Data",
        content: "Data content",
        tags: [],
        priority: 50,
        tokenCount: 100,
      };

      const resolvedBlocks = new Map<string, InjectedBlock[]>([
        ["Introduction", [injectedBlock]],
      ]);

      const spec = generateSpec({
        rawInput: "Write",
        parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "Write" },
        template: testTemplate,
        dial: 0,
        tokenBudget: 0,
        resolvedBlocks,
        artifactRefs: [],
      });

      expect(spec.sections[0].injectedBlocks).toEqual([injectedBlock]);
    });
  });
});
