/**
 * Mutation-Killing Adversarial Tests
 *
 * Each test targets a specific mutation that would SURVIVE the existing test suite.
 * Tests are grouped by source module with commentary identifying the exact mutation.
 *
 * Methodology:
 *   - Flip conditions (> to <, === to !==, && to ||)
 *   - Swap operators (+ to -, * to /)
 *   - Remove lines (what if return was missing?)
 *   - Change constants (0 to 1, -25 to -10)
 *   - Negate booleans
 */

import { describe, it, expect } from "vitest";
import { compile } from "@/compiler/pipeline";
import { selectBlocks, type BlockSelectionInput } from "@/compiler/block-selector";
import { generateSpec, type SpecGeneratorInput } from "@/compiler/spec-generator";
import { parseIntent } from "@/compiler/intent-parser";
import { calculateScore } from "@/lint/scorer";
import { rules } from "@/lint/rules";
import { runLint } from "@/lint/engine";
import { renderPrompt } from "@/compiler/renderer";
import type {
  Artifact,
  ArtifactBlock,
  ArtifactRef,
  CompileInput,
  InjectedBlock,
  LintResult,
  PromptSpec,
  TemplateDefinition,
} from "@/core/types";

// ============================================================
// 1. pipeline.ts - Mutation Killers
// ============================================================
describe("MUTATION: pipeline.ts", () => {
  const mockResolveArtifacts = async (refs: string[]): Promise<ArtifactRef[]> => {
    return refs.map((ref) => ({
      raw: `@${ref}`,
      artifactId: `art-${ref.toLowerCase()}`,
      artifactName: `${ref} Artifact`,
      resolved: true,
    }));
  };

  const mockFetchArtifact = async (id: string): Promise<Artifact | null> => {
    if (id === "art-ai") {
      return {
        id: "art-ai",
        name: "AI Standards",
        aliases: ["ai"],
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

  // MUTATION: pipeline.ts line 43-44: `allRefs.length > 0` mutated to `allRefs.length < 0`
  // or `allRefs.length > 0` mutated to `allRefs.length >= 0` (always resolves)
  // Existing tests check blocksIncluded == 0 for no refs, but never verify that the
  // resolver function is NOT called when there are no refs.
  it("M1: does NOT call resolveArtifacts when allRefs is empty", async () => {
    let resolverCalled = false;
    const spyResolver = async (refs: string[]): Promise<ArtifactRef[]> => {
      resolverCalled = true;
      return [];
    };

    const input: CompileInput = {
      rawInput: "Write a report",
      dial: 3,
      tokenBudget: 1000,
    };

    await compile(input, spyResolver, mockFetchArtifact);
    expect(resolverCalled).toBe(false);
  });

  // MUTATION: pipeline.ts line 43: `allRefs.length > 0` mutated to `allRefs.length > 1`
  // Would break single-artifact resolution.
  it("M2: resolves a single artifact reference (length == 1)", async () => {
    let resolverCalledWith: string[] = [];
    const spyResolver = async (refs: string[]): Promise<ArtifactRef[]> => {
      resolverCalledWith = refs;
      return mockResolveArtifacts(refs);
    };

    const input: CompileInput = {
      rawInput: "Write a report @AI",
      dial: 3,
      tokenBudget: 1000,
    };

    await compile(input, spyResolver, mockFetchArtifact);
    expect(resolverCalledWith).toEqual(["AI"]);
  });

  // MUTATION: pipeline.ts line 53: `.filter((ref) => ref.resolved)` mutated to
  // `.filter((ref) => !ref.resolved)` -- would fetch only UNresolved artifacts
  it("M3: only fetches resolved artifacts, skips unresolved", async () => {
    const mixedResolver = async (refs: string[]): Promise<ArtifactRef[]> => {
      return [
        { raw: "@Good", artifactId: "art-good", artifactName: "Good", resolved: true },
        { raw: "@Bad", artifactId: "art-bad", artifactName: "Bad", resolved: false },
      ];
    };

    let fetchedIds: string[] = [];
    const spyFetcher = async (id: string): Promise<Artifact | null> => {
      fetchedIds.push(id);
      return null;
    };

    const input: CompileInput = {
      rawInput: "Write a report @Good @Bad",
      dial: 3,
      tokenBudget: 1000,
    };

    await compile(input, mixedResolver, spyFetcher);
    expect(fetchedIds).toContain("art-good");
    expect(fetchedIds).not.toContain("art-bad");
  });

  // MUTATION: pipeline.ts line 66: `s.minDial <= input.dial` mutated to
  // `s.minDial < input.dial` -- boundary sections would be excluded
  // The existing dial tests compare "dial 0 vs dial 5" which is too coarse.
  // We need an exact boundary test on the pipeline (not just spec-generator).
  it("M4: pipeline includes sections where minDial EQUALS the dial level", async () => {
    const input: CompileInput = {
      rawInput: "Write a research report",
      dial: 2,
      tokenBudget: 1000,
    };

    const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);
    // At dial 2, sections with minDial=2 should be included
    // We verify by checking that the section count grows from dial 1 to dial 2
    const inputDial1: CompileInput = { rawInput: "Write a research report", dial: 1, tokenBudget: 1000 };
    const outputDial1 = await compile(inputDial1, mockResolveArtifacts, mockFetchArtifact);

    expect(output.spec.sections.length).toBeGreaterThan(outputDial1.spec.sections.length);
  });

  // MUTATION: pipeline.ts line 78-79: `input.tokenBudget > 0` mutated to
  // `input.tokenBudget >= 0` -- zero budget would start enforcing limits.
  // Existing test checks blocksIncluded > 0 but doesn't verify token budget pass-through.
  it("M5: zero tokenBudget passes 0 to selectBlocks (unlimited), not a positive cap", async () => {
    const input: CompileInput = {
      rawInput: "Write a report @AI",
      dial: 3,
      tokenBudget: 0,
    };

    const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);
    // With budget=0, all 2 blocks from the AI artifact should be included
    // (tokens 10+8=18, unlimited budget means both included)
    expect(output.injection.blocksIncluded).toBe(2);
    expect(output.injection.totalTokensUsed).toBe(18);
  });

  // MUTATION: pipeline.ts line 86: `totalTokensUsed += result.tokensUsed` mutated to
  // `totalTokensUsed -= result.tokensUsed` or `totalTokensUsed = result.tokensUsed`
  // Existing tests don't check token accumulation across multiple sections.
  it("M6: totalTokensUsed accumulates across sections", async () => {
    const input: CompileInput = {
      rawInput: "Write a report @AI",
      dial: 3,
      tokenBudget: 1000,
    };

    const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);
    // totalTokensUsed should be the SUM of all included block tokens
    const sumFromEntries = output.injection.entries
      .filter((e) => e.included)
      .reduce((acc, e) => acc + e.tokenCount, 0);

    expect(output.injection.totalTokensUsed).toBe(sumFromEntries);
    expect(output.injection.totalTokensUsed).toBeGreaterThan(0);
  });

  // MUTATION: pipeline.ts lines 149-150: `.filter((e) => e.included).length` mutated to
  // `.filter((e) => !e.included).length` -- blocksIncluded/Omitted would be swapped
  it("M7: blocksIncluded and blocksOmitted report the correct counts", async () => {
    const input: CompileInput = {
      rawInput: "Write a report @AI",
      dial: 3,
      tokenBudget: 1000,
    };

    const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);
    const manualIncluded = output.injection.entries.filter((e) => e.included).length;
    const manualOmitted = output.injection.entries.filter((e) => !e.included).length;

    expect(output.injection.blocksIncluded).toBe(manualIncluded);
    expect(output.injection.blocksOmitted).toBe(manualOmitted);
    // Verify they are distinct values (not both using included or both using omitted)
    expect(output.injection.blocksIncluded + output.injection.blocksOmitted)
      .toBe(output.injection.entries.length);
  });

  // MUTATION: pipeline.ts line 115: `sectionBlocks.length > 0` mutated to
  // `sectionBlocks.length >= 0` -- empty section arrays would be stored in resolvedBlocks
  it("M8: sections with no matching blocks do NOT get resolvedBlocks entries", async () => {
    const input: CompileInput = {
      rawInput: "Write a report",
      dial: 5,
      tokenBudget: 1000,
    };

    // No artifacts = no blocks injected. All sections should have empty injectedBlocks.
    const output = await compile(input, mockResolveArtifacts, mockFetchArtifact);
    for (const section of output.spec.sections) {
      expect(section.injectedBlocks).toHaveLength(0);
    }
  });

  // MUTATION: pipeline.ts line 140: `estimateTokens(rendered)` replaced with constant 0
  // Existing tests check totalTokens > 0, but let's be more specific.
  it("M9: meta.totalTokens correlates with rendered prompt length", async () => {
    const inputShort: CompileInput = { rawInput: "Write a report", dial: 0, tokenBudget: 1000 };
    const inputLong: CompileInput = { rawInput: "Write a research report", dial: 5, tokenBudget: 1000 };

    const outputShort = await compile(inputShort, mockResolveArtifacts, mockFetchArtifact);
    const outputLong = await compile(inputLong, mockResolveArtifacts, mockFetchArtifact);

    // Longer rendered prompt (more sections at dial 5) should have more tokens
    expect(outputLong.spec.meta.totalTokens).toBeGreaterThan(outputShort.spec.meta.totalTokens);
  });
});

