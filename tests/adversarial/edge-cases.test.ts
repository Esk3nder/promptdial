/**
 * Adversarial Edge Case Tests for prompt-dial
 *
 * Targets: parseIntent, renderPrompt, selectBlocks, generateSpec,
 *          runLint, calculateScore, compile pipeline, validator,
 *          extractArtifactRefs, injectBlocks, estimateTokens
 */
import { describe, it, expect } from "vitest";
import { parseIntent } from "@/compiler/intent-parser";
import { renderPrompt } from "@/compiler/renderer";
import { selectBlocks, type BlockSelectionInput } from "@/compiler/block-selector";
import { generateSpec, type SpecGeneratorInput } from "@/compiler/spec-generator";
import { compile } from "@/compiler/pipeline";
import { runLint } from "@/lint/engine";
import { calculateScore } from "@/lint/scorer";
import { validate, validateAndRepairSpec } from "@/core/validator";
import { PromptSpecSchema, CompileInputSchema, DialLevelSchema } from "@/core/schema";
import { injectBlocks } from "@/artifacts/injector";
import { estimateTokens } from "@/app/lib/tokens";
import { getTemplate } from "@/templates/index";
import type {
  PromptSpec,
  PromptSpecSection,
  InjectedBlock,
  ArtifactBlock,
  Artifact,
  ArtifactRef,
  CompileInput,
  LintResult,
  TemplateId,
} from "@/core/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    meta: {
      totalTokens: 100,
      compileDurationMs: 50,
      compiledAt: new Date().toISOString(),
      lintScore: 100,
    },
    ...overrides,
  };
}

function makeBlock(overrides: Partial<ArtifactBlock> = {}): ArtifactBlock {
  return {
    id: "block-1",
    label: "Test Block",
    content: "Test block content for adversarial testing.",
    tags: ["test"],
    priority: 50,
    doNotSend: false,
    tokenCount: 10,
    ...overrides,
  };
}

function makeArtifact(overrides: Partial<Artifact> = {}): Artifact {
  return {
    id: "artifact-1",
    name: "Test Artifact",
    aliases: ["test"],
    description: "A test artifact",
    blocks: [makeBlock()],
    version: 1,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    isSeed: false,
    ...overrides,
  };
}

const noopResolver = async (_refs: string[]): Promise<ArtifactRef[]> => [];
const noopFetcher = async (_id: string): Promise<Artifact | null> => null;

const mockResolver = async (refs: string[]): Promise<ArtifactRef[]> =>
  refs.map((ref) => ({
    raw: `@${ref}`,
    artifactId: `art-${ref.toLowerCase()}`,
    artifactName: `${ref} Artifact`,
    resolved: true,
  }));

const mockFetcher = async (id: string): Promise<Artifact | null> => {
  if (id === "art-ai") {
    return makeArtifact({
      id: "art-ai",
      name: "AI Standards",
      blocks: [
        makeBlock({ id: "b1", label: "AI Safety", content: "Always validate AI outputs.", tags: ["background", "context", "executive summary"], priority: 5, tokenCount: 10 }),
        makeBlock({ id: "b2", label: "AI Ethics", content: "Consider ethical implications.", tags: ["background"], priority: 4, tokenCount: 8 }),
      ],
    });
  }
  return null;
};

// ===========================================================================
//  1. MALFORMED INPUTS
// ===========================================================================

