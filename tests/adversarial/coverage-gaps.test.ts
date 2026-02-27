/**
 * Coverage Gap Tests — Adversarial & Edge Case Suite
 *
 * Tests for the 5 most dangerous untested code paths identified
 * during the test coverage audit:
 *
 * 1. estimateTokens (src/app/lib/tokens.ts) — zero test coverage
 * 2. do-not-send-leak lint rule with all sensitive tag variants
 * 3. Injector case-insensitive tag matching (M1 fix verification)
 * 4. Schema validation of newly created artifacts with empty blocks (M2 fix)
 * 5. Spec generator rawInput preservation (C1 fix verification)
 */

import { describe, it, expect } from "vitest";
import { estimateTokens } from "@/app/lib/tokens";
import { rules } from "@/lint/rules";
import { injectBlocks } from "@/artifacts/injector";
import { createArtifact } from "@/artifacts/model";
import { ArtifactSchema } from "@/core/schema";
import { generateSpec } from "@/compiler/spec-generator";
import type {
  Artifact,
  ArtifactBlock,
  PromptSpec,
  TemplateDefinition,
  InjectedBlock,
} from "@/core/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSpec(overrides: Partial<PromptSpec> = {}): PromptSpec {
  return {
    id: "test-id",
    rawInput:
      "Write a detailed research report on artificial intelligence for technical leaders",
    templateId: "academic-report",
    dial: 3,
    tokenBudget: 0,
    systemInstruction: "Test instruction",
    sections: [
      {
        heading: "Introduction",
        instruction: "Introduce the topic.",
        injectedBlocks: [],
      },
      {
        heading: "Analysis",
        instruction: "Analyze in depth.",
        injectedBlocks: [],
      },
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

function makeBlock(
  id: string,
  label: string,
  tags: string[],
  priority: number,
  tokenCount: number,
  doNotSend = false
): ArtifactBlock {
  return {
    id,
    label,
    content: `Content for ${label}`,
    tags,
    priority,
    doNotSend,
    tokenCount,
  };
}

function makeArtifact(
  id: string,
  name: string,
  blocks: ArtifactBlock[]
): Artifact {
  return {
    id,
    name,
    aliases: [],
    description: "",
    blocks,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isSeed: false,
  };
}

const mockTemplate: TemplateDefinition = {
  id: "academic-report",
  name: "Academic Report",
  description: "Test template",
  systemInstruction: "You are a research assistant.",
  sections: [
    {
      heading: "Background",
      minDial: 0,
      instruction: "Provide background.",
      required: true,
    },
    {
      heading: "Methodology",
      minDial: 2,
      instruction: "Describe methods.",
      required: false,
    },
    {
      heading: "Analysis",
      minDial: 3,
      instruction: "Analyze data.",
      required: false,
    },
    {
      heading: "Conclusion",
      minDial: 5,
      instruction: "Draw conclusions.",
      required: false,
    },
  ],
};

// ===========================================================================
// GAP 1: estimateTokens — ZERO test coverage for this shared utility
// This function is used by lint rules, the pipeline, store seed init,
// and model.createBlock. A bug here silently corrupts every token count.
// ===========================================================================

describe("GAP 1: estimateTokens (zero coverage prior)", () => {
  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("returns 0 for null/undefined-like input (empty string guard)", () => {
    // The function checks `if (!text) return 0`
    expect(estimateTokens("")).toBe(0);
  });

  it("returns correct estimate for single word", () => {
    // "hello" => split(/\s+/) => ["hello"] => filter(Boolean) => 1 word => ceil(1 * 1.3) = 2
    expect(estimateTokens("hello")).toBe(2);
  });

  it("returns correct estimate for multi-word input", () => {
    // "hello world foo" => 3 words => ceil(3 * 1.3) = ceil(3.9) = 4
    expect(estimateTokens("hello world foo")).toBe(4);
  });

  it("handles whitespace-only input", () => {
    // "   " => split(/\s+/) => ["", ""] => filter(Boolean) => [] => 0 words => ceil(0 * 1.3) = 0
    expect(estimateTokens("   ")).toBe(0);
  });

  it("handles tab and newline characters", () => {
    // "hello\tworld\nfoo" => split(/\s+/) => ["hello", "world", "foo"] => 3 words => 4
    expect(estimateTokens("hello\tworld\nfoo")).toBe(4);
  });

  it("handles leading and trailing whitespace", () => {
    // "  hello world  " => split(/\s+/) => ["", "hello", "world", ""] => filter(Boolean) => 2 words => ceil(2.6) = 3
    expect(estimateTokens("  hello world  ")).toBe(3);
  });

  it("handles consecutive spaces between words", () => {
    // "hello     world" => split(/\s+/) => ["hello", "world"] => 2 words => ceil(2.6) = 3
    expect(estimateTokens("hello     world")).toBe(3);
  });

  it("produces consistent results with the formula: ceil(wordCount * 1.3)", () => {
    const text = "The quick brown fox jumps over the lazy dog"; // 9 words
    const expected = Math.ceil(9 * 1.3); // ceil(11.7) = 12
    expect(estimateTokens(text)).toBe(expected);
  });

  it("handles very long text without overflow", () => {
    const longText = "word ".repeat(10000).trim(); // 10000 words
    const expected = Math.ceil(10000 * 1.3); // 13000
    expect(estimateTokens(longText)).toBe(expected);
  });
});

// ===========================================================================
// GAP 2: do-not-send-leak lint rule — all sensitive tag variants
// The C2 fix rewrote this rule to check for "do-not-send", "donotsend",
// "sensitive", "internal-only" (case-insensitive). Tests exist for
// "do-not-send" but NOT for the other three tag variants or mixed-case.
// ===========================================================================

describe("GAP 2: do-not-send-leak rule — all sensitive tag variants", () => {
  const doNotSendLeakRule = rules.find((r) => r.id === "do-not-send-leak")!;

  function makeInjectedBlock(tags: string[]): InjectedBlock {
    return {
      artifactId: "art1",
      artifactName: "TestArtifact",
      blockId: "block1",
      blockLabel: "TestBlock",
      content: "test content",
      tags,
      priority: 50,
      tokenCount: 10,
    };
  }

  it("detects 'donotsend' tag (no hyphens)", () => {
    const spec = makeSpec({
      sections: [
        {
          heading: "Data",
          instruction: "Data",
          injectedBlocks: [makeInjectedBlock(["donotsend"])],
        },
      ],
    });
    const result = doNotSendLeakRule.check(spec, "");
    expect(result).not.toBeNull();
    expect(result?.severity).toBe("error");
  });

  it("detects 'sensitive' tag", () => {
    const spec = makeSpec({
      sections: [
        {
          heading: "Data",
          instruction: "Data",
          injectedBlocks: [makeInjectedBlock(["sensitive"])],
        },
      ],
    });
    const result = doNotSendLeakRule.check(spec, "");
    expect(result).not.toBeNull();
    expect(result?.severity).toBe("error");
  });

  it("detects 'internal-only' tag", () => {
    const spec = makeSpec({
      sections: [
        {
          heading: "Data",
          instruction: "Data",
          injectedBlocks: [makeInjectedBlock(["internal-only"])],
        },
      ],
    });
    const result = doNotSendLeakRule.check(spec, "");
    expect(result).not.toBeNull();
    expect(result?.severity).toBe("error");
  });

  it("detects mixed-case 'Do-Not-Send' tag", () => {
    const spec = makeSpec({
      sections: [
        {
          heading: "Data",
          instruction: "Data",
          injectedBlocks: [makeInjectedBlock(["Do-Not-Send"])],
        },
      ],
    });
    const result = doNotSendLeakRule.check(spec, "");
    expect(result).not.toBeNull();
    expect(result?.severity).toBe("error");
  });

  it("detects mixed-case 'SENSITIVE' tag", () => {
    const spec = makeSpec({
      sections: [
        {
          heading: "Data",
          instruction: "Data",
          injectedBlocks: [makeInjectedBlock(["SENSITIVE"])],
        },
      ],
    });
    const result = doNotSendLeakRule.check(spec, "");
    expect(result).not.toBeNull();
    expect(result?.severity).toBe("error");
  });

  it("detects mixed-case 'Internal-Only' tag", () => {
    const spec = makeSpec({
      sections: [
        {
          heading: "Data",
          instruction: "Data",
          injectedBlocks: [makeInjectedBlock(["Internal-Only"])],
        },
      ],
    });
    const result = doNotSendLeakRule.check(spec, "");
    expect(result).not.toBeNull();
    expect(result?.severity).toBe("error");
  });

  it("does not flag blocks with safe tags only", () => {
    const spec = makeSpec({
      sections: [
        {
          heading: "Data",
          instruction: "Data",
          injectedBlocks: [makeInjectedBlock(["overview", "public", "general"])],
        },
      ],
    });
    const result = doNotSendLeakRule.check(spec, "");
    expect(result).toBeNull();
  });

  it("detects sensitive tags mixed with safe tags on same block", () => {
    const spec = makeSpec({
      sections: [
        {
          heading: "Data",
          instruction: "Data",
          injectedBlocks: [
            makeInjectedBlock(["overview", "sensitive", "general"]),
          ],
        },
      ],
    });
    const result = doNotSendLeakRule.check(spec, "");
    expect(result).not.toBeNull();
    expect(result?.severity).toBe("error");
  });

  it("detects multiple leaked blocks across sections", () => {
    const spec = makeSpec({
      sections: [
        {
          heading: "Section1",
          instruction: "S1",
          injectedBlocks: [makeInjectedBlock(["do-not-send"])],
        },
        {
          heading: "Section2",
          instruction: "S2",
          injectedBlocks: [
            {
              ...makeInjectedBlock(["internal-only"]),
              blockId: "block2",
              blockLabel: "Block2",
            },
          ],
        },
      ],
    });
    const result = doNotSendLeakRule.check(spec, "");
    expect(result).not.toBeNull();
    expect(result?.message).toContain("2");
  });
});

// ===========================================================================
// GAP 3: Injector case-insensitive tag matching (M1 fix verification)
// The M1 fix added .toLowerCase() to injector tag comparison.
// Existing injector tests do NOT test mixed-case tag matching.
// ===========================================================================

describe("GAP 3: Injector case-insensitive tag matching (M1 fix)", () => {
  it("matches tags regardless of case in block tags vs sectionTags", () => {
    const block = makeBlock("b1", "Overview", ["Overview"], 50, 10);
    const artifact = makeArtifact("a1", "Test", [block]);

    // sectionTags are lowercase (as the pipeline lowercases section headings)
    const { blocks } = injectBlocks([artifact], ["overview"], 0);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].blockId).toBe("b1");
  });

  it("matches UPPERCASE block tag against lowercase sectionTag", () => {
    const block = makeBlock("b1", "Block", ["ANALYSIS"], 50, 10);
    const artifact = makeArtifact("a1", "Test", [block]);

    const { blocks } = injectBlocks([artifact], ["analysis"], 0);

    expect(blocks).toHaveLength(1);
  });

  it("matches mixed-case block tag against lowercase sectionTag", () => {
    const block = makeBlock("b1", "Block", ["Executive Summary"], 50, 10);
    const artifact = makeArtifact("a1", "Test", [block]);

    const { blocks } = injectBlocks([artifact], ["executive summary"], 0);

    expect(blocks).toHaveLength(1);
  });

  it("matches CamelCase block tag against lowercase sectionTag", () => {
    const block = makeBlock("b1", "Block", ["ResearchMethods"], 50, 10);
    const artifact = makeArtifact("a1", "Test", [block]);

    const { blocks } = injectBlocks([artifact], ["researchmethods"], 0);

    expect(blocks).toHaveLength(1);
  });

  it("rejects tags that differ by more than case", () => {
    const block = makeBlock("b1", "Block", ["analysis-deep"], 50, 10);
    const artifact = makeArtifact("a1", "Test", [block]);

    const { blocks } = injectBlocks([artifact], ["analysis"], 0);

    expect(blocks).toHaveLength(0);
  });
});