// ============================================================
// 2. block-selector.ts - Mutation Killers
// ============================================================
describe("MUTATION: block-selector.ts", () => {
  // MUTATION: line 47: `b.priority - a.priority` mutated to `a.priority - b.priority`
  // (ascending vs descending sort). Existing test checks order but let's verify
  // that the highest priority block is included first under a tight budget.
  it("M10: with tight budget, highest-priority block wins over lower-priority block", () => {
    const blocks: ArtifactBlock[] = [
      { id: "low", label: "Low", content: "L", tags: ["t"], priority: 1, doNotSend: false, tokenCount: 50 },
      { id: "high", label: "High", content: "H", tags: ["t"], priority: 10, doNotSend: false, tokenCount: 50 },
    ];

    const result = selectBlocks({
      blocks,
      sectionTags: ["t"],
      tokenBudget: 50,
      artifactId: "a",
      artifactName: "A",
    });

    expect(result.included).toHaveLength(1);
    expect(result.included[0].blockId).toBe("high");
    expect(result.omitted).toHaveLength(1);
    expect(result.omitted[0].block.id).toBe("low");
  });

  // MUTATION: line 51: `tokenBudget > 0 && tokensUsed + block.tokenCount > tokenBudget`
  // mutated to `tokenBudget > 0 || tokensUsed + block.tokenCount > tokenBudget`
  // With budget=0, the || version would still check token overflow and potentially
  // omit large blocks (0 + 1000 > 0 is true).
  it("M11: budget=0 includes blocks regardless of their token size", () => {
    const blocks: ArtifactBlock[] = [
      { id: "huge", label: "Huge", content: "H".repeat(10000), tags: ["t"], priority: 1, doNotSend: false, tokenCount: 999999 },
    ];

    const result = selectBlocks({
      blocks,
      sectionTags: ["t"],
      tokenBudget: 0,
      artifactId: "a",
      artifactName: "A",
    });

    expect(result.included).toHaveLength(1);
    expect(result.omitted).toHaveLength(0);
    expect(result.tokensUsed).toBe(999999);
  });

  // MUTATION: line 51: `tokensUsed + block.tokenCount > tokenBudget` mutated to
  // `tokensUsed + block.tokenCount >= tokenBudget` -- exact fit would be rejected
  it("M12: block fitting exactly at budget boundary is INCLUDED", () => {
    const blocks: ArtifactBlock[] = [
      { id: "exact", label: "Exact", content: "E", tags: ["t"], priority: 1, doNotSend: false, tokenCount: 100 },
    ];

    const result = selectBlocks({
      blocks,
      sectionTags: ["t"],
      tokenBudget: 100,
      artifactId: "a",
      artifactName: "A",
    });

    expect(result.included).toHaveLength(1);
    expect(result.tokensUsed).toBe(100);
  });

  // MUTATION: line 67: `tokensUsed += block.tokenCount` mutated to
  // `tokensUsed = block.tokenCount` (no accumulation). Existing exact-budget test
  // only has one block. We need two blocks to detect non-accumulation.
  it("M13: tokensUsed accumulates across multiple included blocks", () => {
    const blocks: ArtifactBlock[] = [
      { id: "b1", label: "B1", content: "C1", tags: ["t"], priority: 3, doNotSend: false, tokenCount: 30 },
      { id: "b2", label: "B2", content: "C2", tags: ["t"], priority: 2, doNotSend: false, tokenCount: 40 },
      { id: "b3", label: "B3", content: "C3", tags: ["t"], priority: 1, doNotSend: false, tokenCount: 50 },
    ];

    const result = selectBlocks({
      blocks,
      sectionTags: ["t"],
      tokenBudget: 80,
      artifactId: "a",
      artifactName: "A",
    });

    // After b1(30) + b2(40) = 70, b3(50) would make 120 > 80, so omitted
    expect(result.included).toHaveLength(2);
    expect(result.tokensUsed).toBe(70);
    expect(result.omitted).toHaveLength(1);
    expect(result.omitted[0].block.id).toBe("b3");
  });

  // MUTATION: line 34: `sectionTags.includes(tag.toLowerCase())` mutated to
  // `sectionTags.includes(tag.toUpperCase())` -- case matching would break
  it("M14: mixed-case tags match lowercased sectionTags correctly", () => {
    const blocks: ArtifactBlock[] = [
      { id: "b1", label: "B1", content: "C1", tags: ["Background"], priority: 1, doNotSend: false, tokenCount: 10 },
    ];

    const result = selectBlocks({
      blocks,
      sectionTags: ["background"],
      tokenBudget: 0,
      artifactId: "a",
      artifactName: "A",
    });

    expect(result.included).toHaveLength(1);
  });

  // MUTATION: line 33: `sectionTags.length > 0` mutated to `sectionTags.length === 0`
  // Would invert tag-filtering: empty sectionTags would filter, non-empty would include all.
  it("M15: non-empty sectionTags filters blocks by tag, not includes all", () => {
    const blocks: ArtifactBlock[] = [
      { id: "b1", label: "B1", content: "C1", tags: ["unrelated"], priority: 1, doNotSend: false, tokenCount: 10 },
    ];

    const result = selectBlocks({
      blocks,
      sectionTags: ["required-tag"],
      tokenBudget: 0,
      artifactId: "a",
      artifactName: "A",
    });

    expect(result.included).toHaveLength(0);
    expect(result.omitted).toHaveLength(1);
    expect(result.omitted[0].reason).toBe("no matching tags");
  });

  // MUTATION: line 27: `block.doNotSend` mutated to `!block.doNotSend`
  // Would include doNotSend blocks and omit normal blocks.
  it("M16: doNotSend=false block with matching tag is included", () => {
    const blocks: ArtifactBlock[] = [
      { id: "ok", label: "OK", content: "C", tags: ["t"], priority: 1, doNotSend: false, tokenCount: 10 },
      { id: "skip", label: "Skip", content: "C", tags: ["t"], priority: 1, doNotSend: true, tokenCount: 10 },
    ];

    const result = selectBlocks({
      blocks,
      sectionTags: ["t"],
      tokenBudget: 0,
      artifactId: "a",
      artifactName: "A",
    });

    expect(result.included).toHaveLength(1);
    expect(result.included[0].blockId).toBe("ok");
    expect(result.omitted).toHaveLength(1);
    expect(result.omitted[0].block.id).toBe("skip");
  });
});