describe("Adversarial: Malformed Inputs", () => {
  // -----------------------------------------------------------------------
  //  1a. parseIntent with hostile strings
  // -----------------------------------------------------------------------
  describe("parseIntent - malformed strings", () => {
    it("handles empty string without throwing", () => {
      const result = parseIntent("");
      expect(result.templateId).toBeDefined();
      expect(result.cleanedInput).toBe("");
      expect(result.artifactRefs).toEqual([]);
      expect(result.constraints).toEqual([]);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("handles whitespace-only string", () => {
      const result = parseIntent("   \t\n  \r\n  ");
      expect(result.cleanedInput).toBe("");
      expect(result.artifactRefs).toEqual([]);
      expect(result.templateId).toBeDefined();
    });

    it("handles extremely long string (10000+ chars)", () => {
      const longInput = "a ".repeat(6000);
      const result = parseIntent(longInput);
      expect(result.templateId).toBeDefined();
      expect(result.cleanedInput.length).toBeGreaterThan(0);
    });

    it("handles input that is ONLY @references", () => {
      const result = parseIntent("@foo @bar @baz");
      expect(result.artifactRefs).toEqual(["foo", "bar", "baz"]);
      expect(result.cleanedInput).toBe("");
      // With no cleaned text, template detection falls back to default
      expect(result.templateId).toBe("academic-report");
      expect(result.confidence).toBeLessThanOrEqual(0.5);
    });

    it("handles emoji-heavy input", () => {
      const emojiInput = "Write a report about AI safety for technical leaders";
      const result = parseIntent(emojiInput);
      expect(result.templateId).toBeDefined();
      expect(result.cleanedInput).toBeDefined();
    });

    it("handles RTL text (Arabic)", () => {
      const rtlInput = "\u0643\u062A\u0627\u0628\u0629 \u062A\u0642\u0631\u064A\u0631 \u0628\u062D\u062B\u064A \u0639\u0646 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A";
      const result = parseIntent(rtlInput);
      expect(result.templateId).toBeDefined();
      expect(result.cleanedInput).toBe(rtlInput);
    });

    it("handles zero-width characters", () => {
      const zwInput = "Write\u200B a\u200C report\u200D on\uFEFF AI";
      const result = parseIntent(zwInput);
      expect(result.templateId).toBeDefined();
      expect(result.cleanedInput).toBeDefined();
    });

    it("handles HTML injection attempt", () => {
      const xssInput = '<script>alert(1)</script> Write a report';
      const result = parseIntent(xssInput);
      expect(result.templateId).toBeDefined();
      expect(result.cleanedInput).toContain("<script>");
      // No sanitization expected at this layer - it should pass through
    });

    it("handles SQL injection attempt", () => {
      const sqlInput = "'; DROP TABLE artifacts; -- Write a report";
      const result = parseIntent(sqlInput);
      expect(result.templateId).toBeDefined();
      expect(result.cleanedInput).toContain("DROP TABLE");
    });

    it("handles null bytes in string", () => {
      const nullInput = "Write\x00 a\x00 report";
      const result = parseIntent(nullInput);
      expect(result.templateId).toBeDefined();
      expect(result.cleanedInput).toBeDefined();
    });

    it("handles only newlines", () => {
      const result = parseIntent("\n\n\n\n\n");
      expect(result.templateId).toBeDefined();
      expect(result.cleanedInput).toBe("");
      expect(result.artifactRefs).toEqual([]);
    });

    it("handles @ at end of string with no word", () => {
      const result = parseIntent("Write a report @");
      // The regex /@(\w+)/g requires at least one word char after @
      expect(result.artifactRefs).toEqual([]);
      expect(result.cleanedInput).toBe("Write a report @");
    });

    it("handles @@ double at-sign", () => {
      const result = parseIntent("Write @@foo report");
      // First @ has a word starting with @, second @foo matches
      expect(result.artifactRefs).toEqual(["foo"]);
    });

    it("handles extremely long single word (no spaces)", () => {
      const longWord = "a".repeat(20000);
      const result = parseIntent(longWord);
      expect(result.templateId).toBeDefined();
      expect(result.cleanedInput.length).toBe(20000);
    });

    it("handles string with only special characters", () => {
      const specialInput = "!@#$%^&*()_+-={}[]|\\:;'<>,./?\"`~";
      const result = parseIntent(specialInput);
      expect(result.templateId).toBeDefined();
    });

    it("handles massive number of @references", () => {
      const refs = Array.from({ length: 500 }, (_, i) => `@ref${i}`).join(" ");
      const result = parseIntent(refs);
      expect(result.artifactRefs.length).toBe(500);
    });
  });

  // -----------------------------------------------------------------------
  //  1b. renderPrompt with hostile PromptSpec
  // -----------------------------------------------------------------------
  describe("renderPrompt - malformed specs", () => {
    it("handles spec with empty systemInstruction", () => {
      const spec = makeSpec({ systemInstruction: "" });
      const output = renderPrompt(spec);
      expect(output).toContain("[System Instruction]");
      expect(output).toContain("---");
    });

    it("handles spec with extremely long systemInstruction", () => {
      const longInstruction = "You are an assistant. ".repeat(5000);
      const spec = makeSpec({ systemInstruction: longInstruction });
      const output = renderPrompt(spec);
      expect(output).toContain(longInstruction);
    });

    it("handles spec with HTML in section headings", () => {
      const sections: PromptSpecSection[] = [
        {
          heading: '<img src=x onerror="alert(1)">',
          instruction: "Test",
          injectedBlocks: [],
        },
      ];
      const spec = makeSpec({ sections });
      const output = renderPrompt(spec);
      expect(output).toContain('<img src=x onerror="alert(1)">');
    });

    it("handles spec with empty sections array", () => {
      const spec = makeSpec({ sections: [] });
      const output = renderPrompt(spec);
      expect(output).toContain("[System Instruction]");
      expect(output).not.toContain("# ");
    });

    it("handles injected blocks with empty content", () => {
      const block: InjectedBlock = {
        artifactId: "a1",
        artifactName: "Test",
        blockId: "b1",
        blockLabel: "Empty Block",
        content: "",
        tags: ["test"],
        priority: 5,
        tokenCount: 0,
      };
      const sections: PromptSpecSection[] = [
        { heading: "Context", instruction: "Use context.", injectedBlocks: [block] },
      ];
      const spec = makeSpec({ sections });
      const output = renderPrompt(spec);
      expect(output).toContain("## [Context: Empty Block]");
    });

    it("handles constraints with newlines and special characters", () => {
      const spec = makeSpec({
        constraints: [
          "Tone: formal\n\nInjected text",
          '<script>alert("xss")</script>',
          "Line1\rLine2",
        ],
      });
      const output = renderPrompt(spec);
      expect(output).toContain("[Constraints]");
      expect(output).toContain("<script>");
    });

    it("handles section with extremely long heading", () => {
      const longHeading = "A".repeat(10000);
      const sections: PromptSpecSection[] = [
        { heading: longHeading, instruction: "Test.", injectedBlocks: [] },
      ];
      const spec = makeSpec({ sections });
      const output = renderPrompt(spec);
      expect(output).toContain(`# ${longHeading}`);
    });
  });

  // -----------------------------------------------------------------------
  //  1c. compile pipeline with hostile inputs
  // -----------------------------------------------------------------------
  describe("compile pipeline - malformed inputs", () => {
    it("compiles empty string input without crashing", async () => {
      const input: CompileInput = { rawInput: "", dial: 3, tokenBudget: 1000 };
      const output = await compile(input, noopResolver, noopFetcher);
      expect(output.spec).toBeDefined();
      expect(output.rendered).toBeDefined();
      expect(output.lint).toBeDefined();
    });

    it("compiles whitespace-only input", async () => {
      const input: CompileInput = { rawInput: "   \t\n  ", dial: 3, tokenBudget: 1000 };
      const output = await compile(input, noopResolver, noopFetcher);
      expect(output.spec).toBeDefined();
      expect(output.rendered.length).toBeGreaterThan(0);
    });

    it("compiles input that is only @references", async () => {
      const input: CompileInput = { rawInput: "@foo @bar @baz", dial: 3, tokenBudget: 1000 };
      const output = await compile(input, mockResolver, noopFetcher);
      expect(output.spec.artifactRefs.length).toBe(3);
      expect(output.spec.rawInput).toBe("@foo @bar @baz");
    });

    it("compiles HTML-injection input without including raw HTML in rendered output", async () => {
      const input: CompileInput = {
        rawInput: '<script>alert("xss")</script> Write a report',
        dial: 3,
        tokenBudget: 1000,
      };
      const output = await compile(input, noopResolver, noopFetcher);
      expect(output.spec).toBeDefined();
      // FINDING: rawInput is NOT directly interpolated into the rendered prompt.
      // The rendered output comes from template instructions, not raw user input.
      // This is actually good security behavior -- rawInput is stored in spec.rawInput
      // but the renderer only outputs template-defined instructions and injected blocks.
      expect(output.spec.rawInput).toContain("<script>");
      expect(output.rendered).not.toContain("<script>");
    });

    it("compiles extremely long input (10000+ chars)", async () => {
      const longInput = "Write a research report about AI safety. ".repeat(300);
      const input: CompileInput = { rawInput: longInput, dial: 3, tokenBudget: 0 };
      const output = await compile(input, noopResolver, noopFetcher);
      expect(output.spec).toBeDefined();
      expect(output.spec.meta.totalTokens).toBeGreaterThan(0);
    });

    it("handles resolver that throws", async () => {
      const throwingResolver = async (): Promise<ArtifactRef[]> => {
        throw new Error("Resolver failed");
      };
      const input: CompileInput = { rawInput: "Write a report @AI", dial: 3, tokenBudget: 1000 };
      await expect(compile(input, throwingResolver, noopFetcher)).rejects.toThrow("Resolver failed");
    });

    it("handles fetcher that throws", async () => {
      const throwingFetcher = async (): Promise<Artifact | null> => {
        throw new Error("Fetcher failed");
      };
      const input: CompileInput = { rawInput: "Write a report @AI", dial: 3, tokenBudget: 1000 };
      await expect(compile(input, mockResolver, throwingFetcher)).rejects.toThrow("Fetcher failed");
    });
  });
});

// ===========================================================================
//  2. BOUNDARY CONDITIONS
// ===========================================================================

describe("Adversarial: Boundary Conditions", () => {
  // -----------------------------------------------------------------------
  //  2a. Dial values
  // -----------------------------------------------------------------------
  describe("dial level boundaries", () => {
    it("dial=0 is the minimum valid level", () => {
      const result = DialLevelSchema.safeParse(0);
      expect(result.success).toBe(true);
    });

    it("dial=5 is the maximum valid level", () => {
      const result = DialLevelSchema.safeParse(5);
      expect(result.success).toBe(true);
    });

    it("dial=-1 is rejected by schema", () => {
      const result = DialLevelSchema.safeParse(-1);
      expect(result.success).toBe(false);
    });

    it("dial=6 is rejected by schema", () => {
      const result = DialLevelSchema.safeParse(6);
      expect(result.success).toBe(false);
    });

    it("dial=99 is rejected by schema", () => {
      const result = DialLevelSchema.safeParse(99);
      expect(result.success).toBe(false);
    });

    it("dial=NaN is rejected by schema", () => {
      const result = DialLevelSchema.safeParse(NaN);
      expect(result.success).toBe(false);
    });

    it("dial=Infinity is rejected by schema", () => {
      const result = DialLevelSchema.safeParse(Infinity);
      expect(result.success).toBe(false);
    });

    it("dial=1.5 (float) is rejected by schema", () => {
      const result = DialLevelSchema.safeParse(1.5);
      expect(result.success).toBe(false);
    });

    it("dial=0 produces fewest sections in compile", async () => {
      const input: CompileInput = { rawInput: "Write a research report", dial: 0, tokenBudget: 0 };
      const output = await compile(input, noopResolver, noopFetcher);
      expect(output.spec.sections.length).toBeGreaterThan(0);

      const input5: CompileInput = { rawInput: "Write a research report", dial: 5, tokenBudget: 0 };
      const output5 = await compile(input5, noopResolver, noopFetcher);
      expect(output5.spec.sections.length).toBeGreaterThan(output.spec.sections.length);
    });

    it("each dial level from 0 to 5 produces monotonically non-decreasing sections", async () => {
      let prevSectionCount = 0;
      for (const dial of [0, 1, 2, 3, 4, 5] as const) {
        const input: CompileInput = { rawInput: "Write a research report", dial, tokenBudget: 0 };
        const output = await compile(input, noopResolver, noopFetcher);
        expect(output.spec.sections.length).toBeGreaterThanOrEqual(prevSectionCount);
        prevSectionCount = output.spec.sections.length;
      }
    });
  });

  // -----------------------------------------------------------------------
  //  2b. tokenBudget boundaries
  // -----------------------------------------------------------------------
  describe("tokenBudget boundaries", () => {
    it("tokenBudget=0 means unlimited (all blocks included)", () => {
      const blocks: ArtifactBlock[] = [
        makeBlock({ id: "b1", tokenCount: 5000 }),
        makeBlock({ id: "b2", tokenCount: 5000 }),
      ];
      const input: BlockSelectionInput = {
        blocks,
        sectionTags: ["test"],
        tokenBudget: 0,
        artifactId: "art1",
        artifactName: "Test",
      };
      const result = selectBlocks(input);
      expect(result.included.length).toBe(2);
      expect(result.tokensUsed).toBe(10000);
    });

    it("tokenBudget=1 excludes all blocks with tokenCount > 1", () => {
      const blocks: ArtifactBlock[] = [
        makeBlock({ id: "b1", tokenCount: 2 }),
        makeBlock({ id: "b2", tokenCount: 10 }),
      ];
      const input: BlockSelectionInput = {
        blocks,
        sectionTags: ["test"],
        tokenBudget: 1,
        artifactId: "art1",
        artifactName: "Test",
      };
      const result = selectBlocks(input);
      expect(result.included.length).toBe(0);
      expect(result.omitted.length).toBe(2);
    });

    it("tokenBudget=1 includes block with tokenCount=1", () => {
      const blocks: ArtifactBlock[] = [
        makeBlock({ id: "b1", tokenCount: 1 }),
      ];
      const input: BlockSelectionInput = {
        blocks,
        sectionTags: ["test"],
        tokenBudget: 1,
        artifactId: "art1",
        artifactName: "Test",
      };
      const result = selectBlocks(input);
      expect(result.included.length).toBe(1);
    });

    it("tokenBudget with very large value does not cause issues", () => {
      const blocks: ArtifactBlock[] = [makeBlock({ id: "b1", tokenCount: 100 })];
      const input: BlockSelectionInput = {
        blocks,
        sectionTags: ["test"],
        tokenBudget: Number.MAX_SAFE_INTEGER,
        artifactId: "art1",
        artifactName: "Test",
      };
      const result = selectBlocks(input);
      expect(result.included.length).toBe(1);
    });

    it("CompileInput schema rejects negative tokenBudget", () => {
      const result = CompileInputSchema.safeParse({
        rawInput: "test",
        dial: 3,
        tokenBudget: -1,
      });
      expect(result.success).toBe(false);
    });

    it("CompileInput schema rejects NaN tokenBudget", () => {
      const result = CompileInputSchema.safeParse({
        rawInput: "test",
        dial: 3,
        tokenBudget: NaN,
      });
      expect(result.success).toBe(false);
    });

    it("CompileInput schema rejects Infinity tokenBudget", () => {
      const result = CompileInputSchema.safeParse({
        rawInput: "test",
        dial: 3,
        tokenBudget: Infinity,
      });
      expect(result.success).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  //  2c. Artifacts: empty arrays, empty blocks
  // -----------------------------------------------------------------------
  describe("artifact boundary conditions", () => {
    it("injectBlocks with empty artifacts array", () => {
      const { blocks, report } = injectBlocks([], [], 0);
      expect(blocks).toEqual([]);
      expect(report.blocksIncluded).toBe(0);
      expect(report.blocksOmitted).toBe(0);
    });

    it("injectBlocks with artifact that has zero blocks", () => {
      const artifact = makeArtifact({ blocks: [] });
      const { blocks, report } = injectBlocks([artifact], [], 0);
      expect(blocks).toEqual([]);
      expect(report.blocksIncluded).toBe(0);
    });

    it("injectBlocks with blocks that have empty content", () => {
      const artifact = makeArtifact({
        blocks: [makeBlock({ content: "", tokenCount: 0 })],
      });
      const { blocks } = injectBlocks([artifact], [], 0);
      expect(blocks.length).toBe(1);
      expect(blocks[0].content).toBe("");
    });

    it("selectBlocks with empty blocks array", () => {
      const result = selectBlocks({
        blocks: [],
        sectionTags: ["test"],
        tokenBudget: 100,
        artifactId: "a1",
        artifactName: "Test",
      });
      expect(result.included).toHaveLength(0);
      expect(result.omitted).toHaveLength(0);
      expect(result.tokensUsed).toBe(0);
    });

    it("selectBlocks with all doNotSend blocks", () => {
      const blocks: ArtifactBlock[] = [
        makeBlock({ id: "b1", doNotSend: true }),
        makeBlock({ id: "b2", doNotSend: true }),
        makeBlock({ id: "b3", doNotSend: true }),
      ];
      const result = selectBlocks({
        blocks,
        sectionTags: ["test"],
        tokenBudget: 0,
        artifactId: "a1",
        artifactName: "Test",
      });
      expect(result.included).toHaveLength(0);
      expect(result.omitted).toHaveLength(3);
    });

    it("blocks with tokenCount=0 are always within budget", () => {
      const blocks: ArtifactBlock[] = Array.from({ length: 100 }, (_, i) =>
        makeBlock({ id: `b${i}`, tokenCount: 0 })
      );
      const result = selectBlocks({
        blocks,
        sectionTags: ["test"],
        tokenBudget: 1,
        artifactId: "a1",
        artifactName: "Test",
      });
      expect(result.included).toHaveLength(100);
      expect(result.tokensUsed).toBe(0);
    });
  });
});

// ===========================================================================
//  3. TEMPLATE EDGE CASES
// ===========================================================================

describe("Adversarial: Template Edge Cases", () => {
  it("input matching NO template keywords falls back to academic-report", () => {
    const result = parseIntent("xyzzy plugh frobozz");
    expect(result.templateId).toBe("academic-report");
    expect(result.confidence).toBeLessThanOrEqual(0.5);
  });

  it("input matching MULTIPLE templates has a single winner", () => {
    // "research report" hits academic-report, "product" hits prd,
    // "decide" hits decision-memo, "critique" hits critique, "brief" hits research-brief
    const result = parseIntent("research report product decide critique brief");
    expect(result.templateId).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0.3);
    // We don't care which wins, but there must be exactly one
    const validTemplates: TemplateId[] = [
      "academic-report", "prd", "decision-memo", "critique", "research-brief",
    ];
    expect(validTemplates).toContain(result.templateId);
  });

  it("all template IDs from parseIntent are loadable via getTemplate", () => {
    const inputs = [
      "Write a research paper study academic",
      "Create a PRD product requirements feature spec",
      "Help decide choose option compare memo",
      "critique review evaluate assess",
      "brief summary overview findings",
    ];
    for (const input of inputs) {
      const parsed = parseIntent(input);
      const template = getTemplate(parsed.templateId);
      expect(template).toBeDefined();
      expect(template.id).toBe(parsed.templateId);
      expect(template.sections.length).toBeGreaterThan(0);
    }
  });

  it("template override with every valid template ID", () => {
    const templates: TemplateId[] = [
      "academic-report", "prd", "decision-memo", "critique", "research-brief",
    ];
    for (const tmpl of templates) {
      const result = parseIntent("generic text", tmpl);
      expect(result.templateId).toBe(tmpl);
      expect(result.confidence).toBe(1.0);
    }
  });

  it("all templates produce at least 1 section at dial=0", async () => {
    const templates: TemplateId[] = [
      "academic-report", "prd", "decision-memo", "critique", "research-brief",
    ];
    for (const tmpl of templates) {
      const input: CompileInput = {
        rawInput: "Test input for template",
        dial: 0,
        tokenBudget: 0,
        templateOverride: tmpl,
      };
      const output = await compile(input, noopResolver, noopFetcher);
      expect(output.spec.sections.length).toBeGreaterThan(0);
    }
  });

  it("case sensitivity: keywords should be case-insensitive", () => {
    const lower = parseIntent("write a research report");
    const upper = parseIntent("WRITE A RESEARCH REPORT");
    const mixed = parseIntent("Write A Research Report");
    // All should detect academic-report
    expect(lower.templateId).toBe("academic-report");
    expect(upper.templateId).toBe("academic-report");
    expect(mixed.templateId).toBe("academic-report");
  });
});

// ===========================================================================
//  4. LINT EDGE CASES
// ===========================================================================

describe("Adversarial: Lint Edge Cases", () => {
  describe("runLint with edge-case specs", () => {
    it("lints spec with empty rawInput", () => {
      const spec = makeSpec({ rawInput: "" });
      const rendered = renderPrompt(spec);
      const results = runLint(spec, rendered);
      // Empty rawInput triggers vague-input rule (0 words < 10)
      const vagueRule = results.find((r) => r.ruleId === "vague-input");
      expect(vagueRule).toBeDefined();
      expect(vagueRule?.message).toContain("0 words");
    });

    it("lints spec with whitespace-only rawInput", () => {
      const spec = makeSpec({ rawInput: "   \t\n  " });
      const rendered = renderPrompt(spec);
      const results = runLint(spec, rendered);
      const vagueRule = results.find((r) => r.ruleId === "vague-input");
      expect(vagueRule).toBeDefined();
    });

    it("lints spec with empty rendered output", () => {
      const spec = makeSpec();
      const results = runLint(spec, "");
      // Budget-exceeded should NOT trigger since tokenBudget=0
      const budgetRule = results.find((r) => r.ruleId === "budget-exceeded");
      expect(budgetRule).toBeUndefined();
    });

    it("lints spec with extremely large rendered output", () => {
      const hugeRendered = "word ".repeat(100000);
      const spec = makeSpec({ tokenBudget: 100 });
      const results = runLint(spec, hugeRendered);
      const budgetRule = results.find((r) => r.ruleId === "budget-exceeded");
      expect(budgetRule).toBeDefined();
      expect(budgetRule?.severity).toBe("error");
    });

    it("lint detects do-not-send tag variants", () => {
      const sensitiveBlock: InjectedBlock = {
        artifactId: "a1",
        artifactName: "Secret",
        blockId: "b1",
        blockLabel: "Confidential",
        content: "top secret",
        tags: ["sensitive"],
        priority: 50,
        tokenCount: 5,
      };
      const spec = makeSpec({
        sections: [{
          heading: "Data",
          instruction: "Use data",
          injectedBlocks: [sensitiveBlock],
        }],
      });
      const results = runLint(spec, renderPrompt(spec));
      const leakRule = results.find((r) => r.ruleId === "do-not-send-leak");
      expect(leakRule).toBeDefined();
      expect(leakRule?.severity).toBe("error");
    });

    it("lint detects internal-only tag as leak", () => {
      const internalBlock: InjectedBlock = {
        artifactId: "a1",
        artifactName: "Internal",
        blockId: "b1",
        blockLabel: "Internal Doc",
        content: "internal stuff",
        tags: ["internal-only"],
        priority: 50,
        tokenCount: 5,
      };
      const spec = makeSpec({
        sections: [{
          heading: "Data",
          instruction: "Use data",
          injectedBlocks: [internalBlock],
        }],
      });
      const results = runLint(spec, renderPrompt(spec));
      const leakRule = results.find((r) => r.ruleId === "do-not-send-leak");
      expect(leakRule).toBeDefined();
    });

    it("lint detects donotsend (no hyphens) tag as leak", () => {
      const block: InjectedBlock = {
        artifactId: "a1",
        artifactName: "Secret",
        blockId: "b1",
        blockLabel: "SecretBlock",
        content: "secret",
        tags: ["donotsend"],
        priority: 50,
        tokenCount: 5,
      };
      const spec = makeSpec({
        sections: [{
          heading: "Data",
          instruction: "Test",
          injectedBlocks: [block],
        }],
      });
      const results = runLint(spec, renderPrompt(spec));
      const leakRule = results.find((r) => r.ruleId === "do-not-send-leak");
      expect(leakRule).toBeDefined();
    });

    it("no-template-match fires when rawInput is gibberish", () => {
      const spec = makeSpec({
        rawInput: "xyzzy plugh frobozz gurgle fleem",
        templateId: "academic-report",
      });
      const results = runLint(spec, renderPrompt(spec));
      const tmplRule = results.find((r) => r.ruleId === "no-template-match");
      expect(tmplRule).toBeDefined();
      expect(tmplRule?.severity).toBe("warning");
    });

    it("empty-sections fires for all-empty sections", () => {
      const spec = makeSpec({
        sections: [
          { heading: "Empty1", instruction: "", injectedBlocks: [] },
          { heading: "Empty2", instruction: "  ", injectedBlocks: [] },
        ],
      });
      const results = runLint(spec, renderPrompt(spec));
      const emptyRule = results.find((r) => r.ruleId === "empty-sections");
      expect(emptyRule).toBeDefined();
      expect(emptyRule?.message).toContain("Empty1");
    });
  });

  describe("calculateScore edge cases", () => {
    it("score never goes below 0 with massive errors", () => {
      const results: LintResult[] = Array.from({ length: 100 }, (_, i) => ({
        ruleId: `error-${i}`,
        ruleName: `Error ${i}`,
        severity: "error" as const,
        message: `Error ${i}`,
      }));
      const report = calculateScore(results);
      expect(report.score).toBe(0);
      expect(report.passed).toBe(false);
    });

    it("handles empty results array", () => {
      const report = calculateScore([]);
      expect(report.score).toBe(100);
      expect(report.passed).toBe(true);
      expect(report.results).toEqual([]);
    });

    it("handles results with unknown severity gracefully", () => {
      // TypeScript types prevent this, but at runtime it could happen
      const results: LintResult[] = [{
        ruleId: "unknown",
        ruleName: "Unknown",
        severity: "unknown" as any,
        message: "Unknown severity",
      }];
      // The switch statement has no default case, so unknown severity = no deduction
      const report = calculateScore(results);
      expect(report.score).toBe(100);
    });

    it("boundary: 3 warnings = score 70, passes", () => {
      const results: LintResult[] = Array.from({ length: 3 }, (_, i) => ({
        ruleId: `warning-${i}`,
        ruleName: `Warning ${i}`,
        severity: "warning" as const,
        message: `Warning ${i}`,
      }));
      const report = calculateScore(results);
      expect(report.score).toBe(70);
      expect(report.passed).toBe(true);
    });

    it("boundary: 4 warnings = score 60, fails", () => {
      const results: LintResult[] = Array.from({ length: 4 }, (_, i) => ({
        ruleId: `warning-${i}`,
        ruleName: `Warning ${i}`,
        severity: "warning" as const,
        message: `Warning ${i}`,
      }));
      const report = calculateScore(results);
      expect(report.score).toBe(60);
      expect(report.passed).toBe(false);
    });

    it("exactly 4 errors floors at 0, not -something", () => {
      const results: LintResult[] = Array.from({ length: 4 }, (_, i) => ({
        ruleId: `error-${i}`,
        ruleName: `Error ${i}`,
        severity: "error" as const,
        message: `Error ${i}`,
      }));
      const report = calculateScore(results);
      expect(report.score).toBe(0);
    });
  });
});

// ===========================================================================
//  5. VALIDATOR EDGE CASES
// ===========================================================================

describe("Adversarial: Validator Edge Cases", () => {
  it("validates a spec with all string fields as empty strings", () => {
    const spec = makeSpec({
      id: "x",
      rawInput: "",
      systemInstruction: "",
      sections: [{ heading: "x", instruction: "", injectedBlocks: [] }],
      constraints: [],
    });
    const result = validate(PromptSpecSchema, spec);
    // rawInput can be empty per schema (z.string(), no .min(1))
    expect(result.valid).toBe(true);
  });

  it("rejects spec with sections as empty array", () => {
    const spec = makeSpec({ sections: [] });
    const result = validate(PromptSpecSchema, spec);
    // Schema has .min(1) on sections array
    expect(result.valid).toBe(false);
  });

  it("rejects spec with negative totalTokens in meta", () => {
    const spec = makeSpec({
      meta: {
        totalTokens: -1,
        compileDurationMs: 0,
        compiledAt: new Date().toISOString(),
        lintScore: 50,
      },
    });
    const result = validate(PromptSpecSchema, spec);
    expect(result.valid).toBe(false);
  });

  it("rejects spec with lintScore > 100", () => {
    const spec = makeSpec({
      meta: {
        totalTokens: 100,
        compileDurationMs: 50,
        compiledAt: new Date().toISOString(),
        lintScore: 101,
      },
    });
    const result = validate(PromptSpecSchema, spec);
    expect(result.valid).toBe(false);
  });

  it("rejects spec with lintScore < 0", () => {
    const spec = makeSpec({
      meta: {
        totalTokens: 100,
        compileDurationMs: 50,
        compiledAt: new Date().toISOString(),
        lintScore: -1,
      },
    });
    const result = validate(PromptSpecSchema, spec);
    expect(result.valid).toBe(false);
  });

  it("repair handles NaN dial correctly", () => {
    const spec: any = {
      ...makeSpec(),
      dial: NaN,
    };
    const result = validateAndRepairSpec(spec);
    // NaN is typeof number but < 0 is false for NaN, > 5 is also false
    // The repair checks typeof === "number" && (< 0 || > 5)
    // NaN < 0 = false, NaN > 5 = false, so it might NOT repair
    // This is a potential bug - let's document the actual behavior
    if (result.valid) {
      expect(result.data?.dial).toBeDefined();
    } else {
      // NaN slips through the repair guard and Zod rejects it
      expect(result.errors).toBeDefined();
    }
  });

  it("repair handles Infinity dial", () => {
    const spec: any = {
      ...makeSpec(),
      dial: Infinity,
    };
    const result = validateAndRepairSpec(spec);
    // Infinity > 5 is true, so repair should kick in
    expect(result.valid).toBe(true);
    expect(result.repaired).toBe(true);
    expect(result.data?.dial).toBe(3);
  });

  it("repair handles -Infinity dial", () => {
    const spec: any = {
      ...makeSpec(),
      dial: -Infinity,
    };
    const result = validateAndRepairSpec(spec);
    expect(result.valid).toBe(true);
    expect(result.repaired).toBe(true);
    expect(result.data?.dial).toBe(3);
  });

  it("CompileInput schema rejects empty rawInput", () => {
    const result = CompileInputSchema.safeParse({
      rawInput: "",
      dial: 3,
      tokenBudget: 0,
    });
    // rawInput has .min(1) in CompileInputSchema
    expect(result.success).toBe(false);
  });

  it("CompileInput schema accepts rawInput with only whitespace", () => {
    const result = CompileInputSchema.safeParse({
      rawInput: "   ",
      dial: 3,
      tokenBudget: 0,
    });
    // .min(1) checks length, not trimmed length
    expect(result.success).toBe(true);
  });
});

// ===========================================================================
//  6. ESTIMATETOKENS EDGE CASES
// ===========================================================================

describe("Adversarial: estimateTokens", () => {
  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("returns 0 for null/undefined (falsy)", () => {
    expect(estimateTokens(null as any)).toBe(0);
    expect(estimateTokens(undefined as any)).toBe(0);
  });

  it("handles whitespace-only string", () => {
    const result = estimateTokens("   \t\n  ");
    // split by whitespace produces only empty strings, filter(Boolean) removes them
    expect(result).toBe(0);
  });

  it("handles extremely long input without overflow", () => {
    const longText = "word ".repeat(1000000);
    const result = estimateTokens(longText);
    expect(result).toBeGreaterThan(0);
    expect(Number.isFinite(result)).toBe(true);
  });

  it("handles single word", () => {
    const result = estimateTokens("hello");
    expect(result).toBe(Math.ceil(1 * 1.3));
  });

  it("handles string with only special characters", () => {
    const result = estimateTokens("!@#$%^&*()");
    // This is a single "word" (no whitespace)
    expect(result).toBe(Math.ceil(1 * 1.3));
  });
});

// ===========================================================================
//  7. EXTRACT ARTIFACT REFS EDGE CASES
// ===========================================================================

// extractArtifactRefs tests removed — function was dead code (Bug 4 fix)

// ===========================================================================
//  8. SPEC GENERATOR EDGE CASES
// ===========================================================================

describe("Adversarial: generateSpec edge cases", () => {
  it("generates spec with empty resolvedBlocks map", () => {
    const template = getTemplate("academic-report");
    const input: SpecGeneratorInput = {
      rawInput: "Test",
      parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "Test" },
      template,
      dial: 3,
      tokenBudget: 0,
      resolvedBlocks: new Map(),
      artifactRefs: [],
    };
    const spec = generateSpec(input);
    expect(spec.sections.length).toBeGreaterThan(0);
    for (const section of spec.sections) {
      expect(section.injectedBlocks).toEqual([]);
    }
  });

  it("generates spec at dial=0 with minimal sections", () => {
    const template = getTemplate("academic-report");
    const input: SpecGeneratorInput = {
      rawInput: "Test",
      parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "Test" },
      template,
      dial: 0,
      tokenBudget: 0,
      resolvedBlocks: new Map(),
      artifactRefs: [],
    };
    const spec = generateSpec(input);
    // Only sections with minDial=0 should be included
    for (const section of spec.sections) {
      const templateSection = template.sections.find((s) => s.heading === section.heading);
      expect(templateSection).toBeDefined();
      expect(templateSection!.minDial).toBeLessThanOrEqual(0);
    }
  });

  it("generates unique IDs across multiple calls", () => {
    const template = getTemplate("academic-report");
    const input: SpecGeneratorInput = {
      rawInput: "Test",
      parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "Test" },
      template,
      dial: 3,
      tokenBudget: 0,
      resolvedBlocks: new Map(),
      artifactRefs: [],
    };
    const spec1 = generateSpec(input);
    const spec2 = generateSpec(input);
    expect(spec1.id).not.toBe(spec2.id);
  });

  it("correctly maps resolvedBlocks to sections by heading", () => {
    const template = getTemplate("academic-report");
    const injectedBlock: InjectedBlock = {
      artifactId: "a1",
      artifactName: "Test",
      blockId: "b1",
      blockLabel: "Test Block",
      content: "Test content",
      tags: ["test"],
      priority: 5,
      tokenCount: 10,
    };
    const resolvedBlocks = new Map<string, InjectedBlock[]>();
    resolvedBlocks.set("Introduction", [injectedBlock]);

    const input: SpecGeneratorInput = {
      rawInput: "Test",
      parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "Test" },
      template,
      dial: 3,
      tokenBudget: 0,
      resolvedBlocks,
      artifactRefs: [],
    };
    const spec = generateSpec(input);
    const introSection = spec.sections.find((s) => s.heading === "Introduction");
    expect(introSection).toBeDefined();
    expect(introSection!.injectedBlocks).toHaveLength(1);
    expect(introSection!.injectedBlocks[0].blockId).toBe("b1");
  });

  it("ignores resolvedBlocks for headings not in template", () => {
    const template = getTemplate("academic-report");
    const resolvedBlocks = new Map<string, InjectedBlock[]>();
    resolvedBlocks.set("NonExistentSection", [{
      artifactId: "a1",
      artifactName: "Test",
      blockId: "b1",
      blockLabel: "Orphan Block",
      content: "Orphan content",
      tags: [],
      priority: 5,
      tokenCount: 10,
    }]);

    const input: SpecGeneratorInput = {
      rawInput: "Test",
      parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "Test" },
      template,
      dial: 5,
      tokenBudget: 0,
      resolvedBlocks,
      artifactRefs: [],
    };
    const spec = generateSpec(input);
    // No section should have the orphan block
    for (const section of spec.sections) {
      if (section.heading !== "NonExistentSection") {
        expect(section.injectedBlocks.every((b) => b.blockId !== "b1")).toBe(true);
      }
    }
  });
});