// ===========================================================================
// GAP 4: Schema validation of newly created artifacts (M2 fix)
// The M2 fix removed .min(1) from blocks array in ArtifactSchema.
// No test validates that a newly-created artifact (with empty blocks)
// passes Zod validation.
// ===========================================================================

describe("GAP 4: ArtifactSchema allows empty blocks (M2 fix)", () => {
  it("validates a newly created artifact with zero blocks", () => {
    const artifact = createArtifact("Test Artifact", "A test description");
    const result = ArtifactSchema.safeParse(artifact);

    expect(result.success).toBe(true);
  });

  it("validates a newly created artifact has correct shape", () => {
    const artifact = createArtifact("My Artifact", "Description");

    expect(artifact.blocks).toEqual([]);
    expect(artifact.version).toBe(1);
    expect(artifact.isSeed).toBe(false);

    const result = ArtifactSchema.safeParse(artifact);
    expect(result.success).toBe(true);
  });

  it("still validates artifacts with blocks", () => {
    const artifact = createArtifact("Test", "Description");
    artifact.blocks = [
      {
        id: "block-1",
        label: "Test Block",
        content: "Some content",
        tags: ["test"],
        priority: 50,
        doNotSend: false,
        tokenCount: 5,
      },
    ];

    const result = ArtifactSchema.safeParse(artifact);
    expect(result.success).toBe(true);
  });

  it("rejects invalid block structures within blocks array", () => {
    const artifact = createArtifact("Test", "Description");
    (artifact.blocks as unknown[]) = [
      { id: "", label: "", content: "" }, // Missing required fields
    ];

    const result = ArtifactSchema.safeParse(artifact);
    expect(result.success).toBe(false);
  });

  it("rejects negative priority in blocks", () => {
    const artifact = createArtifact("Test", "Description");
    artifact.blocks = [
      {
        id: "block-1",
        label: "Test Block",
        content: "Content",
        tags: ["test"],
        priority: -1,
        doNotSend: false,
        tokenCount: 5,
      },
    ];

    const result = ArtifactSchema.safeParse(artifact);
    expect(result.success).toBe(false);
  });

  it("rejects priority > 100 in blocks", () => {
    const artifact = createArtifact("Test", "Description");
    artifact.blocks = [
      {
        id: "block-1",
        label: "Test Block",
        content: "Content",
        tags: ["test"],
        priority: 101,
        doNotSend: false,
        tokenCount: 5,
      },
    ];

    const result = ArtifactSchema.safeParse(artifact);
    expect(result.success).toBe(false);
  });
});

