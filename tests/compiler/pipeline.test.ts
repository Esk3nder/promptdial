import { describe, it, expect, vi } from "vitest";
import { compile } from "@/compiler/pipeline";
import type { CompileInput, Artifact, ArtifactRef } from "@/core/types";

describe("pipeline", () => {
  // Mock artifact resolver
  const mockResolveArtifacts = async (refs: string[]): Promise<ArtifactRef[]> => {
    return refs.map((ref) => ({
      raw: `@${ref}`,
      artifactId: `art-${ref.toLowerCase()}`,
      artifactName: `${ref} Artifact`,
      resolved: true,
    }));
  };

  // Mock artifact fetcher
  const mockFetchArtifact = async (id: string): Promise<Artifact | null> => {
    if (id === "art-ai") {
      return {
        id: "art-ai",
        name: "AI Standards",
        aliases: ["ai", "artificial-intelligence"],
        description: "AI best practices",
        blocks: [
          {
            id: "b1",
            label: "AI Safety",
            content: "Always validate AI outputs.",
            tags: ["background", "context"],
            priority: 5,
            doNotSend: false,
            tokenCount: 10,
          },
          {
            id: "b2",
            label: "AI Ethics",
            content: "Consider ethical implications.",
            tags: ["background"],
            priority: 4,
            doNotSend: false,
            tokenCount: 8,
          },
        ],
        version: 1,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        isSeed: true,
      };
    }
    return null;
  };

  describe("basic compilation", () => {
    it("returns CompileOutput with spec, rendered, lint, and injection", async () => {
      const input: CompileInput = {
        rawInput: "Write a research report",
        dial: 3,
        tokenBudget: 1000,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output).toHaveProperty("spec");
      expect(output).toHaveProperty("rendered");
      expect(output).toHaveProperty("lint");
      expect(output).toHaveProperty("injection");
    });

    it("generates a valid PromptSpec", async () => {
      const input: CompileInput = {
        rawInput: "Write a research report",
        dial: 3,
        tokenBudget: 1000,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.spec.id).toBeDefined();
      expect(output.spec.templateId).toBe("academic-report");
      expect(output.spec.dial).toBe(3);
      expect(output.spec.tokenBudget).toBe(1000);
      expect(output.spec.systemInstruction).toBeDefined();
      expect(output.spec.sections).toBeInstanceOf(Array);
    });

    it("renders a non-empty prompt string", async () => {
      const input: CompileInput = {
        rawInput: "Write a research report",
        dial: 3,
        tokenBudget: 1000,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.rendered).toBeDefined();
      expect(output.rendered.length).toBeGreaterThan(0);
      expect(output.rendered).toContain("[System Instruction]");
    });

    it("includes lint report with score and results", async () => {
      const input: CompileInput = {
        rawInput: "Write a research report",
        dial: 3,
        tokenBudget: 1000,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.lint).toHaveProperty("score");
      expect(output.lint).toHaveProperty("results");
      expect(output.lint).toHaveProperty("passed");
      expect(typeof output.lint.score).toBe("number");
      expect(Array.isArray(output.lint.results)).toBe(true);
    });

    it("includes injection report", async () => {
      const input: CompileInput = {
        rawInput: "Write a research report",
        dial: 3,
        tokenBudget: 1000,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.injection).toHaveProperty("entries");
      expect(output.injection).toHaveProperty("totalTokensUsed");
      expect(output.injection).toHaveProperty("totalTokensBudget");
      expect(output.injection).toHaveProperty("blocksIncluded");
      expect(output.injection).toHaveProperty("blocksOmitted");
      expect(output.injection.totalTokensBudget).toBe(1000);
    });
  });

  describe("metadata", () => {
    it("sets compileDurationMs > 0", async () => {
      const input: CompileInput = {
        rawInput: "Write a research report",
        dial: 3,
        tokenBudget: 1000,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.spec.meta.compileDurationMs).toBeGreaterThan(0);
    });

    it("sets compiledAt as valid ISO datetime", async () => {
      const input: CompileInput = {
        rawInput: "Write a research report",
        dial: 3,
        tokenBudget: 1000,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.spec.meta.compiledAt).toBeDefined();
      const date = new Date(output.spec.meta.compiledAt);
      expect(date.toISOString()).toBe(output.spec.meta.compiledAt);
    });

    it("sets totalTokens based on rendered content", async () => {
      const input: CompileInput = {
        rawInput: "Write a research report",
        dial: 3,
        tokenBudget: 1000,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.spec.meta.totalTokens).toBeGreaterThan(0);
    });

    it("sets lintScore from lint report", async () => {
      const input: CompileInput = {
        rawInput: "Write a research report",
        dial: 3,
        tokenBudget: 1000,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.spec.meta.lintScore).toBe(output.lint.score);
    });
  });

  describe("artifact resolution", () => {
    it("resolves @references from input", async () => {
      const input: CompileInput = {
        rawInput: "Write a report @AI",
        dial: 3,
        tokenBudget: 1000,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.spec.artifactRefs).toHaveLength(1);
      expect(output.spec.artifactRefs[0].raw).toBe("@AI");
      expect(output.spec.artifactRefs[0].artifactId).toBe("art-ai");
      expect(output.spec.artifactRefs[0].resolved).toBe(true);
    });

    it("injects blocks from resolved artifacts", async () => {
      const input: CompileInput = {
        rawInput: "Write a report @AI",
        dial: 3,
        tokenBudget: 1000,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.injection.blocksIncluded).toBeGreaterThan(0);
      expect(output.injection.entries.some((e) => e.included)).toBe(true);
    });

    it("handles force artifacts", async () => {
      const input: CompileInput = {
        rawInput: "Write a report",
        dial: 3,
        tokenBudget: 1000,
        forceArtifacts: ["AI"],
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.spec.artifactRefs).toHaveLength(1);
      expect(output.spec.artifactRefs[0].raw).toBe("@AI");
    });

    it("combines parsed and forced artifacts", async () => {
      const input: CompileInput = {
        rawInput: "Write a report @Security",
        dial: 3,
        tokenBudget: 1000,
        forceArtifacts: ["AI"],
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.spec.artifactRefs.length).toBeGreaterThanOrEqual(1);
    });

    it("handles no artifacts gracefully", async () => {
      const input: CompileInput = {
        rawInput: "Write a report",
        dial: 3,
        tokenBudget: 1000,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.spec.artifactRefs).toHaveLength(0);
      expect(output.injection.blocksIncluded).toBe(0);
    });
  });

  describe("template detection", () => {
    it("auto-detects template from input", async () => {
      const input: CompileInput = {
        rawInput: "Create a PRD for the new feature",
        dial: 3,
        tokenBudget: 1000,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.spec.templateId).toBe("prd");
    });

    it("uses template override when provided", async () => {
      const input: CompileInput = {
        rawInput: "Write a research report",
        dial: 3,
        tokenBudget: 1000,
        templateOverride: "prd",
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.spec.templateId).toBe("prd");
    });
  });

  describe("dial level handling", () => {
    it("respects dial level for section inclusion", async () => {
      const inputDial0: CompileInput = {
        rawInput: "Write a research report",
        dial: 0,
        tokenBudget: 1000,
      };

      const outputDial0 = await compile(inputDial0, mockResolveArtifacts, mockFetchArtifact);

      const inputDial5: CompileInput = {
        rawInput: "Write a research report",
        dial: 5,
        tokenBudget: 1000,
      };

      const outputDial5 = await compile(inputDial5, mockResolveArtifacts, mockFetchArtifact);

      expect(outputDial5.spec.sections.length).toBeGreaterThan(outputDial0.spec.sections.length);
    });
  });

  describe("token budget", () => {
    it("respects token budget when selecting blocks", async () => {
      const input: CompileInput = {
        rawInput: "Write a report @AI",
        dial: 3,
        tokenBudget: 5, // Very low budget
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.injection.totalTokensUsed).toBeLessThanOrEqual(5);
    });

    it("handles unlimited budget (0)", async () => {
      const input: CompileInput = {
        rawInput: "Write a report @AI",
        dial: 3,
        tokenBudget: 0, // Unlimited
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.injection.totalTokensBudget).toBe(0);
      // All available blocks should be included
      expect(output.injection.blocksIncluded).toBeGreaterThan(0);
    });
  });

  describe("end-to-end integration", () => {
    it("compiles complete prompt with all features", async () => {
      const input: CompileInput = {
        rawInput: "Write a formal research report @AI for executives under 1000 words",
        dial: 3,
        tokenBudget: 1000,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      // Spec
      expect(output.spec.templateId).toBe("academic-report");
      expect(output.spec.constraints.length).toBeGreaterThan(0);
      expect(output.spec.artifactRefs).toHaveLength(1);

      // Rendered output
      expect(output.rendered).toContain("[System Instruction]");
      expect(output.rendered).toContain("[Constraints]");

      // Lint
      expect(output.lint.score).toBeGreaterThanOrEqual(0);
      expect(output.lint.score).toBeLessThanOrEqual(100);

      // Injection
      expect(output.injection.entries.length).toBeGreaterThan(0);

      // Metadata
      expect(output.spec.meta.compileDurationMs).toBeGreaterThan(0);
      expect(output.spec.meta.totalTokens).toBeGreaterThan(0);
    });
  });

  describe("error handling", () => {
    it("handles null artifact from fetcher", async () => {
      const failingFetcher = async () => null;

      const input: CompileInput = {
        rawInput: "Write a report @NonExistent",
        dial: 3,
        tokenBudget: 1000,
      };

      const output = await compile(input, mockResolveArtifacts, failingFetcher);

      // Should still compile, just without blocks
      expect(output.spec).toBeDefined();
      expect(output.injection.blocksIncluded).toBe(0);
    });

    it("handles empty artifact blocks array", async () => {
      const emptyArtifactFetcher = async (): Promise<Artifact | null> => ({
        id: "empty",
        name: "Empty Artifact",
        aliases: [],
        description: "No blocks",
        blocks: [],
        version: 1,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        isSeed: false,
      });

      const input: CompileInput = {
        rawInput: "Write a report @Empty",
        dial: 3,
        tokenBudget: 1000,
      };

      const output = await compile(input, mockResolveArtifacts, emptyArtifactFetcher);

      expect(output.spec).toBeDefined();
      expect(output.injection.blocksIncluded).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("handles empty input", async () => {
      const input: CompileInput = {
        rawInput: "",
        dial: 3,
        tokenBudget: 1000,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.spec).toBeDefined();
      expect(output.rendered).toBeDefined();
    });

    it("handles very high dial level", async () => {
      const input: CompileInput = {
        rawInput: "Write a report",
        dial: 5,
        tokenBudget: 1000,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.spec.dial).toBe(5);
    });

    it("handles multiple artifact references", async () => {
      const input: CompileInput = {
        rawInput: "Write a report @AI @Security @Testing",
        dial: 3,
        tokenBudget: 1000,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.spec.artifactRefs.length).toBeGreaterThanOrEqual(1);
    });
  });
});
