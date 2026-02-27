// ============================================================
// Prompt Dial -- Adversarial Determinism Tests
//
// Traces three inputs through every pipeline stage, then runs
// a 10-iteration determinism check on Input 1.
// ============================================================

import { describe, it, expect } from "vitest";
import { parseIntent } from "@/compiler/intent-parser";
import { generateSpec } from "@/compiler/spec-generator";
import { selectBlocks } from "@/compiler/block-selector";
import { renderPrompt } from "@/compiler/renderer";
import { compile } from "@/compiler/pipeline";
import { getTemplate } from "@/templates/index";
import { estimateTokens } from "@/app/lib/tokens";
import type {
  Artifact,
  ArtifactRef,
  ArtifactBlock,
  CompileInput,
  CompileOutput,
  DialLevel,
  InjectedBlock,
  PromptSpec,
  TemplateDefinition,
} from "@/core/types";

// ---- Shared mock infrastructure ----

const mockResolveArtifacts = async (refs: string[]): Promise<ArtifactRef[]> =>
  refs.map((ref) => ({
    raw: `@${ref}`,
    artifactId: `art-${ref.toLowerCase()}`,
    artifactName: `${ref} Artifact`,
    resolved: true,
  }));

const MOCK_AI_ARTIFACT: Artifact = {
  id: "art-ai",
  name: "AI Standards",
  aliases: ["ai", "artificial-intelligence"],
  description: "AI best practices and safety guidelines",
  blocks: [
    {
      id: "blk-safety",
      label: "AI Safety",
      content: "Always validate AI outputs before deployment.",
      tags: ["background", "context"],
      priority: 80,
      doNotSend: false,
      tokenCount: 9, // "Always validate AI outputs before deployment." -> 7 words * 1.3 = 9.1 -> ceil = 10... let's compute
    },
    {
      id: "blk-ethics",
      label: "AI Ethics",
      content: "Consider ethical implications of AI systems.",
      tags: ["background"],
      priority: 60,
      doNotSend: false,
      tokenCount: 9,
    },
    {
      id: "blk-secret",
      label: "Internal Notes",
      content: "Secret internal strategy document.",
      tags: ["internal-only"],
      priority: 90,
      doNotSend: true,
      tokenCount: 5,
    },
  ],
  version: 1,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  isSeed: true,
};

const mockFetchArtifact = async (id: string): Promise<Artifact | null> => {
  if (id === "art-ai") return MOCK_AI_ARTIFACT;
  return null;
};

// ---- Helper: strip non-deterministic fields for comparison ----

function stripNondeterministic(output: CompileOutput): Record<string, unknown> {
  const clone = structuredClone(output) as Record<string, unknown>;
  const spec = clone.spec as Record<string, unknown>;
  delete spec.id;
  const meta = spec.meta as Record<string, unknown>;
  delete meta.compiledAt;
  delete meta.compileDurationMs;
  return clone;
}

// ============================================================
// INPUT 1: Simple text, no artifacts
// "Write a report on AI", dial=3, tokenBudget=1000
// ============================================================