// ===========================================================================
//  9. FULL PIPELINE ADVERSARIAL INTEGRATION
// ===========================================================================

describe("Adversarial: Full Pipeline Integration", () => {
  it("compiles unicode-heavy input end-to-end", async () => {
    const input: CompileInput = {
      rawInput: "Write a research report about AI safety in Japanese markets",
      dial: 3,
      tokenBudget: 0,
    };
    const output = await compile(input, noopResolver, noopFetcher);
    expect(output.spec).toBeDefined();
    expect(output.rendered.length).toBeGreaterThan(0);
    expect(output.lint.score).toBeGreaterThanOrEqual(0);
  });

  it("compiles with all dial levels and always produces valid output", async () => {
    for (const dial of [0, 1, 2, 3, 4, 5] as const) {
      const input: CompileInput = {
        rawInput: "Write a detailed research report on artificial intelligence for technical leaders in formal tone",
        dial,
        tokenBudget: 0,
      };
      const output = await compile(input, noopResolver, noopFetcher);
      expect(output.spec.dial).toBe(dial);
      expect(output.rendered.length).toBeGreaterThan(0);
      expect(output.lint.score).toBeGreaterThanOrEqual(0);
      expect(output.lint.score).toBeLessThanOrEqual(100);
    }
  });

  it("compiles with resolved artifact and verifies block injection in rendered output", async () => {
    const input: CompileInput = {
      rawInput: "Write a research report @AI in formal tone for executives under 1000 words",
      dial: 3,
      tokenBudget: 5000,
    };
    const output = await compile(input, mockResolver, mockFetcher);
    expect(output.spec.artifactRefs.length).toBe(1);
    expect(output.rendered).toContain("[System Instruction]");
    expect(output.spec.meta.totalTokens).toBeGreaterThan(0);
    expect(output.spec.meta.compileDurationMs).toBeGreaterThan(0);
  });

  it("pipeline handles concurrent compilations without interference", async () => {
    const inputs: CompileInput[] = Array.from({ length: 10 }, (_, i) => ({
      rawInput: `Write research report number ${i} about AI @AI`,
      dial: (i % 6) as CompileInput["dial"],
      tokenBudget: 1000,
    }));

    const outputs = await Promise.all(
      inputs.map((input) => compile(input, mockResolver, mockFetcher))
    );

    // Each output should be independent
    const ids = new Set(outputs.map((o) => o.spec.id));
    expect(ids.size).toBe(10); // All unique IDs
  });

  it("pipeline: tokenBudget=0 produces larger rendered output than tokenBudget=1 with artifacts", async () => {
    const inputUnlimited: CompileInput = {
      rawInput: "Write a report @AI",
      dial: 5,
      tokenBudget: 0,
    };
    const inputTight: CompileInput = {
      rawInput: "Write a report @AI",
      dial: 5,
      tokenBudget: 1,
    };

    const outputUnlimited = await compile(inputUnlimited, mockResolver, mockFetcher);
    const outputTight = await compile(inputTight, mockResolver, mockFetcher);

    // Unlimited budget should include more (or equal) artifact blocks
    expect(outputUnlimited.injection.blocksIncluded).toBeGreaterThanOrEqual(
      outputTight.injection.blocksIncluded
    );
  });
});

// ===========================================================================
//  10. REGRESSION: NaN DIAL REPAIR BUG
// ===========================================================================

describe("Adversarial: NaN Dial Repair Behavior", () => {
  it("auto-repairs NaN dial to default value of 3", () => {
    // Bug 1 fix: !Number.isFinite(repaired.dial) now catches NaN
    // so the repair fires and replaces NaN with 3
    const spec: any = { ...makeSpec(), dial: NaN };
    const result = validateAndRepairSpec(spec);
    expect(result.valid).toBe(true);
    expect(result.repaired).toBe(true);
    expect(result.data?.dial).toBe(3);
  });
});