// ============================================================
// 3. spec-generator.ts - Mutation Killers
// ============================================================
describe("MUTATION: spec-generator.ts", () => {
  const createTemplate = (overrides?: Partial<TemplateDefinition>): TemplateDefinition => ({
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

  // MUTATION: line 27: `sectionSpec.minDial <= dial` mutated to `sectionSpec.minDial < dial`
  // Existing tests check boundaries, but let's ensure the mutation on line 27
  // is killed by verifying section NAMES at the exact boundary.
  it("M17: section with minDial=2 is included at dial=2 (not excluded)", () => {
    const spec = generateSpec({
      rawInput: "test",
      parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "test" },
      template: createTemplate(),
      dial: 2,
      tokenBudget: 1000,
      resolvedBlocks: new Map(),
      artifactRefs: [],
    });

    const headings = spec.sections.map((s) => s.heading);
    expect(headings).toContain("Methodology");
  });

  // MUTATION: line 28: `resolvedBlocks.get(sectionSpec.heading) || []` mutated to
  // `resolvedBlocks.get(sectionSpec.heading) || [someDefault]`
  // or the fallback `[]` is removed. We need a test that verifies sections WITHOUT
  // blocks get empty arrays (not undefined).
  it("M18: sections without resolved blocks get an empty injectedBlocks array", () => {
    const spec = generateSpec({
      rawInput: "test",
      parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "test" },
      template: createTemplate(),
      dial: 5,
      tokenBudget: 1000,
      resolvedBlocks: new Map([["Background", [{
        artifactId: "a1", artifactName: "A", blockId: "b1", blockLabel: "L",
        content: "C", tags: ["bg"], priority: 1, tokenCount: 5,
      }]]]),
      artifactRefs: [],
    });

    const methodology = spec.sections.find((s) => s.heading === "Methodology")!;
    const analysis = spec.sections.find((s) => s.heading === "Analysis")!;
    const conclusion = spec.sections.find((s) => s.heading === "Conclusion")!;

    expect(methodology.injectedBlocks).toEqual([]);
    expect(analysis.injectedBlocks).toEqual([]);
    expect(conclusion.injectedBlocks).toEqual([]);
  });

  // MUTATION: line 41: `dial` passed directly. If mutated to a constant,
  // changing dial should change spec.dial.
  it("M19: spec.dial reflects the actual dial input value, not a constant", () => {
    for (const dial of [0, 1, 2, 3, 4, 5] as const) {
      const spec = generateSpec({
        rawInput: "test",
        parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "test" },
        template: createTemplate(),
        dial,
        tokenBudget: 1000,
        resolvedBlocks: new Map(),
        artifactRefs: [],
      });
      expect(spec.dial).toBe(dial);
    }
  });

  // MUTATION: line 43: `template.systemInstruction` mutated to empty string or constant.
  // Existing test checks one value. Let's verify with a different unique value.
  it("M20: systemInstruction comes from template, not hardcoded", () => {
    const spec = generateSpec({
      rawInput: "test",
      parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "test" },
      template: createTemplate({ systemInstruction: "UNIQUE_MARKER_12345" }),
      dial: 3,
      tokenBudget: 1000,
      resolvedBlocks: new Map(),
      artifactRefs: [],
    });
    expect(spec.systemInstruction).toBe("UNIQUE_MARKER_12345");
  });

  // MUTATION: line 45: `parsedIntent.constraints` mutated to `[]` or a different array.
  // Existing test checks with a known array, but let's verify the constraints
  // are passed through by reference identity.
  it("M21: constraints come from parsedIntent, not generated internally", () => {
    const uniqueConstraints = ["UNIQUE_CONSTRAINT_ABC", "UNIQUE_CONSTRAINT_XYZ"];
    const spec = generateSpec({
      rawInput: "test",
      parsedIntent: { templateId: "academic-report", constraints: uniqueConstraints, cleanedInput: "test" },
      template: createTemplate(),
      dial: 3,
      tokenBudget: 1000,
      resolvedBlocks: new Map(),
      artifactRefs: [],
    });
    expect(spec.constraints).toBe(uniqueConstraints);
  });

  // MUTATION: meta defaults. Line 48: `totalTokens: 0` mutated to `totalTokens: 1`.
  // Line 49: `compileDurationMs: 0` mutated to `compileDurationMs: 1`.
  // Line 51: `lintScore: 100` mutated to `lintScore: 0`.
  it("M22: meta defaults are exactly 0, 0, and 100", () => {
    const spec = generateSpec({
      rawInput: "test",
      parsedIntent: { templateId: "academic-report", constraints: [], cleanedInput: "test" },
      template: createTemplate(),
      dial: 3,
      tokenBudget: 1000,
      resolvedBlocks: new Map(),
      artifactRefs: [],
    });
    expect(spec.meta.totalTokens).toStrictEqual(0);
    expect(spec.meta.compileDurationMs).toStrictEqual(0);
    expect(spec.meta.lintScore).toStrictEqual(100);
  });
});

