import { describe, it, expect } from "vitest";
import { generateSpec } from "@/compiler/spec-generator";
import type { TemplateDefinition, InjectedBlock, ArtifactRef, DialLevel } from "@/core/types";

describe("spec-generator", () => {
  const createMockTemplate = (overrides?: Partial<TemplateDefinition>): TemplateDefinition => ({
    id: "academic-report",
    name: "Academic Report",
    description: "Test template",
    systemInstruction: "You are a research assistant.",
    sections: [
      { heading: "Background", minDial: 0, instruction: "Provide background.", required: true },
      { heading: "Methodology", minDial: 2, instruction: "Describe methods.", required: false },
      { heading: "Analysis", minDial: 3, instruction: "Analyze data.", required: false },
      { heading: "Conclusion", minDial: 5, instruction: "Draw conclusions.", required: false },
    ],
    ...overrides,
  });

  describe("dial level filtering", () => {
    it("includes only sections with minDial <= dial level (dial 0)", () => {
      const template = createMockTemplate();
      const resolvedBlocks = new Map<string, InjectedBlock[]>();

      const spec = generateSpec({
        rawInput: "test",
        parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "test" },
        template,
        dial: 0,
        tokenBudget: 1000,
        resolvedBlocks,
        artifactRefs: [],
      });

      expect(spec.sections).toHaveLength(1);
      expect(spec.sections[0].heading).toBe("Background");
    });

    it("includes all sections at dial 5", () => {
      const template = createMockTemplate();
      const resolvedBlocks = new Map<string, InjectedBlock[]>();

      const spec = generateSpec({
        rawInput: "test",
        parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "test" },
        template,
        dial: 5,
        tokenBudget: 1000,
        resolvedBlocks,
        artifactRefs: [],
      });

      expect(spec.sections).toHaveLength(4);
      expect(spec.sections.map((s) => s.heading)).toEqual([
        "Background",
        "Methodology",
        "Analysis",
        "Conclusion",
      ]);
    });

    it("includes sections with minDial <= 3 at dial 3", () => {
      const template = createMockTemplate();
      const resolvedBlocks = new Map<string, InjectedBlock[]>();

      const spec = generateSpec({
        rawInput: "test",
        parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "test" },
        template,
        dial: 3,
        tokenBudget: 1000,
        resolvedBlocks,
        artifactRefs: [],
      });

      expect(spec.sections).toHaveLength(3);
      expect(spec.sections.map((s) => s.heading)).toEqual([
        "Background",
        "Methodology",
        "Analysis",
      ]);
    });

    it("respects exact minDial boundary", () => {
      const template = createMockTemplate();
      const resolvedBlocks = new Map<string, InjectedBlock[]>();

      const spec = generateSpec({
        rawInput: "test",
        parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "test" },
        template,
        dial: 2,
        tokenBudget: 1000,
        resolvedBlocks,
        artifactRefs: [],
      });

      expect(spec.sections).toHaveLength(2);
      expect(spec.sections.map((s) => s.heading)).toEqual([
        "Background",
        "Methodology",
      ]);
    });
  });

  describe("block injection", () => {
    it("attaches resolved blocks to correct sections", () => {
      const template = createMockTemplate();
      const mockBlocks: InjectedBlock[] = [
        {
          artifactId: "art1",
          artifactName: "Test Artifact",
          blockId: "b1",
          blockLabel: "Background Info",
          content: "Background content",
          tags: ["background"],
          priority: 5,
          tokenCount: 10,
        },
      ];

      const resolvedBlocks = new Map<string, InjectedBlock[]>([
        ["Background", mockBlocks],
      ]);

      const spec = generateSpec({
        rawInput: "test",
        parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "test" },
        template,
        dial: 5,
        tokenBudget: 1000,
        resolvedBlocks,
        artifactRefs: [],
      });

      const backgroundSection = spec.sections.find((s) => s.heading === "Background");
      expect(backgroundSection).toBeDefined();
      expect(backgroundSection!.injectedBlocks).toHaveLength(1);
      expect(backgroundSection!.injectedBlocks[0].blockLabel).toBe("Background Info");
    });

    it("handles sections with no resolved blocks", () => {
      const template = createMockTemplate();
      const resolvedBlocks = new Map<string, InjectedBlock[]>();

      const spec = generateSpec({
        rawInput: "test",
        parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "test" },
        template,
        dial: 5,
        tokenBudget: 1000,
        resolvedBlocks,
        artifactRefs: [],
      });

      expect(spec.sections.every((s) => s.injectedBlocks.length === 0)).toBe(true);
    });

    it("attaches blocks to multiple sections", () => {
      const template = createMockTemplate();
      const backgroundBlocks: InjectedBlock[] = [
        {
          artifactId: "art1",
          artifactName: "Test",
          blockId: "b1",
          blockLabel: "BG Block",
          content: "BG content",
          tags: ["background"],
          priority: 5,
          tokenCount: 10,
        },
      ];

      const analysisBlocks: InjectedBlock[] = [
        {
          artifactId: "art1",
          artifactName: "Test",
          blockId: "b2",
          blockLabel: "Analysis Block",
          content: "Analysis content",
          tags: ["analysis"],
          priority: 5,
          tokenCount: 10,
        },
      ];

      const resolvedBlocks = new Map<string, InjectedBlock[]>([
        ["Background", backgroundBlocks],
        ["Analysis", analysisBlocks],
      ]);

      const spec = generateSpec({
        rawInput: "test",
        parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "test" },
        template,
        dial: 5,
        tokenBudget: 1000,
        resolvedBlocks,
        artifactRefs: [],
      });

      const background = spec.sections.find((s) => s.heading === "Background");
      const analysis = spec.sections.find((s) => s.heading === "Analysis");

      expect(background!.injectedBlocks).toHaveLength(1);
      expect(analysis!.injectedBlocks).toHaveLength(1);
    });
  });

  describe("spec structure", () => {
    it("generates valid UUID for spec id", () => {
      const template = createMockTemplate();
      const resolvedBlocks = new Map<string, InjectedBlock[]>();

      const spec = generateSpec({
        rawInput: "test",
        parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "test" },
        template,
        dial: 3,
        tokenBudget: 1000,
        resolvedBlocks,
        artifactRefs: [],
      });

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(spec.id).toMatch(uuidRegex);
    });

    it("preserves template system instruction", () => {
      const template = createMockTemplate({
        systemInstruction: "Custom system instruction.",
      });
      const resolvedBlocks = new Map<string, InjectedBlock[]>();

      const spec = generateSpec({
        rawInput: "test",
        parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "test" },
        template,
        dial: 3,
        tokenBudget: 1000,
        resolvedBlocks,
        artifactRefs: [],
      });

      expect(spec.systemInstruction).toBe("Custom system instruction.");
    });

    it("includes parsed constraints", () => {
      const template = createMockTemplate();
      const resolvedBlocks = new Map<string, InjectedBlock[]>();

      const spec = generateSpec({
        rawInput: "test",
        parsedIntent: {
          templateId: "academic-report",
          constraints: ["Tone: formal", "Max words: 500"],
          cleanedInput: "test",
        },
        template,
        dial: 3,
        tokenBudget: 1000,
        resolvedBlocks,
        artifactRefs: [],
      });

      expect(spec.constraints).toEqual(["Tone: formal", "Max words: 500"]);
    });

    it("includes artifact references", () => {
      const template = createMockTemplate();
      const resolvedBlocks = new Map<string, InjectedBlock[]>();
      const artifactRefs: ArtifactRef[] = [
        {
          raw: "@AI",
          artifactId: "art-1",
          artifactName: "AI Standards",
          resolved: true,
        },
      ];

      const spec = generateSpec({
        rawInput: "test",
        parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "test" },
        template,
        dial: 3,
        tokenBudget: 1000,
        resolvedBlocks,
        artifactRefs,
      });

      expect(spec.artifactRefs).toHaveLength(1);
      expect(spec.artifactRefs[0].raw).toBe("@AI");
    });

    it("sets dial and token budget correctly", () => {
      const template = createMockTemplate();
      const resolvedBlocks = new Map<string, InjectedBlock[]>();

      const spec = generateSpec({
        rawInput: "test",
        parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "test" },
        template,
        dial: 4 as DialLevel,
        tokenBudget: 2500,
        resolvedBlocks,
        artifactRefs: [],
      });

      expect(spec.dial).toBe(4);
      expect(spec.tokenBudget).toBe(2500);
    });

    it("sets template ID correctly", () => {
      const template = createMockTemplate({ id: "prd" });
      const resolvedBlocks = new Map<string, InjectedBlock[]>();

      const spec = generateSpec({
        rawInput: "test",
        parsedIntent: { templateId: "prd", constraints: [], cleanedInput: "test" },
        template,
        dial: 3,
        tokenBudget: 1000,
        resolvedBlocks,
        artifactRefs: [],
      });

      expect(spec.templateId).toBe("prd");
    });

    it("preserves rawInput in spec", () => {
      const template = createMockTemplate();
      const resolvedBlocks = new Map<string, InjectedBlock[]>();

      const spec = generateSpec({
        rawInput: "Write a report on AI",
        parsedIntent: {
          templateId: "academic-report",
          constraints: [],
          cleanedInput: "Write a report on AI",
        },
        template,
        dial: 3,
        tokenBudget: 1000,
        resolvedBlocks,
        artifactRefs: [],
      });

      expect(spec.rawInput).toBe("Write a report on AI");
    });
  });

  describe("metadata", () => {
    it("initializes meta with ISO datetime", () => {
      const template = createMockTemplate();
      const resolvedBlocks = new Map<string, InjectedBlock[]>();

      const spec = generateSpec({
        rawInput: "test",
        parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "test" },
        template,
        dial: 3,
        tokenBudget: 1000,
        resolvedBlocks,
        artifactRefs: [],
      });

      expect(spec.meta.compiledAt).toBeDefined();
      // ISO 8601 format check
      expect(new Date(spec.meta.compiledAt).toISOString()).toBe(spec.meta.compiledAt);
    });

    it("initializes meta with default values", () => {
      const template = createMockTemplate();
      const resolvedBlocks = new Map<string, InjectedBlock[]>();

      const spec = generateSpec({
        rawInput: "test",
        parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "test" },
        template,
        dial: 3,
        tokenBudget: 1000,
        resolvedBlocks,
        artifactRefs: [],
      });

      expect(spec.meta.totalTokens).toBe(0);
      expect(spec.meta.compileDurationMs).toBe(0);
      expect(spec.meta.lintScore).toBe(100);
    });
  });

  describe("edge cases", () => {
    it("handles template with no sections", () => {
      const template = createMockTemplate({ sections: [] });
      const resolvedBlocks = new Map<string, InjectedBlock[]>();

      const spec = generateSpec({
        rawInput: "test",
        parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "test" },
        template,
        dial: 5,
        tokenBudget: 1000,
        resolvedBlocks,
        artifactRefs: [],
      });

      expect(spec.sections).toHaveLength(0);
    });

    it("handles empty artifact refs", () => {
      const template = createMockTemplate();
      const resolvedBlocks = new Map<string, InjectedBlock[]>();

      const spec = generateSpec({
        rawInput: "test",
        parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "test" },
        template,
        dial: 3,
        tokenBudget: 1000,
        resolvedBlocks,
        artifactRefs: [],
      });

      expect(spec.artifactRefs).toEqual([]);
    });

    it("handles empty constraints", () => {
      const template = createMockTemplate();
      const resolvedBlocks = new Map<string, InjectedBlock[]>();

      const spec = generateSpec({
        rawInput: "test",
        parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "test" },
        template,
        dial: 3,
        tokenBudget: 1000,
        resolvedBlocks,
        artifactRefs: [],
      });

      expect(spec.constraints).toEqual([]);
    });

    it("handles zero token budget", () => {
      const template = createMockTemplate();
      const resolvedBlocks = new Map<string, InjectedBlock[]>();

      const spec = generateSpec({
        rawInput: "test",
        parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "test" },
        template,
        dial: 3,
        tokenBudget: 0,
        resolvedBlocks,
        artifactRefs: [],
      });

      expect(spec.tokenBudget).toBe(0);
    });
  });
});