// ===========================================================================
// GAP 5: Spec generator rawInput preservation (C1 fix verification)
// The C1 fix threaded rawInput through the pipeline so that rawInput
// in the PromptSpec is the ORIGINAL user input (with @references),
// NOT the cleaned input. This is critical for the no-template-match lint
// rule which analyzes rawInput. No test validates that rawInput with
// @references survives into the spec.
// ===========================================================================

describe("GAP 5: rawInput preservation with @references (C1 fix)", () => {
  it("preserves @references in rawInput when input contains them", () => {
    const rawInput = "Write a report @AI about security @ML";
    const resolvedBlocks = new Map<string, InjectedBlock[]>();

    const spec = generateSpec({
      rawInput,
      parsedIntent: {
        templateId: "academic-report",
        constraints: [],
        cleanedInput: "Write a report  about security",
      },
      template: mockTemplate,
      dial: 3,
      tokenBudget: 1000,
      resolvedBlocks,
      artifactRefs: [],
    });

    expect(spec.rawInput).toBe("Write a report @AI about security @ML");
    expect(spec.rawInput).toContain("@AI");
    expect(spec.rawInput).toContain("@ML");
  });

  it("rawInput differs from cleaned input when refs present", () => {
    const rawInput = "Critique @AI performance";
    const cleanedInput = "Critique  performance";
    const resolvedBlocks = new Map<string, InjectedBlock[]>();

    const spec = generateSpec({
      rawInput,
      parsedIntent: {
        templateId: "critique",
        constraints: [],
        cleanedInput,
      },
      template: mockTemplate,
      dial: 3,
      tokenBudget: 1000,
      resolvedBlocks,
      artifactRefs: [],
    });

    expect(spec.rawInput).toBe(rawInput);
    expect(spec.rawInput).not.toBe(cleanedInput);
  });

  it("rawInput is used by no-template-match lint rule (not cleanedInput)", () => {
    const noTemplateMatchRule = rules.find(
      (r) => r.id === "no-template-match"
    )!;

    // rawInput has "research" keyword, cleanedInput does not
    const spec = makeSpec({
      rawInput: "Write a research report @AI on the topic",
      templateId: "academic-report",
    });

    const result = noTemplateMatchRule.check(spec, "");

    // Should NOT flag a weak match because rawInput contains "research"
    expect(result).toBeNull();
  });

  it("no-template-match fires when rawInput lacks keywords", () => {
    const noTemplateMatchRule = rules.find(
      (r) => r.id === "no-template-match"
    )!;

    // rawInput lacks any academic-report keywords
    const spec = makeSpec({
      rawInput: "Tell me about cats and dogs",
      templateId: "academic-report",
    });

    const result = noTemplateMatchRule.check(spec, "");

    expect(result).not.toBeNull();
    expect(result?.ruleId).toBe("no-template-match");
  });

  it("rawInput preservation is independent of dial level", () => {
    const rawInput = "Compare @React vs @Vue for our project";
    const resolvedBlocks = new Map<string, InjectedBlock[]>();

    for (const dial of [0, 1, 2, 3, 4, 5] as const) {
      const spec = generateSpec({
        rawInput,
        parsedIntent: {
          templateId: "academic-report",
          constraints: [],
          cleanedInput: "Compare  vs  for our project",
        },
        template: mockTemplate,
        dial,
        tokenBudget: 0,
        resolvedBlocks,
        artifactRefs: [],
      });

      expect(spec.rawInput).toBe(rawInput);
    }
  });
});
