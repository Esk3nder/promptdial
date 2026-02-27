import { describe, it, expect, beforeEach } from "vitest";
import { validate, validateAndRepairSpec } from "@/core/validator";
import { PromptSpecSchema } from "@/core/schema";
import type { PromptSpec } from "@/core/types";

// Helper to build a valid test spec
function makeValidSpec(overrides: Partial<PromptSpec> = {}): PromptSpec {
  return {
    id: "test-id",
    rawInput: "Write a detailed research report on artificial intelligence",
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

describe("Core Validator", () => {
  describe("validate function", () => {
    it("should validate a valid PromptSpec", () => {
      const spec = makeValidSpec();
      const result = validate(PromptSpecSchema, spec);
      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toBeUndefined();
      expect(result.repaired).toBe(false);
    });

    it("should return valid=false and errors for missing required field", () => {
      const invalidSpec = makeValidSpec();
      const { id, ...withoutId } = invalidSpec; // Remove required 'id' field
      const result = validate(PromptSpecSchema, withoutId);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.data).toBeUndefined();
      expect(result.repaired).toBe(false);
    });

    it("should return errors for invalid dial value", () => {
      const invalidSpec = makeValidSpec({ dial: 10 as any });
      const result = validate(PromptSpecSchema, invalidSpec);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it("should return errors for invalid templateId", () => {
      const invalidSpec = makeValidSpec({ templateId: "invalid-template" as any });
      const result = validate(PromptSpecSchema, invalidSpec);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it("should return errors for non-array constraints", () => {
      const invalidSpec = makeValidSpec({ constraints: "not an array" as any });
      const result = validate(PromptSpecSchema, invalidSpec);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it("should return errors for invalid section structure", () => {
      const invalidSpec = makeValidSpec({
        sections: [{ heading: "Test" }] as any, // Missing instruction and injectedBlocks
      });
      const result = validate(PromptSpecSchema, invalidSpec);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it("should return errors with path information", () => {
      const invalidSpec = { ...makeValidSpec(), dial: 10 };
      const result = validate(PromptSpecSchema, invalidSpec);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some((e) => e.includes("dial"))).toBe(true);
    });

    it("should handle deeply nested invalid data", () => {
      const invalidSpec = makeValidSpec({
        meta: {
          totalTokens: -1, // negative tokens are invalid
          compileDurationMs: 50,
          compiledAt: new Date().toISOString(),
          lintScore: 100,
        },
      });
      const result = validate(PromptSpecSchema, invalidSpec);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it("should preserve data when validation succeeds", () => {
      const spec = makeValidSpec();
      const result = validate(PromptSpecSchema, spec);
      expect(result.data).toEqual(spec);
    });
  });

  describe("validateAndRepairSpec function", () => {
    it("should return repaired=false for a valid spec", () => {
      const spec = makeValidSpec();
      const result = validateAndRepairSpec(spec);
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(false);
      expect(result.data).toBeDefined();
    });

    it("should repair missing id field", () => {
      const spec = makeValidSpec();
      const { id, ...withoutId } = spec;
      const result = validateAndRepairSpec(withoutId);
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(true);
      expect(result.data?.id).toBeDefined();
      expect(result.data?.id).not.toBe(""); // Should be a generated UUID
    });

    it("should repair invalid dial to 3", () => {
      const spec = makeValidSpec({ dial: 10 as any });
      const result = validateAndRepairSpec(spec);
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(true);
      expect(result.data?.dial).toBe(3);
    });

    it("should repair missing tokenBudget to 0 (unlimited)", () => {
      const spec = makeValidSpec();
      const { tokenBudget, ...withoutBudget } = spec;
      const result = validateAndRepairSpec(withoutBudget);
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(true);
      expect(result.data?.tokenBudget).toBe(0);
    });

    it("should repair missing constraints to empty array", () => {
      const spec = makeValidSpec();
      const { constraints, ...withoutConstraints } = spec;
      const result = validateAndRepairSpec(withoutConstraints);
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(true);
      expect(result.data?.constraints).toEqual([]);
    });

    it("should repair missing artifactRefs to empty array", () => {
      const spec = makeValidSpec();
      const { artifactRefs, ...withoutRefs } = spec;
      const result = validateAndRepairSpec(withoutRefs);
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(true);
      expect(result.data?.artifactRefs).toEqual([]);
    });

    it("should repair missing meta with defaults", () => {
      const spec = makeValidSpec();
      const { meta, ...withoutMeta } = spec;
      const result = validateAndRepairSpec(withoutMeta);
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(true);
      expect(result.data?.meta).toBeDefined();
      expect(result.data?.meta?.totalTokens).toBe(0);
      expect(result.data?.meta?.compileDurationMs).toBe(0);
      expect(result.data?.meta?.lintScore).toBe(0);
      expect(result.data?.meta?.compiledAt).toBeDefined();
    });

    it("should repair missing injectedBlocks in sections", () => {
      const spec = makeValidSpec({
        sections: [
          { heading: "Test", instruction: "Test instruction" } as any, // Missing injectedBlocks
        ],
      });
      const result = validateAndRepairSpec(spec);
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(true);
      expect(result.data?.sections[0].injectedBlocks).toEqual([]);
    });

    it("should return repaired=true when multiple repairs are needed", () => {
      const spec: any = {
        rawInput: "Test",
        templateId: "academic-report",
        dial: 5,
        tokenBudget: 100,
        systemInstruction: "Test",
        sections: [{ heading: "Test", instruction: "Test" }],
        // Missing: id, constraints, artifactRefs, meta
      };
      const result = validateAndRepairSpec(spec);
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(true);
    });

    it("should handle completely invalid data with try-catch", () => {
      // validateAndRepairSpec may throw on null, so we wrap it
      expect(() => validateAndRepairSpec(null as any)).toThrow();
    });

    it("should handle empty object as invalid", () => {
      const result = validateAndRepairSpec({});
      expect(result.valid).toBe(false);
    });

    it("should handle non-object input with try-catch", () => {
      // validateAndRepairSpec may throw on non-objects, so we wrap it
      expect(() => validateAndRepairSpec("not an object" as any)).toThrow();
    });

    it("should preserve valid fields during repair", () => {
      const spec: any = {
        rawInput: "Custom input text",
        templateId: "prd",
        dial: 2,
        tokenBudget: 500,
        systemInstruction: "Custom system instruction",
        sections: [{ heading: "Custom", instruction: "Custom instruction" }],
        constraints: ["Custom constraint"],
        // Missing: id, artifactRefs, meta
      };
      const result = validateAndRepairSpec(spec);
      expect(result.valid).toBe(true);
      expect(result.data?.rawInput).toBe("Custom input text");
      expect(result.data?.templateId).toBe("prd");
      expect(result.data?.dial).toBe(2);
      expect(result.data?.tokenBudget).toBe(500);
      expect(result.data?.systemInstruction).toBe("Custom system instruction");
      expect(result.data?.constraints).toEqual(["Custom constraint"]);
    });

    it("should generate unique IDs for multiple repairs", () => {
      const spec1: any = {
        rawInput: "Test1",
        templateId: "academic-report",
        dial: 3,
        tokenBudget: 0,
        systemInstruction: "Test",
        sections: [{ heading: "Test", instruction: "Test", injectedBlocks: [] }],
        constraints: [],
        artifactRefs: [],
      };
      const spec2: any = {
        rawInput: "Test2",
        templateId: "prd",
        dial: 3,
        tokenBudget: 0,
        systemInstruction: "Test",
        sections: [{ heading: "Test", instruction: "Test", injectedBlocks: [] }],
        constraints: [],
        artifactRefs: [],
      };
      const result1 = validateAndRepairSpec(spec1);
      const result2 = validateAndRepairSpec(spec2);
      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
      expect(result1.data?.id).not.toBe(result2.data?.id);
    });

    it("should repair dial value that is negative", () => {
      const spec = makeValidSpec({ dial: -5 as any });
      const result = validateAndRepairSpec(spec);
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(true);
      expect(result.data?.dial).toBe(3);
    });

    it("should not repair decimal dial (Zod rejects it)", () => {
      const spec = makeValidSpec({ dial: 3.5 as any });
      const result = validateAndRepairSpec(spec);
      // Zod's .int() constraint will reject 3.5, so this remains invalid
      expect(result.valid).toBe(false);
    });

    it("should handle spec with invalid but reparable sections", () => {
      const spec = makeValidSpec({
        sections: [
          { heading: "Test", instruction: "Test" } as any, // Missing injectedBlocks
        ],
      });
      const result = validateAndRepairSpec(spec);
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(true);
      expect(result.data?.sections[0].injectedBlocks).toEqual([]);
    });

    it("should include error information when repair fails", () => {
      const result = validateAndRepairSpec({});
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it("should handle timestamp generation correctly in meta repair", () => {
      const spec: any = {
        id: "test",
        rawInput: "Test",
        templateId: "academic-report",
        dial: 3,
        tokenBudget: 0,
        systemInstruction: "Test",
        sections: [{ heading: "Test", instruction: "Test", injectedBlocks: [] }],
        constraints: [],
        artifactRefs: [],
        // Missing: meta
      };
      const result = validateAndRepairSpec(spec);
      expect(result.valid).toBe(true);
      expect(result.data?.meta.compiledAt).toBeDefined();
      const date = new Date(result.data?.meta.compiledAt || "");
      expect(date.getTime()).toBeGreaterThan(0);
    });

    it("should repair missing required fields in complex structure", () => {
      const partialSpec: any = {
        rawInput: "Write something",
        templateId: "decision-memo",
        dial: 2,
        tokenBudget: 1000,
        systemInstruction: "Make a decision",
        sections: [
          {
            heading: "Options",
            instruction: "List options",
            // Missing: injectedBlocks
          },
          {
            heading: "Analysis",
            instruction: "Analyze",
            // Missing: injectedBlocks
          },
        ],
        constraints: ["Be concise"],
        // Missing: id, artifactRefs, meta
      };
      const result = validateAndRepairSpec(partialSpec);
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(true);
      expect(result.data?.sections.every((s) => Array.isArray(s.injectedBlocks))).toBe(true);
    });
  });

  describe("Integration scenarios", () => {
    it("should validate a freshly built spec", () => {
      const spec = makeValidSpec();
      const result = validate(PromptSpecSchema, spec);
      expect(result.valid).toBe(true);
    });

    it("should repair and validate a spec from partial data", () => {
      const partial: any = {
        rawInput: "Create a PRD",
        templateId: "prd",
        dial: 2,
        tokenBudget: 2000,
        systemInstruction: "Product requirements",
        sections: [{ heading: "Overview", instruction: "Overview" }],
        constraints: ["Technical audience"],
      };
      const result = validateAndRepairSpec(partial);
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(true);
      // Should be revalidatable
      const revalidate = validate(PromptSpecSchema, result.data!);
      expect(revalidate.valid).toBe(true);
    });

    it("should fail validation for fundamentally broken data", () => {
      const brokenData = {
        id: 123, // Should be string
        rawInput: 456, // Should be string
        templateId: "invalid", // Should be enum
        dial: "three", // Should be number
        tokenBudget: "unlimited", // Should be number
        systemInstruction: null, // Should be string
        sections: "not an array", // Should be array
        constraints: "not an array", // Should be array
        artifactRefs: "not an array", // Should be array
        meta: "not an object", // Should be object
      };
      const result = validateAndRepairSpec(brokenData);
      expect(result.valid).toBe(false);
    });

    it("should handle edge case: all fields null", () => {
      const allNull: any = {
        id: null,
        rawInput: null,
        templateId: null,
        dial: null,
        tokenBudget: null,
        systemInstruction: null,
        sections: null,
        constraints: null,
        artifactRefs: null,
        meta: null,
      };
      const result = validateAndRepairSpec(allNull);
      expect(result.valid).toBe(false);
    });

    it("should validate multiple templates", () => {
      const templates: Array<any> = [
        "academic-report",
        "prd",
        "decision-memo",
        "critique",
        "research-brief",
      ];

      for (const templateId of templates) {
        const spec = makeValidSpec({ templateId: templateId as any });
        const result = validate(PromptSpecSchema, spec);
        expect(result.valid).toBe(true);
      }
    });

    it("should validate all dial levels", () => {
      const dials = [0, 1, 2, 3, 4, 5];

      for (const dial of dials) {
        const spec = makeValidSpec({ dial: dial as any });
        const result = validate(PromptSpecSchema, spec);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe("Validation consistency", () => {
    it("should validate same spec consistently", () => {
      const spec = makeValidSpec();
      const result1 = validate(PromptSpecSchema, spec);
      const result2 = validate(PromptSpecSchema, spec);
      expect(result1.valid).toBe(result2.valid);
      expect(result1.errors).toEqual(result2.errors);
    });

    it("should repair same spec consistently", () => {
      const partial: any = {
        rawInput: "Test",
        templateId: "academic-report",
        sections: [],
      };
      const result1 = validateAndRepairSpec(partial);
      const result2 = validateAndRepairSpec(partial);
      expect(result1.valid).toBe(result2.valid);
      expect(result1.repaired).toBe(result2.repaired);
      expect(result1.data?.tokenBudget).toBe(result2.data?.tokenBudget);
      expect(result1.data?.constraints).toEqual(result2.data?.constraints);
    });
  });
});
