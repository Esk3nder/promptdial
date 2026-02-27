import { describe, it, expect } from "vitest";
import { renderPrompt } from "@/compiler/renderer";
import type { PromptSpec, PromptSpecSection, InjectedBlock } from "@/core/types";

describe("renderer", () => {
  const createMockSpec = (overrides?: Partial<PromptSpec>): PromptSpec => ({
    id: "test-id",
    rawInput: "test input",
    templateId: "academic-report",
    dial: 3,
    tokenBudget: 1000,
    systemInstruction: "You are a helpful assistant.",
    sections: [],
    constraints: [],
    artifactRefs: [],
    meta: {
      totalTokens: 0,
      compileDurationMs: 0,
      compiledAt: "2024-01-01T00:00:00Z",
      lintScore: 100,
    },
    ...overrides,
  });

  describe("basic rendering", () => {
    it("renders system instruction with proper formatting", () => {
      const spec = createMockSpec({
        systemInstruction: "You are a research assistant.",
      });

      const output = renderPrompt(spec);

      expect(output).toContain("[System Instruction]");
      expect(output).toContain("You are a research assistant.");
      expect(output).toContain("---");
    });

    it("renders section headings with # prefix", () => {
      const sections: PromptSpecSection[] = [
        {
          heading: "Background",
          instruction: "Provide background information.",
          injectedBlocks: [],
        },
      ];

      const spec = createMockSpec({ sections });
      const output = renderPrompt(spec);

      expect(output).toContain("# Background");
      expect(output).toContain("Provide background information.");
    });

    it("includes section separator between sections", () => {
      const sections: PromptSpecSection[] = [
        {
          heading: "Section 1",
          instruction: "Instruction 1",
          injectedBlocks: [],
        },
        {
          heading: "Section 2",
          instruction: "Instruction 2",
          injectedBlocks: [],
        },
      ];

      const spec = createMockSpec({ sections });
      const output = renderPrompt(spec);

      const lines = output.split("\n");
      const separatorIndices = lines
        .map((line, index) => (line === "---" ? index : -1))
        .filter((i) => i !== -1);

      expect(separatorIndices.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("injected blocks", () => {
    it("renders injected blocks with proper headers", () => {
      const injectedBlocks: InjectedBlock[] = [
        {
          artifactId: "art1",
          artifactName: "Test Artifact",
          blockId: "b1",
          blockLabel: "Security Guidelines",
          content: "Always validate user input.",
          tags: ["security"],
          priority: 5,
          tokenCount: 10,
        },
      ];

      const sections: PromptSpecSection[] = [
        {
          heading: "Context",
          instruction: "Use the following context.",
          injectedBlocks,
        },
      ];

      const spec = createMockSpec({ sections });
      const output = renderPrompt(spec);

      expect(output).toContain("## [Context: Security Guidelines]");
      expect(output).toContain("Always validate user input.");
    });

    it("renders multiple injected blocks in a section", () => {
      const injectedBlocks: InjectedBlock[] = [
        {
          artifactId: "art1",
          artifactName: "Artifact 1",
          blockId: "b1",
          blockLabel: "Block 1",
          content: "Content 1",
          tags: ["test"],
          priority: 5,
          tokenCount: 10,
        },
        {
          artifactId: "art1",
          artifactName: "Artifact 1",
          blockId: "b2",
          blockLabel: "Block 2",
          content: "Content 2",
          tags: ["test"],
          priority: 4,
          tokenCount: 10,
        },
      ];

      const sections: PromptSpecSection[] = [
        {
          heading: "Context",
          instruction: "Use the following context.",
          injectedBlocks,
        },
      ];

      const spec = createMockSpec({ sections });
      const output = renderPrompt(spec);

      expect(output).toContain("## [Context: Block 1]");
      expect(output).toContain("Content 1");
      expect(output).toContain("## [Context: Block 2]");
      expect(output).toContain("Content 2");
    });
  });

  describe("constraints", () => {
    it("renders constraints section when constraints exist", () => {
      const spec = createMockSpec({
        constraints: ["Tone: formal", "Max words: 500"],
      });

      const output = renderPrompt(spec);

      expect(output).toContain("[Constraints]");
      expect(output).toContain("Tone: formal");
      expect(output).toContain("Max words: 500");
    });

    it("does not render constraints section when constraints are empty", () => {
      const spec = createMockSpec({
        constraints: [],
      });

      const output = renderPrompt(spec);

      expect(output).not.toContain("[Constraints]");
    });

    it("renders constraints on separate lines", () => {
      const spec = createMockSpec({
        constraints: ["Constraint 1", "Constraint 2", "Constraint 3"],
      });

      const output = renderPrompt(spec);

      expect(output).toContain("Constraint 1\nConstraint 2\nConstraint 3");
    });
  });

  describe("multiple sections", () => {
    it("renders multiple sections with proper separators", () => {
      const sections: PromptSpecSection[] = [
        {
          heading: "Background",
          instruction: "Provide background.",
          injectedBlocks: [],
        },
        {
          heading: "Methodology",
          instruction: "Describe methodology.",
          injectedBlocks: [],
        },
        {
          heading: "Analysis",
          instruction: "Analyze the data.",
          injectedBlocks: [],
        },
      ];

      const spec = createMockSpec({ sections });
      const output = renderPrompt(spec);

      expect(output).toContain("# Background");
      expect(output).toContain("# Methodology");
      expect(output).toContain("# Analysis");

      const lines = output.split("\n");
      const separators = lines.filter((line) => line === "---");
      expect(separators.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("full integration", () => {
    it("renders complete spec with all components", () => {
      const injectedBlocks: InjectedBlock[] = [
        {
          artifactId: "art1",
          artifactName: "Standards",
          blockId: "b1",
          blockLabel: "Code Style",
          content: "Use TypeScript strict mode.",
          tags: ["standards"],
          priority: 5,
          tokenCount: 10,
        },
      ];

      const sections: PromptSpecSection[] = [
        {
          heading: "Context",
          instruction: "Use the following standards.",
          injectedBlocks,
        },
        {
          heading: "Task",
          instruction: "Complete the task.",
          injectedBlocks: [],
        },
      ];

      const spec = createMockSpec({
        systemInstruction: "You are an expert developer.",
        sections,
        constraints: ["Tone: technical", "Max words: 1000"],
      });

      const output = renderPrompt(spec);

      // System instruction
      expect(output).toContain("[System Instruction]");
      expect(output).toContain("You are an expert developer.");

      // Sections
      expect(output).toContain("# Context");
      expect(output).toContain("Use the following standards.");
      expect(output).toContain("## [Context: Code Style]");
      expect(output).toContain("Use TypeScript strict mode.");
      expect(output).toContain("# Task");
      expect(output).toContain("Complete the task.");

      // Constraints
      expect(output).toContain("[Constraints]");
      expect(output).toContain("Tone: technical");
      expect(output).toContain("Max words: 1000");

      // Separators
      expect(output).toContain("---");
    });
  });

  describe("edge cases", () => {
    it("handles empty sections array", () => {
      const spec = createMockSpec({
        sections: [],
      });

      const output = renderPrompt(spec);

      expect(output).toContain("[System Instruction]");
      expect(output).toContain("---");
    });

    it("handles section with empty instruction", () => {
      const sections: PromptSpecSection[] = [
        {
          heading: "Empty Section",
          instruction: "",
          injectedBlocks: [],
        },
      ];

      const spec = createMockSpec({ sections });
      const output = renderPrompt(spec);

      expect(output).toContain("# Empty Section");
    });

    it("handles multiline content in blocks", () => {
      const injectedBlocks: InjectedBlock[] = [
        {
          artifactId: "art1",
          artifactName: "Test",
          blockId: "b1",
          blockLabel: "Multiline Block",
          content: "Line 1\nLine 2\nLine 3",
          tags: ["test"],
          priority: 5,
          tokenCount: 10,
        },
      ];

      const sections: PromptSpecSection[] = [
        {
          heading: "Context",
          instruction: "Use this context.",
          injectedBlocks,
        },
      ];

      const spec = createMockSpec({ sections });
      const output = renderPrompt(spec);

      expect(output).toContain("Line 1\nLine 2\nLine 3");
    });

    it("handles special characters in content", () => {
      const injectedBlocks: InjectedBlock[] = [
        {
          artifactId: "art1",
          artifactName: "Test",
          blockId: "b1",
          blockLabel: "Special Characters",
          content: "Use <brackets>, [arrays], and {objects}.",
          tags: ["test"],
          priority: 5,
          tokenCount: 10,
        },
      ];

      const sections: PromptSpecSection[] = [
        {
          heading: "Context",
          instruction: "Use this context.",
          injectedBlocks,
        },
      ];

      const spec = createMockSpec({ sections });
      const output = renderPrompt(spec);

      expect(output).toContain("Use <brackets>, [arrays], and {objects}.");
    });

    it("preserves formatting in instructions", () => {
      const sections: PromptSpecSection[] = [
        {
          heading: "Task",
          instruction: "1. First step\n2. Second step\n3. Third step",
          injectedBlocks: [],
        },
      ];

      const spec = createMockSpec({ sections });
      const output = renderPrompt(spec);

      expect(output).toContain("1. First step\n2. Second step\n3. Third step");
    });
  });
});