// ============================================================
// 4. intent-parser.ts - Mutation Killers
// ============================================================
describe("MUTATION: intent-parser.ts", () => {
  // MUTATION: line 38: default confidence `0.3` mutated to `0.5` or `0.0`
  // Existing test checks `< 0.5` which would pass if default was 0.0 but also 0.3.
  it("M23: default confidence for generic input is exactly 0.3", () => {
    const result = parseIntent("xyz");
    expect(result.confidence).toBe(0.3);
  });

  // MUTATION: line 42: confidence `1.0` mutated to `0.9` when template override is used
  it("M24: template override gives confidence of exactly 1.0", () => {
    const result = parseIntent("anything", "prd");
    expect(result.confidence).toBe(1.0);
  });

  // MUTATION: line 57: `Math.min(0.5 + score * 0.2, 1.0)` mutated to
  // `Math.min(0.5 + score * 0.3, 1.0)` or `0.5 + score * 0.2` (no min capping)
  it("M25: confidence formula is 0.5 + matches * 0.2", () => {
    // "research report" has 2 matches: "research" and "report"
    const result = parseIntent("research report");
    expect(result.confidence).toBe(0.9); // 0.5 + 2*0.2 = 0.9
  });

  // MUTATION: line 57: confidence capped at 1.0. With enough keywords it shouldn't exceed 1.0.
  it("M26: confidence is capped at 1.0 even with many keyword matches", () => {
    // academic-report keywords: report, research, study, paper, academic, thesis
    const result = parseIntent("Write a research report study paper academic thesis");
    expect(result.confidence).toBe(1.0);
    expect(result.confidence).not.toBeGreaterThan(1.0);
  });

  // MUTATION: line 54: `score > bestScore` mutated to `score >= bestScore`
  // When two templates tie, the >= mutation would pick the LAST one instead of FIRST.
  // We test with input matching both "academic-report" and "research-brief".
  it("M27: first template wins when scores tie (> not >=)", () => {
    // "brief" matches research-brief, "research" matches academic-report
    // Both have score=1, but academic-report comes first in Object.entries
    const result = parseIntent("brief research");
    // With >, academic-report wins (it's checked first). With >=, research-brief wins (last tie).
    expect(result.templateId).toBe("academic-report");
  });

  // MUTATION: line 33: `r.slice(1)` mutated to `r.slice(0)` or `r.slice(2)`
  // Would keep the @ sign or skip the first character of the ref name.
  it("M28: artifact refs have the @ stripped (exactly slice(1))", () => {
    const result = parseIntent("test @Foo");
    expect(result.artifactRefs).toEqual(["Foo"]);
    // Not "@Foo" (slice(0)) and not "oo" (slice(2))
    expect(result.artifactRefs[0]).not.toContain("@");
    expect(result.artifactRefs[0]).toBe("Foo");
  });

  // MUTATION: line 34: `.trim()` removed from cleanedInput
  // With "@AI test", after replacing @AI, we get " test" -- trim needed.
  it("M29: cleanedInput is trimmed after removing @references", () => {
    const result = parseIntent("@AI test");
    expect(result.cleanedInput).toBe("test");
    expect(result.cleanedInput).not.toMatch(/^\s/);
  });

  // MUTATION: line 71: `constraint.split(":")[0]` -- deduplication logic.
  // If the split was changed to `split(":")[1]`, deduplication would use the value part.
  it("M30: constraint deduplication uses the prefix before colon", () => {
    // "formal" matches the standalone tone pattern AND the "in X tone" pattern
    // but only one "Tone:" constraint should be present
    const result = parseIntent("Write in formal tone and be formal");
    const toneConstraints = result.constraints.filter((c) => c.startsWith("Tone:"));
    expect(toneConstraints).toHaveLength(1);
  });

  // MUTATION: line 50: `lower.includes(keyword)` mutated to `lower === keyword`
  // Would only match if the entire input equals a single keyword.
  it("M31: keywords are detected within longer text (substring match)", () => {
    const result = parseIntent("I want a product specification document");
    expect(result.templateId).toBe("prd");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  // MUTATION: line 44: `cleanedInput.toLowerCase()` mutated to `cleanedInput.toUpperCase()`
  // Keyword matching would fail because keywords are lowercase.
  it("M32: keyword matching is case-insensitive", () => {
    const result = parseIntent("Write a RESEARCH REPORT");
    expect(result.templateId).toBe("academic-report");
    expect(result.confidence).toBeGreaterThan(0.5);
  });
});

// ============================================================
// 5. scorer.ts - Mutation Killers
// ============================================================
describe("MUTATION: scorer.ts", () => {
  function makeError(id = "e"): LintResult {
    return { ruleId: id, ruleName: "E", severity: "error", message: "err" };
  }
  function makeWarning(id = "w"): LintResult {
    return { ruleId: id, ruleName: "W", severity: "warning", message: "warn" };
  }
  function makeInfo(id = "i"): LintResult {
    return { ruleId: id, ruleName: "I", severity: "info", message: "info" };
  }

  // MUTATION: line 8: `-25` mutated to `-10` or `-30`
  // Existing tests check 75 for one error, but let's be more precise about
  // the exact deduction to kill any constant change.
  it("M33: exactly 25 points deducted per error, not 10 or 30", () => {
    const r1 = calculateScore([makeError()]);
    const r2 = calculateScore([makeError(), makeError()]);
    expect(r2.score - r1.score).toBe(-25); // Second error deducts exactly 25 more
    expect(r1.score).toBe(75);
    expect(r2.score).toBe(50);
  });

  // MUTATION: line 11: `-10` mutated to `-5` or `-15`
  it("M34: exactly 10 points deducted per warning, not 5 or 15", () => {
    const r1 = calculateScore([makeWarning()]);
    const r2 = calculateScore([makeWarning(), makeWarning()]);
    expect(r2.score - r1.score).toBe(-10);
    expect(r1.score).toBe(90);
    expect(r2.score).toBe(80);
  });

  // MUTATION: line 14: `-3` mutated to `-1` or `-5`
  it("M35: exactly 3 points deducted per info, not 1 or 5", () => {
    const r1 = calculateScore([makeInfo()]);
    const r2 = calculateScore([makeInfo(), makeInfo()]);
    expect(r2.score - r1.score).toBe(-3);
    expect(r1.score).toBe(97);
    expect(r2.score).toBe(94);
  });

  // MUTATION: line 18: `Math.max(0, score)` mutated to `Math.max(-1, score)` or removed
  // If floor is removed, score could go negative.
  it("M36: score is floored at exactly 0, not negative", () => {
    // 5 errors = -125 + 100 = -25, floored to 0
    const results = Array(5).fill(null).map((_, i) => makeError(`e${i}`));
    const report = calculateScore(results);
    expect(report.score).toBe(0);
    expect(report.score).not.toBeLessThan(0);

    // 6 errors: still 0
    const results6 = Array(6).fill(null).map((_, i) => makeError(`e${i}`));
    expect(calculateScore(results6).score).toBe(0);
  });

  // MUTATION: line 22: `score >= 70` mutated to `score > 70` or `score >= 60`
  // Existing test checks 70 passes, but let's also check 69 fails for tight boundary.
  it("M37: passed is true at exactly 70, false at 69", () => {
    // 3 warnings = -30 => score 70
    const at70 = calculateScore([makeWarning("w1"), makeWarning("w2"), makeWarning("w3")]);
    expect(at70.score).toBe(70);
    expect(at70.passed).toBe(true);

    // 1 error + 1 info = -28 => score 72 => passed
    // Try to get exactly 69: 3 warnings + 1 info = -33 => 67, too low
    // 1 error + 1 warning - nah. Let's use: 100 - 31 = 69
    // 3 warnings (30) + 1 info (3) = 33 => 67
    // 1 error (25) + 1 warning (10) - skip, = 65
    // Actually: 2 warnings (20) + 3 infos (9) = 29 => 71
    // 2 warnings (20) + 4 infos (12) = 32 => 68. Close but not 69.
    // Hmm, with these deduction values we can't get exactly 69.
    // Let's just check 68 fails.
    const at68 = calculateScore([
      makeWarning("w1"), makeWarning("w2"),
      makeInfo("i1"), makeInfo("i2"), makeInfo("i3"), makeInfo("i4"),
    ]);
    expect(at68.score).toBe(68);
    expect(at68.passed).toBe(false);
  });

  // MUTATION: line 4: `let score = 100` mutated to `let score = 0`
  // Would start from 0 instead of 100.
  it("M38: scoring starts at 100, not 0", () => {
    const report = calculateScore([]);
    expect(report.score).toBe(100);
  });

  // MUTATION: switch default case handling -- if an unrecognized severity somehow passed in,
  // the switch would ignore it (no deduction). This isn't a mutation per se, but verifying
  // the formula is applied correctly with known inputs is important.
  it("M39: mixed severity calculation is exactly correct", () => {
    const report = calculateScore([
      makeError("e1"),     // -25
      makeWarning("w1"),   // -10
      makeInfo("i1"),      // -3
    ]);
    expect(report.score).toBe(62); // 100 - 25 - 10 - 3
  });
});

// ============================================================
// 6. rules.ts - Mutation Killers
// ============================================================
describe("MUTATION: rules.ts", () => {
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

  const vagueInputRule = rules.find((r) => r.id === "vague-input")!;
  const missingConstraintsRule = rules.find((r) => r.id === "missing-constraints")!;
  const noTemplateMatchRule = rules.find((r) => r.id === "no-template-match")!;
  const budgetExceededRule = rules.find((r) => r.id === "budget-exceeded")!;
  const emptySectionsRule = rules.find((r) => r.id === "empty-sections")!;
  const doNotSendLeakRule = rules.find((r) => r.id === "do-not-send-leak")!;

  // MUTATION: vague-input line 17: `words.length < 10` mutated to `words.length < 5`
  // Existing tests check 4 words and 14 words, but not the boundary at 9 and 10.
  it("M40: vague-input triggers at exactly 9 words, passes at exactly 10", () => {
    const spec9 = makeSpec({ rawInput: "one two three four five six seven eight nine" }); // 9 words
    const spec10 = makeSpec({ rawInput: "one two three four five six seven eight nine ten" }); // 10 words

    expect(vagueInputRule.check(spec9, "")).not.toBeNull();
    expect(vagueInputRule.check(spec10, "")).toBeNull();
  });

  // MUTATION: vague-input: `words.length` reported in message. If mutated to report
  // a constant, the message would be wrong.
  it("M41: vague-input message reports the actual word count", () => {
    const spec = makeSpec({ rawInput: "one two three" }); // 3 words
    const result = vagueInputRule.check(spec, "");
    expect(result?.message).toContain("3 words");
  });

  // MUTATION: missing-constraints line 35: `spec.constraints.length === 0` mutated to
  // `spec.constraints.length > 0` -- would fire on present constraints, not missing.
  it("M42: missing-constraints fires when empty AND passes when present", () => {
    const specEmpty = makeSpec({ constraints: [] });
    const specPresent = makeSpec({ constraints: ["Audience: devs"] });

    expect(missingConstraintsRule.check(specEmpty, "")).not.toBeNull();
    expect(missingConstraintsRule.check(specPresent, "")).toBeNull();
  });

  // MUTATION: no-template-match line 65: `matchCount === 0` mutated to `matchCount > 0`
  // Would fire on GOOD inputs and pass on BAD ones.
  it("M43: no-template-match fires on zero keyword matches, passes on non-zero", () => {
    const specNoMatch = makeSpec({ rawInput: "funny cat joke", templateId: "academic-report" });
    const specMatch = makeSpec({ rawInput: "research methodology findings", templateId: "academic-report" });

    expect(noTemplateMatchRule.check(specNoMatch, "")).not.toBeNull();
    expect(noTemplateMatchRule.check(specMatch, "")).toBeNull();
  });

  // MUTATION: budget-exceeded line 83: `spec.tokenBudget <= 0` mutated to
  // `spec.tokenBudget < 0` -- budget=0 would no longer skip the check.
  it("M44: budget-exceeded returns null when tokenBudget is exactly 0", () => {
    const spec = makeSpec({ tokenBudget: 0 });
    const result = budgetExceededRule.check(spec, "word ".repeat(1000));
    expect(result).toBeNull();
  });

  // MUTATION: budget-exceeded line 86: `estimatedTokens > spec.tokenBudget` mutated to
  // `estimatedTokens >= spec.tokenBudget` -- exact match would be flagged.
  it("M45: budget-exceeded does NOT fire when tokens exactly equal budget", () => {
    // We need to find a string whose estimated tokens exactly match a budget.
    // estimateTokens("a b c d") = ceil(4 * 1.3) = ceil(5.2) = 6
    const spec = makeSpec({ tokenBudget: 6 });
    const result = budgetExceededRule.check(spec, "a b c d");
    expect(result).toBeNull();
  });

  // MUTATION: budget-exceeded line 83: `spec.tokenBudget <= 0 return null`
  // If this return is removed, negative budgets would try to enforce.
  it("M46: budget-exceeded returns null for negative token budget", () => {
    const spec = makeSpec({ tokenBudget: -1 });
    const result = budgetExceededRule.check(spec, "word ".repeat(100));
    expect(result).toBeNull();
  });

  // MUTATION: empty-sections line 105: `!s.instruction.trim() && s.injectedBlocks.length === 0`
  // mutated to `!s.instruction.trim() || s.injectedBlocks.length === 0`
  // Would flag sections with instruction but no blocks as empty.
  it("M47: sections with instruction but no injected blocks are NOT flagged", () => {
    const spec = makeSpec({
      sections: [
        { heading: "Intro", instruction: "Do something.", injectedBlocks: [] },
      ],
    });
    expect(emptySectionsRule.check(spec, "")).toBeNull();
  });

  // MUTATION: empty-sections: `!s.instruction.trim()` mutated to `!s.instruction`
  // Whitespace-only instructions would not be detected as empty.
  it("M48: whitespace-only instruction is treated as empty", () => {
    const spec = makeSpec({
      sections: [
        { heading: "Empty", instruction: "   \n\t  ", injectedBlocks: [] },
      ],
    });
    const result = emptySectionsRule.check(spec, "");
    expect(result).not.toBeNull();
    expect(result?.ruleId).toBe("empty-sections");
  });

  // MUTATION: do-not-send-leak line 138: "sensitive" tag removed from check list.
  it("M49: sensitive tag is detected as a do-not-send leak", () => {
    const spec = makeSpec({
      sections: [{
        heading: "Data",
        instruction: "D",
        injectedBlocks: [{
          artifactId: "a1", artifactName: "A", blockId: "b1", blockLabel: "L",
          content: "C", tags: ["sensitive"], priority: 1, tokenCount: 5,
        }],
      }],
    });
    const result = doNotSendLeakRule.check(spec, "");
    expect(result).not.toBeNull();
    expect(result?.severity).toBe("error");
  });

  // MUTATION: do-not-send-leak line 139: "internal-only" tag removed from check list.
  it("M50: internal-only tag is detected as a do-not-send leak", () => {
    const spec = makeSpec({
      sections: [{
        heading: "Data",
        instruction: "D",
        injectedBlocks: [{
          artifactId: "a1", artifactName: "A", blockId: "b1", blockLabel: "L",
          content: "C", tags: ["internal-only"], priority: 1, tokenCount: 5,
        }],
      }],
    });
    const result = doNotSendLeakRule.check(spec, "");
    expect(result).not.toBeNull();
  });

  // MUTATION: do-not-send-leak line 137: "donotsend" tag removed from check list.
  it("M51: donotsend tag (no hyphens) is detected as a leak", () => {
    const spec = makeSpec({
      sections: [{
        heading: "Data",
        instruction: "D",
        injectedBlocks: [{
          artifactId: "a1", artifactName: "A", blockId: "b1", blockLabel: "L",
          content: "C", tags: ["donotsend"], priority: 1, tokenCount: 5,
        }],
      }],
    });
    const result = doNotSendLeakRule.check(spec, "");
    expect(result).not.toBeNull();
  });

  // MUTATION: do-not-send-leak: `t.toLowerCase()` mutated to `t.toUpperCase()`
  // Would fail to match lowercase tag lists against lowercase checks.
  it("M52: do-not-send-leak handles mixed case tags", () => {
    const spec = makeSpec({
      sections: [{
        heading: "Data",
        instruction: "D",
        injectedBlocks: [{
          artifactId: "a1", artifactName: "A", blockId: "b1", blockLabel: "L",
          content: "C", tags: ["Do-Not-Send"], priority: 1, tokenCount: 5,
        }],
      }],
    });
    const result = doNotSendLeakRule.check(spec, "");
    expect(result).not.toBeNull();
  });

  // MUTATION: empty-sections line 107: `emptySections.length > 0` mutated to
  // `emptySections.length === 0` -- would fire when there are NO empty sections.
  it("M53: empty-sections passes when all sections have content", () => {
    const spec = makeSpec({
      sections: [
        { heading: "A", instruction: "Do A.", injectedBlocks: [] },
        { heading: "B", instruction: "Do B.", injectedBlocks: [] },
      ],
    });
    expect(emptySectionsRule.check(spec, "")).toBeNull();
  });

  // MUTATION: no-template-match: `inputLower.includes(kw)` mutated to `inputLower === kw`
  // Would only match if entire input is a single keyword.
  it("M54: no-template-match finds keywords within longer input", () => {
    const spec = makeSpec({
      rawInput: "Please do a thorough research on the methodology",
      templateId: "academic-report",
    });
    const result = noTemplateMatchRule.check(spec, "");
    expect(result).toBeNull(); // "research" and "methodology" match
  });
});

// ============================================================
// 7. engine.ts - Mutation Killers
// ============================================================
describe("MUTATION: engine.ts", () => {
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

  // MUTATION: line 6: `.filter((result): result is LintResult => result !== null)`
  // mutated to `.filter((result) => result === null)` -- would return only nulls (empty after cast)
  // or `.filter((result) => true)` -- would include nulls.
  it("M55: runLint returns only non-null results, not nulls", () => {
    const spec = makeSpec(); // Perfect spec, no violations expected
    const results = runLint(spec, "");
    for (const result of results) {
      expect(result).not.toBeNull();
      expect(result).not.toBeUndefined();
      expect(typeof result.ruleId).toBe("string");
    }
  });

  // MUTATION: line 5-6: `rules.map(...)` replaced with `rules.filter(...)` or
  // some other transformation that loses the mapping step.
  // We verify that the exact count of violated rules matches.
  it("M56: runLint returns exactly one result per triggered rule", () => {
    const spec = makeSpec({
      rawInput: "bad", // vague-input
      constraints: [], // missing-constraints
    });
    const results = runLint(spec, "");
    const ruleIds = results.map((r) => r.ruleId);

    // Should have vague-input and missing-constraints at minimum
    expect(ruleIds).toContain("vague-input");
    expect(ruleIds).toContain("missing-constraints");
    // Each rule appears at most once
    const uniqueIds = new Set(ruleIds);
    expect(uniqueIds.size).toBe(ruleIds.length);
  });

  // MUTATION: engine passes `rendered` to each rule's check function.
  // If `rendered` was hardcoded to "" or dropped, budget-exceeded wouldn't work.
  it("M57: rendered string is correctly passed to rules (budget-exceeded uses it)", () => {
    const spec = makeSpec({ tokenBudget: 10 });
    const longRendered = "word ".repeat(100);
    const results = runLint(spec, longRendered);
    expect(results.some((r) => r.ruleId === "budget-exceeded")).toBe(true);

    // Same spec with short rendered should NOT trigger budget-exceeded
    const shortRendered = "hi";
    const results2 = runLint(spec, shortRendered);
    expect(results2.some((r) => r.ruleId === "budget-exceeded")).toBe(false);
  });

  // MUTATION: engine passes `spec` to each rule. If spec was mutated/replaced,
  // rules wouldn't fire correctly.
  it("M58: spec object is correctly passed to rules", () => {
    // Well-formed spec: 0 violations
    const goodSpec = makeSpec({
      rawInput: "Write a detailed research report on artificial intelligence for technical leaders and stakeholders worldwide",
      constraints: ["Audience: leaders"],
      sections: [
        { heading: "Intro", instruction: "Research AI.", injectedBlocks: [] },
      ],
    });
    const goodResults = runLint(goodSpec, "short");
    expect(goodResults.length).toBe(0);

    // Bad spec: multiple violations
    const badSpec = makeSpec({
      rawInput: "hi",
      constraints: [],
      sections: [{ heading: "Empty", instruction: "", injectedBlocks: [] }],
    });
    const badResults = runLint(badSpec, "short");
    expect(badResults.length).toBeGreaterThan(0);
  });
});

// ============================================================
// 8. renderer.ts - Mutation Killers (bonus - cross-cutting)
// ============================================================
describe("MUTATION: renderer.ts", () => {
  function makeSpec(overrides: Partial<PromptSpec> = {}): PromptSpec {
    return {
      id: "test-id",
      rawInput: "test",
      templateId: "academic-report",
      dial: 3,
      tokenBudget: 1000,
      systemInstruction: "You are helpful.",
      sections: [],
      constraints: [],
      artifactRefs: [],
      meta: { totalTokens: 0, compileDurationMs: 0, compiledAt: new Date().toISOString(), lintScore: 100 },
      ...overrides,
    };
  }

  // MUTATION: line 31: `spec.constraints.length > 0` mutated to
  // `spec.constraints.length === 0` -- would render constraints when there are none.
  it("M59: constraints section is only rendered when constraints exist", () => {
    const specNoConstraints = makeSpec({ constraints: [] });
    const specWithConstraints = makeSpec({ constraints: ["Tone: formal"] });

    const renderedNone = renderPrompt(specNoConstraints);
    const renderedSome = renderPrompt(specWithConstraints);

    expect(renderedNone).not.toContain("[Constraints]");
    expect(renderedSome).toContain("[Constraints]");
    expect(renderedSome).toContain("Tone: formal");
  });

  // MUTATION: line 22: block label in `## [Context: ${block.blockLabel}]`
  // If blockLabel is hardcoded or missing, it would be wrong.
  it("M60: injected block labels appear in rendered output", () => {
    const spec = makeSpec({
      sections: [{
        heading: "Background",
        instruction: "Provide context.",
        injectedBlocks: [{
          artifactId: "a1", artifactName: "A", blockId: "b1",
          blockLabel: "UNIQUE_LABEL_42",
          content: "Block content here.",
          tags: ["bg"], priority: 1, tokenCount: 5,
        }],
      }],
    });

    const rendered = renderPrompt(spec);
    expect(rendered).toContain("UNIQUE_LABEL_42");
    expect(rendered).toContain("Block content here.");
  });

  // MUTATION: line 8: `spec.systemInstruction` replaced with constant or empty string.
  it("M61: system instruction from spec appears in rendered output", () => {
    const spec = makeSpec({ systemInstruction: "UNIQUE_SYSTEM_INSTRUCTION_999" });
    const rendered = renderPrompt(spec);
    expect(rendered).toContain("UNIQUE_SYSTEM_INSTRUCTION_999");
  });

  // MUTATION: line 16: section heading format `# ${section.heading}` mutated to
  // just `section.heading` (no # prefix).
  it("M62: section headings are rendered with # prefix", () => {
    const spec = makeSpec({
      sections: [{
        heading: "TestHeading",
        instruction: "Do something.",
        injectedBlocks: [],
      }],
    });
    const rendered = renderPrompt(spec);
    expect(rendered).toContain("# TestHeading");
  });
});