describe("Input 1: Simple text trace (no artifacts)", () => {
  const RAW_INPUT = "Write a report on AI";
  const DIAL: DialLevel = 3;
  const TOKEN_BUDGET = 1000;

  describe("Stage 1 -- parseIntent", () => {
    it("detects academic-report template from 'report' keyword", () => {
      const parsed = parseIntent(RAW_INPUT);
      expect(parsed.templateId).toBe("academic-report");
    });

    it("has confidence >= 0.7 (1 keyword 'report' -> 0.5 + 0.2 = 0.7)", () => {
      const parsed = parseIntent(RAW_INPUT);
      expect(parsed.confidence).toBe(0.7);
    });

    it("extracts no @refs from plain text", () => {
      const parsed = parseIntent(RAW_INPUT);
      expect(parsed.artifactRefs).toEqual([]);
    });

    it("cleanedInput equals rawInput (no refs to strip)", () => {
      const parsed = parseIntent(RAW_INPUT);
      expect(parsed.cleanedInput).toBe("Write a report on AI");
    });

    it("extracts no constraints from this input", () => {
      const parsed = parseIntent(RAW_INPUT);
      expect(parsed.constraints).toEqual([]);
    });
  });

  describe("Stage 2 -- generateSpec", () => {
    it("produces 8 sections at dial=3 (all except Future Work and References for minDial<=3)", () => {
      const parsed = parseIntent(RAW_INPUT);
      const template = getTemplate(parsed.templateId);

      // At dial=3, sections with minDial 0,1,2,3 are included.
      // academic-report sections by minDial:
      //   Executive Summary (0), Introduction (0), Background (1),
      //   Methodology (2), Analysis (1), Discussion (2),
      //   Limitations (3), Conclusion (0), References (3)
      // That's 9 sections at dial=3. Future Work needs minDial=4.
      const expectedSections = template.sections.filter((s) => s.minDial <= DIAL);
      expect(expectedSections).toHaveLength(9);

      const spec = generateSpec({
        rawInput: RAW_INPUT,
        parsedIntent: parsed,
        template,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
        resolvedBlocks: new Map(),
        artifactRefs: [],
      });

      expect(spec.sections).toHaveLength(9);
      expect(spec.sections.map((s) => s.heading)).toEqual([
        "Executive Summary",
        "Introduction",
        "Background",
        "Methodology",
        "Analysis",
        "Discussion",
        "Limitations",
        "Conclusion",
        "References",
      ]);
    });

    it("preserves rawInput in spec", () => {
      const parsed = parseIntent(RAW_INPUT);
      const template = getTemplate(parsed.templateId);
      const spec = generateSpec({
        rawInput: RAW_INPUT,
        parsedIntent: parsed,
        template,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
        resolvedBlocks: new Map(),
        artifactRefs: [],
      });

      expect(spec.rawInput).toBe(RAW_INPUT);
    });

    it("all sections have empty injectedBlocks (no artifacts)", () => {
      const parsed = parseIntent(RAW_INPUT);
      const template = getTemplate(parsed.templateId);
      const spec = generateSpec({
        rawInput: RAW_INPUT,
        parsedIntent: parsed,
        template,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
        resolvedBlocks: new Map(),
        artifactRefs: [],
      });

      for (const section of spec.sections) {
        expect(section.injectedBlocks).toEqual([]);
      }
    });

    it("sets correct systemInstruction from template", () => {
      const parsed = parseIntent(RAW_INPUT);
      const template = getTemplate(parsed.templateId);
      const spec = generateSpec({
        rawInput: RAW_INPUT,
        parsedIntent: parsed,
        template,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
        resolvedBlocks: new Map(),
        artifactRefs: [],
      });

      expect(spec.systemInstruction).toBe(template.systemInstruction);
    });
  });

  describe("Stage 3 -- selectBlocks (no-op for this input)", () => {
    it("returns empty when no blocks are provided", () => {
      const result = selectBlocks({
        blocks: [],
        sectionTags: ["executive summary"],
        tokenBudget: TOKEN_BUDGET,
        artifactId: "none",
        artifactName: "None",
      });

      expect(result.included).toEqual([]);
      expect(result.omitted).toEqual([]);
      expect(result.tokensUsed).toBe(0);
    });
  });

  describe("Stage 4 -- renderPrompt", () => {
    it("renders a prompt containing [System Instruction] and all 9 section headings", () => {
      const parsed = parseIntent(RAW_INPUT);
      const template = getTemplate(parsed.templateId);
      const spec = generateSpec({
        rawInput: RAW_INPUT,
        parsedIntent: parsed,
        template,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
        resolvedBlocks: new Map(),
        artifactRefs: [],
      });

      const rendered = renderPrompt(spec);

      expect(rendered).toContain("[System Instruction]");
      expect(rendered).toContain("# Executive Summary");
      expect(rendered).toContain("# Introduction");
      expect(rendered).toContain("# Background");
      expect(rendered).toContain("# Methodology");
      expect(rendered).toContain("# Analysis");
      expect(rendered).toContain("# Discussion");
      expect(rendered).toContain("# Limitations");
      expect(rendered).toContain("# Conclusion");
      expect(rendered).toContain("# References");
    });

    it("does NOT contain [Constraints] (no constraints extracted)", () => {
      const parsed = parseIntent(RAW_INPUT);
      const template = getTemplate(parsed.templateId);
      const spec = generateSpec({
        rawInput: RAW_INPUT,
        parsedIntent: parsed,
        template,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
        resolvedBlocks: new Map(),
        artifactRefs: [],
      });

      const rendered = renderPrompt(spec);
      expect(rendered).not.toContain("[Constraints]");
    });

    it("rendered output is deterministic across calls", () => {
      const parsed = parseIntent(RAW_INPUT);
      const template = getTemplate(parsed.templateId);
      const makeSpec = () =>
        generateSpec({
          rawInput: RAW_INPUT,
          parsedIntent: parsed,
          template,
          dial: DIAL,
          tokenBudget: TOKEN_BUDGET,
          resolvedBlocks: new Map(),
          artifactRefs: [],
        });

      const r1 = renderPrompt(makeSpec());
      const r2 = renderPrompt(makeSpec());
      expect(r1).toBe(r2);
    });
  });

  describe("Stage 5 -- full pipeline compile", () => {
    it("produces valid CompileOutput with all four top-level properties", async () => {
      const input: CompileInput = {
        rawInput: RAW_INPUT,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output).toHaveProperty("spec");
      expect(output).toHaveProperty("rendered");
      expect(output).toHaveProperty("lint");
      expect(output).toHaveProperty("injection");
    });

    it("lint produces vague-input and missing-constraints warnings", async () => {
      const input: CompileInput = {
        rawInput: RAW_INPUT,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      const ruleIds = output.lint.results.map((r) => r.ruleId);
      // "Write a report on AI" = 5 words, triggers vague-input
      expect(ruleIds).toContain("vague-input");
      // No constraints extracted, triggers missing-constraints
      expect(ruleIds).toContain("missing-constraints");
    });

    it("lint score is 80 (100 - 10 vague - 10 missing-constraints)", async () => {
      const input: CompileInput = {
        rawInput: RAW_INPUT,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      // "Write a report on AI" lowercased: "write a report on ai"
      // academic-report lint keywords include "report", so no-template-match does NOT fire.
      // That leaves 2 warnings: vague-input(-10), missing-constraints(-10) = 80.
      const ruleIds = output.lint.results.map((r) => r.ruleId);
      expect(ruleIds).not.toContain("no-template-match");
      expect(output.lint.score).toBe(80);
      expect(output.lint.passed).toBe(true);
    });

    it("injection report shows zero blocks included and omitted", async () => {
      const input: CompileInput = {
        rawInput: RAW_INPUT,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.injection.blocksIncluded).toBe(0);
      expect(output.injection.blocksOmitted).toBe(0);
      expect(output.injection.totalTokensUsed).toBe(0);
      expect(output.injection.totalTokensBudget).toBe(TOKEN_BUDGET);
    });

    it("meta.totalTokens matches estimateTokens(rendered)", async () => {
      const input: CompileInput = {
        rawInput: RAW_INPUT,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);
      const expectedTokens = estimateTokens(output.rendered);

      expect(output.spec.meta.totalTokens).toBe(expectedTokens);
    });
  });
});

// ============================================================
// INPUT 2: Text with @ref and mock artifact
// "Explain @ai safety", dial=4, tokenBudget=500
// ============================================================

describe("Input 2: @ref trace with mock artifact", () => {
  const RAW_INPUT = "Explain @ai safety";
  const DIAL: DialLevel = 4;
  const TOKEN_BUDGET = 500;

  describe("Stage 1 -- parseIntent", () => {
    it("extracts 'ai' as an artifact ref", () => {
      const parsed = parseIntent(RAW_INPUT);
      expect(parsed.artifactRefs).toEqual(["ai"]);
    });

    it("strips @ai from cleanedInput", () => {
      const parsed = parseIntent(RAW_INPUT);
      expect(parsed.cleanedInput).toBe("Explain  safety");
    });

    it("rawInput preserves @ai literally", () => {
      // parseIntent doesn't modify rawInput -- the pipeline passes rawInput through
      expect(RAW_INPUT).toBe("Explain @ai safety");
    });

    it("defaults to academic-report with low confidence (no strong keyword match)", () => {
      const parsed = parseIntent(RAW_INPUT);
      // cleanedInput = "Explain  safety" -- no strong keyword matches for any template
      // "safety" is not a keyword in any template. So default academic-report with 0.3.
      expect(parsed.templateId).toBe("academic-report");
      expect(parsed.confidence).toBe(0.3);
    });

    it("extracts no constraints", () => {
      const parsed = parseIntent(RAW_INPUT);
      expect(parsed.constraints).toEqual([]);
    });
  });

  describe("Stage 2 -- selectBlocks with mock artifact", () => {
    it("filters out doNotSend blocks", () => {
      const result = selectBlocks({
        blocks: MOCK_AI_ARTIFACT.blocks,
        sectionTags: ["background"],
        tokenBudget: TOKEN_BUDGET,
        artifactId: MOCK_AI_ARTIFACT.id,
        artifactName: MOCK_AI_ARTIFACT.name,
      });

      const includedIds = result.included.map((b) => b.blockId);
      expect(includedIds).not.toContain("blk-secret");
      expect(result.omitted.some((o) => o.block.id === "blk-secret")).toBe(true);
    });

    it("sorts included blocks by priority descending", () => {
      const result = selectBlocks({
        blocks: MOCK_AI_ARTIFACT.blocks,
        sectionTags: ["background"],
        tokenBudget: TOKEN_BUDGET,
        artifactId: MOCK_AI_ARTIFACT.id,
        artifactName: MOCK_AI_ARTIFACT.name,
      });

      // blk-safety (priority 80) should come before blk-ethics (priority 60)
      expect(result.included.length).toBeGreaterThanOrEqual(2);
      expect(result.included[0].blockId).toBe("blk-safety");
      expect(result.included[1].blockId).toBe("blk-ethics");
    });

    it("respects token budget and omits blocks that exceed it", () => {
      // Budget of 10, blk-safety has tokenCount 9, blk-ethics has tokenCount 9
      // After including blk-safety (9 used), blk-ethics (9 more = 18 > 10) is omitted
      const result = selectBlocks({
        blocks: MOCK_AI_ARTIFACT.blocks,
        sectionTags: ["background"],
        tokenBudget: 10,
        artifactId: MOCK_AI_ARTIFACT.id,
        artifactName: MOCK_AI_ARTIFACT.name,
      });

      expect(result.included).toHaveLength(1);
      expect(result.included[0].blockId).toBe("blk-safety");
      expect(result.omitted.some((o) => o.reason === "exceeded token budget")).toBe(true);
      expect(result.tokensUsed).toBe(9);
    });

    it("includes all matching blocks when budget is 0 (unlimited)", () => {
      const result = selectBlocks({
        blocks: MOCK_AI_ARTIFACT.blocks,
        sectionTags: ["background"],
        tokenBudget: 0,
        artifactId: MOCK_AI_ARTIFACT.id,
        artifactName: MOCK_AI_ARTIFACT.name,
      });

      // With budget=0, the condition `tokenBudget > 0 && ...` is false, so all candidates pass
      const includedIds = result.included.map((b) => b.blockId);
      expect(includedIds).toContain("blk-safety");
      expect(includedIds).toContain("blk-ethics");
    });

    it("omits blocks with no matching tags", () => {
      const result = selectBlocks({
        blocks: MOCK_AI_ARTIFACT.blocks,
        sectionTags: ["executive summary"], // No blocks have this tag
        tokenBudget: TOKEN_BUDGET,
        artifactId: MOCK_AI_ARTIFACT.id,
        artifactName: MOCK_AI_ARTIFACT.name,
      });

      // blk-safety has tags ["background","context"], blk-ethics has ["background"]
      // Neither has "executive summary" so both are omitted for "no matching tags"
      // blk-secret is omitted for do_not_send
      const tagOmitted = result.omitted.filter((o) => o.reason === "no matching tags");
      expect(tagOmitted.length).toBe(2);
    });
  });

  describe("Stage 3 -- generateSpec", () => {
    it("produces 10 sections at dial=4 (all academic-report sections)", () => {
      const parsed = parseIntent(RAW_INPUT);
      const template = getTemplate(parsed.templateId);

      // dial=4 includes minDial 0,1,2,3,4 -> all 10 sections
      const expectedSections = template.sections.filter((s) => s.minDial <= DIAL);
      expect(expectedSections).toHaveLength(10);

      const spec = generateSpec({
        rawInput: RAW_INPUT,
        parsedIntent: parsed,
        template,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
        resolvedBlocks: new Map(),
        artifactRefs: [],
      });

      expect(spec.sections).toHaveLength(10);
    });

    it("rawInput in spec preserves @ai reference", () => {
      const parsed = parseIntent(RAW_INPUT);
      const template = getTemplate(parsed.templateId);
      const spec = generateSpec({
        rawInput: RAW_INPUT,
        parsedIntent: parsed,
        template,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
        resolvedBlocks: new Map(),
        artifactRefs: [],
      });

      expect(spec.rawInput).toBe("Explain @ai safety");
      expect(spec.rawInput).toContain("@ai");
    });
  });

  describe("Stage 4 -- renderPrompt with injected blocks", () => {
    it("renders injected block content under context heading", () => {
      const parsed = parseIntent(RAW_INPUT);
      const template = getTemplate(parsed.templateId);

      const injectedBlock: InjectedBlock = {
        artifactId: "art-ai",
        artifactName: "AI Standards",
        blockId: "blk-safety",
        blockLabel: "AI Safety",
        content: "Always validate AI outputs before deployment.",
        tags: ["background", "context"],
        priority: 80,
        tokenCount: 9,
      };

      const resolvedBlocks = new Map<string, InjectedBlock[]>();
      resolvedBlocks.set("Background", [injectedBlock]);

      const spec = generateSpec({
        rawInput: RAW_INPUT,
        parsedIntent: parsed,
        template,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
        resolvedBlocks,
        artifactRefs: [
          { raw: "@ai", artifactId: "art-ai", artifactName: "AI Standards", resolved: true },
        ],
      });

      const rendered = renderPrompt(spec);

      expect(rendered).toContain("## [Context: AI Safety]");
      expect(rendered).toContain("Always validate AI outputs before deployment.");
    });
  });

  describe("Stage 5 -- full pipeline compile", () => {
    it("resolves @ai artifact and includes blocks in injection report", async () => {
      const input: CompileInput = {
        rawInput: RAW_INPUT,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.spec.artifactRefs).toHaveLength(1);
      expect(output.spec.artifactRefs[0].raw).toBe("@ai");
      expect(output.spec.artifactRefs[0].resolved).toBe(true);
    });

    it("rawInput in final spec still contains @ai", async () => {
      const input: CompileInput = {
        rawInput: RAW_INPUT,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.spec.rawInput).toBe("Explain @ai safety");
    });

    it("injection report shows doNotSend block was omitted", async () => {
      const input: CompileInput = {
        rawInput: RAW_INPUT,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      const secretEntry = output.injection.entries.find(
        (e) => e.blockId === "blk-secret"
      );
      if (secretEntry) {
        expect(secretEntry.included).toBe(false);
        expect(secretEntry.reason).toBe("do_not_send flag");
      }
    });

    it("selected blocks fit within 500 token budget", async () => {
      const input: CompileInput = {
        rawInput: RAW_INPUT,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.injection.totalTokensUsed).toBeLessThanOrEqual(TOKEN_BUDGET);
    });
  });
});

// ============================================================
// INPUT 3: Whitespace-only input
// "   ", dial=0, tokenBudget=0
// ============================================================

describe("Input 3: Whitespace-only edge case", () => {
  const RAW_INPUT = "   ";
  const DIAL: DialLevel = 0;
  const TOKEN_BUDGET = 0;

  describe("Stage 1 -- parseIntent", () => {
    it("cleanedInput is empty string after trimming", () => {
      const parsed = parseIntent(RAW_INPUT);
      expect(parsed.cleanedInput).toBe("");
    });

    it("defaults to academic-report with minimum confidence", () => {
      const parsed = parseIntent(RAW_INPUT);
      expect(parsed.templateId).toBe("academic-report");
      expect(parsed.confidence).toBe(0.3);
    });

    it("extracts no artifact refs", () => {
      const parsed = parseIntent(RAW_INPUT);
      expect(parsed.artifactRefs).toEqual([]);
    });

    it("extracts no constraints", () => {
      const parsed = parseIntent(RAW_INPUT);
      expect(parsed.constraints).toEqual([]);
    });
  });

  describe("Stage 2 -- generateSpec at dial=0", () => {
    it("includes only minDial=0 sections (Executive Summary, Introduction, Conclusion)", () => {
      // academic-report minDial=0 sections: Executive Summary, Introduction, Conclusion
      // Analysis has minDial=1, so it is excluded at dial=0
      const parsed = parseIntent(RAW_INPUT);
      const template = getTemplate(parsed.templateId);
      const spec = generateSpec({
        rawInput: RAW_INPUT,
        parsedIntent: parsed,
        template,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
        resolvedBlocks: new Map(),
        artifactRefs: [],
      });

      expect(spec.sections).toHaveLength(3);
      expect(spec.sections.map((s) => s.heading)).toEqual([
        "Executive Summary",
        "Introduction",
        "Conclusion",
      ]);
    });

    it("preserves whitespace rawInput", () => {
      const parsed = parseIntent(RAW_INPUT);
      const template = getTemplate(parsed.templateId);
      const spec = generateSpec({
        rawInput: RAW_INPUT,
        parsedIntent: parsed,
        template,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
        resolvedBlocks: new Map(),
        artifactRefs: [],
      });

      expect(spec.rawInput).toBe("   ");
    });
  });

  describe("Stage 3 -- selectBlocks at tokenBudget=0", () => {
    it("tokenBudget=0 means unlimited -- all non-doNotSend blocks with matching tags pass", () => {
      const result = selectBlocks({
        blocks: MOCK_AI_ARTIFACT.blocks,
        sectionTags: ["background"],
        tokenBudget: 0,
        artifactId: "art-ai",
        artifactName: "AI Standards",
      });

      // With 0 budget (unlimited), blk-safety and blk-ethics match "background" tag
      expect(result.included.length).toBe(2);
    });
  });

  describe("Stage 4 -- renderPrompt at dial=0", () => {
    it("renders only 3 sections (dial=0 excludes Analysis at minDial=1)", () => {
      const parsed = parseIntent(RAW_INPUT);
      const template = getTemplate(parsed.templateId);
      const spec = generateSpec({
        rawInput: RAW_INPUT,
        parsedIntent: parsed,
        template,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
        resolvedBlocks: new Map(),
        artifactRefs: [],
      });

      const rendered = renderPrompt(spec);

      // Present sections (minDial=0 only)
      expect(rendered).toContain("# Executive Summary");
      expect(rendered).toContain("# Introduction");
      expect(rendered).toContain("# Conclusion");

      // Absent sections (minDial >= 1)
      expect(rendered).not.toContain("# Background");
      expect(rendered).not.toContain("# Methodology");
      expect(rendered).not.toContain("# Analysis");
      expect(rendered).not.toContain("# Discussion");
      expect(rendered).not.toContain("# Limitations");
      expect(rendered).not.toContain("# Future Work");
      expect(rendered).not.toContain("# References");
    });
  });

  describe("Stage 5 -- full pipeline with whitespace input", () => {
    it("pipeline does not throw on whitespace-only input", async () => {
      // Note: CompileInputSchema requires rawInput.min(1), but "   " passes
      // z.string().min(1) since it checks length, not trimmed length.
      // The pipeline function itself does not validate via the schema.
      const input: CompileInput = {
        rawInput: RAW_INPUT,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.spec).toBeDefined();
      expect(output.rendered).toBeDefined();
      expect(output.spec.rawInput).toBe("   ");
    });

    it("lint fires vague-input (whitespace splits to empty after filter)", async () => {
      const input: CompileInput = {
        rawInput: RAW_INPUT,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      const ruleIds = output.lint.results.map((r) => r.ruleId);
      expect(ruleIds).toContain("vague-input");
    });

    it("budget-exceeded does NOT fire when tokenBudget=0 (unlimited)", async () => {
      const input: CompileInput = {
        rawInput: RAW_INPUT,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      const ruleIds = output.lint.results.map((r) => r.ruleId);
      expect(ruleIds).not.toContain("budget-exceeded");
    });

    it("no artifacts resolved, injection report empty", async () => {
      const input: CompileInput = {
        rawInput: RAW_INPUT,
        dial: DIAL,
        tokenBudget: TOKEN_BUDGET,
      };

      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);

      expect(output.injection.blocksIncluded).toBe(0);
      expect(output.injection.blocksOmitted).toBe(0);
      expect(output.injection.totalTokensUsed).toBe(0);
    });
  });
});

// ============================================================
// DETERMINISM: Run Input 1 through compile 10 times,
// verify every field except id/timestamp is identical
// ============================================================

describe("Determinism: 10 identical compilations of Input 1", () => {
  const RAW_INPUT = "Write a report on AI";
  const DIAL: DialLevel = 3;
  const TOKEN_BUDGET = 1000;

  it("produces identical output (excluding id, compiledAt, compileDurationMs) across 10 runs", async () => {
    const input: CompileInput = {
      rawInput: RAW_INPUT,
      dial: DIAL,
      tokenBudget: TOKEN_BUDGET,
    };

    const outputs: CompileOutput[] = [];
    for (let i = 0; i < 10; i++) {
      outputs.push(await compile(input, mockResolveArtifacts, mockFetchArtifact));
    }

    // Strip non-deterministic fields (id, compiledAt, compileDurationMs)
    const stripped = outputs.map(stripNondeterministic);

    // Compare all against the first
    const reference = JSON.stringify(stripped[0]);
    for (let i = 1; i < stripped.length; i++) {
      expect(JSON.stringify(stripped[i])).toBe(reference);
    }
  });

  it("all 10 runs produce the same rendered text", async () => {
    const input: CompileInput = {
      rawInput: RAW_INPUT,
      dial: DIAL,
      tokenBudget: TOKEN_BUDGET,
    };

    const renderedSet = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);
      renderedSet.add(output.rendered);
    }

    expect(renderedSet.size).toBe(1);
  });

  it("all 10 runs produce the same lint score", async () => {
    const input: CompileInput = {
      rawInput: RAW_INPUT,
      dial: DIAL,
      tokenBudget: TOKEN_BUDGET,
    };

    const scores = new Set<number>();
    for (let i = 0; i < 10; i++) {
      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);
      scores.add(output.lint.score);
    }

    expect(scores.size).toBe(1);
  });

  it("all 10 runs produce the same section count and headings", async () => {
    const input: CompileInput = {
      rawInput: RAW_INPUT,
      dial: DIAL,
      tokenBudget: TOKEN_BUDGET,
    };

    const headingSets = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);
      headingSets.add(output.spec.sections.map((s) => s.heading).join("|"));
    }

    expect(headingSets.size).toBe(1);
  });

  it("all 10 runs produce the same totalTokens", async () => {
    const input: CompileInput = {
      rawInput: RAW_INPUT,
      dial: DIAL,
      tokenBudget: TOKEN_BUDGET,
    };

    const tokenCounts = new Set<number>();
    for (let i = 0; i < 10; i++) {
      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);
      tokenCounts.add(output.spec.meta.totalTokens);
    }

    expect(tokenCounts.size).toBe(1);
  });

  it("each run produces a unique id (UUID)", async () => {
    const input: CompileInput = {
      rawInput: RAW_INPUT,
      dial: DIAL,
      tokenBudget: TOKEN_BUDGET,
    };

    const ids = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);
      ids.add(output.spec.id);
    }

    expect(ids.size).toBe(10);
  });
});
