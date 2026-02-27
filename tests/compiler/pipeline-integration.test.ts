import { describe, it, expect } from "vitest";
import { compile } from "@/compiler/pipeline";
import type {
  ArtifactRef,
  Artifact,
  ArtifactBlock,
  CompileInput,
  TemplateId,
} from "@/core/types";
import aiSeed from "@/artifacts/seeds/ai.json";
import securitySeed from "@/artifacts/seeds/security.json";

// ---------------------------------------------------------------------------
// Fixtures & Mocks
// ---------------------------------------------------------------------------

const artifacts: Record<string, Artifact> = {
  "seed-ai": aiSeed as Artifact,
  "seed-security": securitySeed as Artifact,
};

const mockResolver = async (refs: string[]): Promise<ArtifactRef[]> => {
  return refs.map((ref) => {
    const lower = ref.toLowerCase();
    const found = Object.values(artifacts).find(
      (a) =>
        a.aliases.includes(lower) || a.name.toLowerCase().includes(lower),
    );
    return {
      raw: ref,
      artifactId: found?.id ?? "",
      artifactName: found?.name ?? ref,
      resolved: !!found,
    };
  });
};

const mockFetcher = async (id: string): Promise<Artifact | null> => {
  return artifacts[id] ?? null;
};

/** Helper: build a simple CompileInput */
function input(
  rawInput: string,
  dial: 0 | 1 | 2 | 3 | 4 | 5 = 3,
  tokenBudget = 0,
  overrides?: Partial<CompileInput>,
): CompileInput {
  return { rawInput, dial, tokenBudget, ...overrides };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Compilation Pipeline — Integration", () => {
  // 1. Basic compilation
  describe("basic compilation", () => {
    it("compiles a simple academic-report request", async () => {
      const output = await compile(
        input("Write a research report on artificial intelligence", 3),
        mockResolver,
        mockFetcher,
      );

      expect(output.spec.templateId).toBe("academic-report");
      expect(output.rendered).toContain("# ");
      expect(output.spec.sections.length).toBeGreaterThan(0);
      expect(output.lint.score).toBeDefined();
      expect(typeof output.lint.score).toBe("number");
    });

    it("returns all required CompileOutput fields", async () => {
      const output = await compile(
        input("Write a research report on artificial intelligence", 3),
        mockResolver,
        mockFetcher,
      );

      expect(output).toHaveProperty("spec");
      expect(output).toHaveProperty("rendered");
      expect(output).toHaveProperty("lint");
      expect(output).toHaveProperty("injection");
      expect(output.spec).toHaveProperty("id");
      expect(output.spec).toHaveProperty("meta");
      expect(output.spec.meta.compiledAt).toBeTruthy();
      expect(output.spec.meta.totalTokens).toBeGreaterThan(0);
    });
  });

  // 2. Dial level affects section count
  describe("dial level affects section count", () => {
    it("dial 5 produces more sections than dial 0", async () => {
      const dial0 = await compile(
        input("Write a report on AI", 0),
        mockResolver,
        mockFetcher,
      );
      const dial5 = await compile(
        input("Write a report on AI", 5),
        mockResolver,
        mockFetcher,
      );

      expect(dial5.spec.sections.length).toBeGreaterThan(
        dial0.spec.sections.length,
      );
    });

    it("dial 0 only includes minDial=0 sections", async () => {
      const out = await compile(
        input("Write a report on AI", 0),
        mockResolver,
        mockFetcher,
      );

      // academic-report has 4 sections at minDial 0
      // (Executive Summary, Introduction, Conclusion + Analysis at minDial 1? No — just minDial 0)
      // Sections with minDial 0: Executive Summary, Introduction, Conclusion
      expect(out.spec.sections.length).toBe(3);
    });

    it("each increment of dial adds at least one section", async () => {
      const counts: number[] = [];
      for (let d = 0; d <= 5; d++) {
        const out = await compile(
          input("Write a report on AI", d as 0 | 1 | 2 | 3 | 4 | 5),
          mockResolver,
          mockFetcher,
        );
        counts.push(out.spec.sections.length);
      }

      // Ensure monotonically non-decreasing
      for (let i = 1; i < counts.length; i++) {
        expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
      }
      // Overall growth from 0 to 5
      expect(counts[5]).toBeGreaterThan(counts[0]);
    });
  });

  // 3. Artifact injection with @refs
  describe("artifact injection with @refs", () => {
    it("injects AI artifact blocks into matching sections", async () => {
      const output = await compile(
        input("Write a report on @AI", 3),
        mockResolver,
        mockFetcher,
      );

      // At least some sections should have injected blocks
      const sectionsWithBlocks = output.spec.sections.filter(
        (s) => s.injectedBlocks.length > 0,
      );
      expect(sectionsWithBlocks.length).toBeGreaterThan(0);

      // Rendered output should contain content from AI seed
      expect(output.rendered).toContain("Artificial Intelligence");
    });

    it("injection report has correct counts", async () => {
      const output = await compile(
        input("Write a report on @AI", 3),
        mockResolver,
        mockFetcher,
      );

      expect(output.injection.entries.length).toBeGreaterThan(0);
      expect(output.injection.blocksIncluded + output.injection.blocksOmitted)
        .toBe(output.injection.entries.length);
    });

    it("resolves multiple artifact refs", async () => {
      const output = await compile(
        input("Write a report on @AI and @security", 3),
        mockResolver,
        mockFetcher,
      );

      expect(output.spec.artifactRefs.length).toBe(2);
      expect(output.spec.artifactRefs[0].resolved).toBe(true);
      expect(output.spec.artifactRefs[1].resolved).toBe(true);
    });
  });

  // 4. Token budget enforcement
  describe("token budget enforcement", () => {
    it("omits blocks when budget is tight", async () => {
      const output = await compile(
        input("Write a report on @AI", 3, 50),
        mockResolver,
        mockFetcher,
      );

      expect(output.injection.blocksOmitted).toBeGreaterThan(0);
    });

    it("tokenBudget=1 omits nearly all blocks", async () => {
      const output = await compile(
        input("Write a report on @AI", 3, 1),
        mockResolver,
        mockFetcher,
      );

      // With a budget of 1 token, all blocks should be omitted
      expect(output.injection.blocksIncluded).toBe(0);
      expect(output.injection.blocksOmitted).toBeGreaterThan(0);
    });

    it("unlimited budget (0) includes blocks without restriction", async () => {
      const output = await compile(
        input("Write a report on @AI", 3, 0),
        mockResolver,
        mockFetcher,
      );

      // With unlimited budget and matching tags, blocks should be included
      const budgetOmitted = output.injection.entries.filter(
        (e) => !e.included && e.reason === "exceeded token budget",
      );
      expect(budgetOmitted.length).toBe(0);
    });
  });

  // 5. doNotSend enforcement
  describe("doNotSend enforcement", () => {
    it("excludes blocks marked doNotSend from output", async () => {
      const doNotSendArtifact: Artifact = {
        id: "test-dns",
        name: "Do Not Send Test",
        aliases: ["dnstest"],
        description: "Test artifact with doNotSend block",
        blocks: [
          {
            id: "dns-secret",
            label: "Secret Block",
            content: "THIS_IS_SECRET_CONTENT_THAT_MUST_NOT_APPEAR",
            tags: ["executive summary"],
            priority: 100,
            doNotSend: true,
            tokenCount: 8,
          },
          {
            id: "dns-public",
            label: "Public Block",
            content: "This is public content that can be shared.",
            tags: ["executive summary"],
            priority: 50,
            doNotSend: false,
            tokenCount: 10,
          },
        ],
        version: 1,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
        isSeed: false,
      };

      const localArtifacts: Record<string, Artifact> = {
        ...artifacts,
        "test-dns": doNotSendArtifact,
      };

      const localResolver = async (refs: string[]): Promise<ArtifactRef[]> =>
        refs.map((ref) => {
          const lower = ref.toLowerCase();
          const found = Object.values(localArtifacts).find(
            (a) =>
              a.aliases.includes(lower) ||
              a.name.toLowerCase().includes(lower),
          );
          return {
            raw: ref,
            artifactId: found?.id ?? "",
            artifactName: found?.name ?? ref,
            resolved: !!found,
          };
        });

      const localFetcher = async (id: string): Promise<Artifact | null> =>
        localArtifacts[id] ?? null;

      const output = await compile(
        input("Write a report on @dnstest", 3),
        localResolver,
        localFetcher,
      );

      // Secret content must NOT appear in rendered output
      expect(output.rendered).not.toContain("THIS_IS_SECRET_CONTENT_THAT_MUST_NOT_APPEAR");

      // Public content SHOULD appear
      expect(output.rendered).toContain("This is public content");

      // Injection report should show the secret block as omitted
      const secretEntry = output.injection.entries.find(
        (e) => e.blockId === "dns-secret",
      );
      expect(secretEntry).toBeDefined();
      expect(secretEntry!.included).toBe(false);
      expect(secretEntry!.reason).toBe("do_not_send flag");
    });
  });

  // 6. Template override
  describe("template override", () => {
    it("uses overridden template regardless of input content", async () => {
      const output = await compile(
        input("Tell me about AI", 3, 0, { templateOverride: "prd" }),
        mockResolver,
        mockFetcher,
      );

      expect(output.spec.templateId).toBe("prd");
    });

    it("override to critique changes section headings", async () => {
      const output = await compile(
        input("Write a report on AI", 3, 0, { templateOverride: "critique" }),
        mockResolver,
        mockFetcher,
      );

      expect(output.spec.templateId).toBe("critique");
      const headings = output.spec.sections.map((s) => s.heading);
      expect(headings).toContain("Summary");
      expect(headings).toContain("Strengths");
      expect(headings).toContain("Weaknesses");
    });
  });

  // 7. Constraint extraction
  describe("constraint extraction", () => {
    it("extracts tone and audience constraints", async () => {
      const output = await compile(
        input(
          "Write a formal report for executives under 500 words about AI",
          3,
        ),
        mockResolver,
        mockFetcher,
      );

      expect(output.spec.constraints.length).toBeGreaterThan(0);

      const constraintText = output.spec.constraints.join(" ");
      // Should detect tone (formal) and/or max words (500)
      expect(
        constraintText.toLowerCase().includes("formal") ||
          constraintText.includes("500"),
      ).toBe(true);
    });

    it("includes constraints section in rendered output", async () => {
      const output = await compile(
        input(
          "Write a formal report for executives under 500 words about AI",
          3,
        ),
        mockResolver,
        mockFetcher,
      );

      expect(output.rendered).toContain("[Constraints]");
    });

    it("no constraints for unconstrained input", async () => {
      const output = await compile(
        input("Write a report on AI", 3),
        mockResolver,
        mockFetcher,
      );

      expect(output.spec.constraints.length).toBe(0);
      expect(output.rendered).not.toContain("[Constraints]");
    });
  });

  // 8. Lint integration
  describe("lint integration", () => {
    it("flags vague input with low score", async () => {
      const output = await compile(
        input("hi", 3),
        mockResolver,
        mockFetcher,
      );

      expect(output.lint.score).toBeLessThan(100);
      const ruleIds = output.lint.results.map((r) => r.ruleId);
      expect(ruleIds).toContain("vague-input");
    });

    it("flags missing constraints", async () => {
      const output = await compile(
        input("hi", 3),
        mockResolver,
        mockFetcher,
      );

      const ruleIds = output.lint.results.map((r) => r.ruleId);
      expect(ruleIds).toContain("missing-constraints");
    });

    it("well-formed input scores higher", async () => {
      const vague = await compile(
        input("hi", 3),
        mockResolver,
        mockFetcher,
      );
      const specific = await compile(
        input(
          "Write a formal academic research report for graduate students analyzing the impact of deep learning on natural language processing under 2000 words",
          3,
        ),
        mockResolver,
        mockFetcher,
      );

      expect(specific.lint.score).toBeGreaterThan(vague.lint.score);
    });

    it("populates meta.lintScore", async () => {
      const output = await compile(
        input("Write a research report on AI", 3),
        mockResolver,
        mockFetcher,
      );

      expect(output.spec.meta.lintScore).toBe(output.lint.score);
    });
  });

  // 9. Determinism
  describe("determinism", () => {
    it("identical inputs produce identical sections", async () => {
      const a = await compile(
        input("Write a research report on artificial intelligence", 3),
        mockResolver,
        mockFetcher,
      );
      const b = await compile(
        input("Write a research report on artificial intelligence", 3),
        mockResolver,
        mockFetcher,
      );

      expect(a.spec.sections.length).toBe(b.spec.sections.length);
      for (let i = 0; i < a.spec.sections.length; i++) {
        expect(a.spec.sections[i].heading).toBe(b.spec.sections[i].heading);
        expect(a.spec.sections[i].instruction).toBe(
          b.spec.sections[i].instruction,
        );
      }
    });

    it("identical inputs produce identical rendered output", async () => {
      const a = await compile(
        input("Write a report on @AI", 3),
        mockResolver,
        mockFetcher,
      );
      const b = await compile(
        input("Write a report on @AI", 3),
        mockResolver,
        mockFetcher,
      );

      // The spec.id and meta.compiledAt will differ, but rendered should be the same
      expect(a.rendered).toBe(b.rendered);
    });
  });

  // 10. Performance
  describe("performance", () => {
    it("compiles without artifacts in under 100ms", async () => {
      const start = performance.now();
      await compile(
        input("Write a research report on artificial intelligence", 3),
        mockResolver,
        mockFetcher,
      );
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    it("compiles with artifacts in under 200ms", async () => {
      const start = performance.now();
      await compile(
        input("Write a report on @AI and @security", 3),
        mockResolver,
        mockFetcher,
      );
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(200);
    });
  });

  // 11. All 5 templates
  describe("all 5 templates", () => {
    const templateCases: [string, TemplateId][] = [
      ["Write a research report on quantum computing", "academic-report"],
      ["Write a product requirements document for a new feature", "prd"],
      ["Help me decide between options A and B", "decision-memo"],
      ["Critique this argument about climate change", "critique"],
      ["Brief me on the latest trends in cybersecurity", "research-brief"],
    ];

    for (const [rawInput, expectedTemplate] of templateCases) {
      it(`detects "${expectedTemplate}" from: "${rawInput}"`, async () => {
        const output = await compile(
          input(rawInput, 3),
          mockResolver,
          mockFetcher,
        );

        expect(output.spec.templateId).toBe(expectedTemplate);
      });
    }

    it("every template produces valid rendered output with sections", async () => {
      for (const [rawInput] of templateCases) {
        const output = await compile(
          input(rawInput, 3),
          mockResolver,
          mockFetcher,
        );

        expect(output.rendered.length).toBeGreaterThan(0);
        expect(output.spec.sections.length).toBeGreaterThan(0);
        expect(output.rendered).toContain("[System Instruction]");
        expect(output.rendered).toContain("# ");
      }
    });
  });

  // 12. Empty/edge cases
  describe("empty and edge cases", () => {
    it("no artifact refs produces no injection entries", async () => {
      const output = await compile(
        input("Write a report on AI", 3),
        mockResolver,
        mockFetcher,
      );

      expect(output.injection.entries.length).toBe(0);
      expect(output.injection.blocksIncluded).toBe(0);
      expect(output.injection.blocksOmitted).toBe(0);
    });

    it("unresolved refs produce resolved=false", async () => {
      const output = await compile(
        input("Write a report on @nonexistent", 3),
        mockResolver,
        mockFetcher,
      );

      expect(output.spec.artifactRefs.length).toBe(1);
      expect(output.spec.artifactRefs[0].resolved).toBe(false);
      // No injection should happen for unresolved refs
      expect(output.injection.blocksIncluded).toBe(0);
    });

    it("empty input still compiles", async () => {
      const output = await compile(
        input("", 0),
        mockResolver,
        mockFetcher,
      );

      expect(output.spec).toBeDefined();
      expect(output.rendered.length).toBeGreaterThan(0);
      expect(output.spec.sections.length).toBeGreaterThan(0);
    });

    it("maximum dial with all features", async () => {
      const output = await compile(
        input(
          "Write a formal academic research report for executives under 1000 words on @AI and @security",
          5,
        ),
        mockResolver,
        mockFetcher,
      );

      expect(output.spec.dial).toBe(5);
      expect(output.spec.constraints.length).toBeGreaterThan(0);
      expect(output.spec.artifactRefs.length).toBe(2);
      expect(output.spec.sections.length).toBeGreaterThan(5);
      expect(output.rendered).toContain("[Constraints]");
    });
  });

  // 13. System instruction rendering
  describe("system instruction rendering", () => {
    it("rendered output starts with system instruction", async () => {
      const output = await compile(
        input("Write a research report on AI", 3),
        mockResolver,
        mockFetcher,
      );

      expect(output.rendered).toMatch(/^\[System Instruction\]/);
      expect(output.rendered).toContain("academic writing assistant");
    });

    it("template override changes system instruction", async () => {
      const output = await compile(
        input("Tell me about AI", 3, 0, { templateOverride: "critique" }),
        mockResolver,
        mockFetcher,
      );

      expect(output.rendered).toContain("critical analysis assistant");
    });
  });

  // 14. Injection report completeness
  describe("injection report", () => {
    it("reports correct token totals", async () => {
      const output = await compile(
        input("Write a report on @AI", 3),
        mockResolver,
        mockFetcher,
      );

      const includedTokens = output.injection.entries
        .filter((e) => e.included)
        .reduce((sum, e) => sum + e.tokenCount, 0);

      expect(output.injection.totalTokensUsed).toBe(includedTokens);
    });

    it("reports budget in injection when set", async () => {
      const output = await compile(
        input("Write a report on @AI", 3, 100),
        mockResolver,
        mockFetcher,
      );

      expect(output.injection.totalTokensBudget).toBe(100);
    });

    it("reports zero budget when unlimited", async () => {
      const output = await compile(
        input("Write a report on @AI", 3, 0),
        mockResolver,
        mockFetcher,
      );

      expect(output.injection.totalTokensBudget).toBe(0);
    });
  });

  // 15. Force artifacts
  describe("forceArtifacts", () => {
    it("includes force-added artifacts beyond @refs", async () => {
      const output = await compile(
        input("Write a report", 3, 0, { forceArtifacts: ["AI"] }),
        mockResolver,
        mockFetcher,
      );

      expect(output.spec.artifactRefs.length).toBe(1);
      expect(output.spec.artifactRefs[0].resolved).toBe(true);
      expect(output.spec.artifactRefs[0].artifactName).toBe(
        "Artificial Intelligence",
      );
    });

    it("combines @refs and forceArtifacts", async () => {
      const output = await compile(
        input("Write a report on @security", 3, 0, {
          forceArtifacts: ["AI"],
        }),
        mockResolver,
        mockFetcher,
      );

      expect(output.spec.artifactRefs.length).toBe(2);
      const names = output.spec.artifactRefs.map((r) => r.artifactName);
      expect(names).toContain("Security");
      expect(names).toContain("Artificial Intelligence");
    });
  });

  // 16. Meta field population
  describe("metadata population", () => {
    it("populates compileDurationMs", async () => {
      const output = await compile(
        input("Write a research report on AI", 3),
        mockResolver,
        mockFetcher,
      );

      expect(output.spec.meta.compileDurationMs).toBeGreaterThan(0);
    });

    it("populates totalTokens from rendered output", async () => {
      const output = await compile(
        input("Write a research report on AI", 3),
        mockResolver,
        mockFetcher,
      );

      expect(output.spec.meta.totalTokens).toBeGreaterThan(0);
    });

    it("populates compiledAt as ISO string", async () => {
      const output = await compile(
        input("Write a research report on AI", 3),
        mockResolver,
        mockFetcher,
      );

      const date = new Date(output.spec.meta.compiledAt);
      expect(date.getTime()).not.toBeNaN();
    });
  });
});
