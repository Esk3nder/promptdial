import { describe, it, expect } from "vitest";
import { parseIntent } from "@/compiler/intent-parser";

describe("intent-parser", () => {
  describe("template detection", () => {
    it("detects academic-report for research input", () => {
      const result = parseIntent("Write a research report on AI");
      expect(result.templateId).toBe("academic-report");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("detects PRD for product requirements input", () => {
      const result = parseIntent("Create a PRD for the new feature");
      expect(result.templateId).toBe("prd");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("detects decision-memo for decision input", () => {
      const result = parseIntent("Help me decide between React and Vue");
      expect(result.templateId).toBe("decision-memo");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("detects critique for critique input", () => {
      const result = parseIntent("Critique and evaluate this assessment");
      expect(result.templateId).toBe("critique");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("detects research-brief for brief input", () => {
      const result = parseIntent("Give me a brief overview of market trends");
      expect(result.templateId).toBe("research-brief");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("defaults to academic-report with low confidence for generic input", () => {
      const result = parseIntent("hello");
      expect(result.templateId).toBe("academic-report");
      expect(result.confidence).toBeLessThan(0.5);
    });

    it("uses highest scoring template when multiple keywords match", () => {
      const result = parseIntent("Write a research report and critique");
      expect(result.templateId).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe("artifact reference extraction", () => {
    it("extracts @references from input", () => {
      const result = parseIntent("Write a report @AI @Security");
      expect(result.artifactRefs).toEqual(["AI", "Security"]);
    });

    it("removes @references from cleaned input", () => {
      const result = parseIntent("Write a report @AI @Security");
      expect(result.cleanedInput).toBe("Write a report");
      expect(result.cleanedInput).not.toContain("@AI");
      expect(result.cleanedInput).not.toContain("@Security");
    });

    it("handles input with no @references", () => {
      const result = parseIntent("Write a report");
      expect(result.artifactRefs).toEqual([]);
      expect(result.cleanedInput).toBe("Write a report");
    });

    it("handles input with only @references", () => {
      const result = parseIntent("@AI @Security");
      expect(result.artifactRefs).toEqual(["AI", "Security"]);
      expect(result.cleanedInput).toBe("");
    });

    it("extracts multiple @references correctly", () => {
      const result = parseIntent("Write @TypeScript code using @React and @NextJS");
      expect(result.artifactRefs).toEqual(["TypeScript", "React", "NextJS"]);
      // The regex replacement leaves spaces where @refs were
      expect(result.cleanedInput).toBe("Write  code using  and");
    });
  });

  describe("constraint extraction", () => {
    it("extracts tone constraint from 'formal' keyword", () => {
      const result = parseIntent("Write a formal report");
      expect(result.constraints).toContainEqual(expect.stringContaining("Tone: formal"));
    });

    it("extracts audience constraint", () => {
      const result = parseIntent("Write a report for executives.");
      expect(result.constraints).toContainEqual(expect.stringContaining("Audience: executives"));
    });

    it("extracts word limit constraint", () => {
      const result = parseIntent("Write a brief under 500 words");
      expect(result.constraints).toContainEqual(expect.stringContaining("Max words: 500"));
    });

    it("extracts multiple constraints", () => {
      const result = parseIntent("Write a formal report for executives, under 500 words");
      expect(result.constraints.length).toBeGreaterThanOrEqual(2);
      expect(result.constraints).toContainEqual(expect.stringContaining("Tone:"));
      expect(result.constraints).toContainEqual(expect.stringContaining("Max words:"));
    });

    it("deduplicates constraints by prefix", () => {
      const result = parseIntent("Write a formal technical report");
      const toneConstraints = result.constraints.filter((c) => c.startsWith("Tone:"));
      expect(toneConstraints.length).toBe(1);
    });

    it("extracts tone from 'in X tone' pattern", () => {
      const result = parseIntent("Write in casual tone");
      expect(result.constraints).toContainEqual(expect.stringContaining("Tone: casual"));
    });

    it("extracts max length with tokens", () => {
      const result = parseIntent("max 1000 tokens");
      expect(result.constraints).toContainEqual(expect.stringContaining("Max length: 1000 tokens"));
    });

    it("handles input with no constraints", () => {
      const result = parseIntent("Write a report");
      expect(result.constraints).toEqual([]);
    });
  });

  describe("template override", () => {
    it("uses explicit override with confidence 1.0", () => {
      const result = parseIntent("Write a report", "prd");
      expect(result.templateId).toBe("prd");
      expect(result.confidence).toBe(1.0);
    });

    it("ignores keywords when override is provided", () => {
      const result = parseIntent("Write a research brief", "prd");
      expect(result.templateId).toBe("prd");
      expect(result.confidence).toBe(1.0);
    });

    it("auto-detects when override is undefined", () => {
      const result = parseIntent("Create a PRD", undefined);
      expect(result.templateId).toBe("prd");
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe("edge cases", () => {
    it("handles very long input (200+ words)", () => {
      const longInput = "Write a research report on AI. ".repeat(50);
      const result = parseIntent(longInput);
      expect(result.templateId).toBe("academic-report");
      expect(result.cleanedInput).toBe(longInput.trim());
    });

    it("handles input with multiple spaces", () => {
      const result = parseIntent("Write  a  report   @AI");
      expect(result.cleanedInput).toBe("Write  a  report");
      expect(result.artifactRefs).toEqual(["AI"]);
    });

    it("handles case sensitivity in @references", () => {
      const result = parseIntent("@ai @AI @Ai");
      expect(result.artifactRefs).toEqual(["ai", "AI", "Ai"]);
    });

    it("handles empty input", () => {
      const result = parseIntent("");
      expect(result.templateId).toBe("academic-report");
      expect(result.cleanedInput).toBe("");
      expect(result.artifactRefs).toEqual([]);
      expect(result.constraints).toEqual([]);
    });

    it("handles input with special characters", () => {
      const result = parseIntent("Write a report! @AI? #test");
      expect(result.artifactRefs).toEqual(["AI"]);
      expect(result.cleanedInput).toContain("!");
      expect(result.cleanedInput).toContain("?");
    });

    it("preserves original input structure in cleanedInput", () => {
      const result = parseIntent("Write\na\nmultiline\nreport @AI");
      expect(result.cleanedInput).toContain("\n");
      expect(result.artifactRefs).toEqual(["AI"]);
    });
  });
});
