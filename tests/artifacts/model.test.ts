import { describe, it, expect } from "vitest";
import {
  createArtifact,
  createBlock,
  generateAliases,
} from "@/artifacts/model";

describe("model helpers", () => {
  describe("createArtifact", () => {
    it("returns valid Artifact with UUID id", () => {
      const artifact = createArtifact("Test Artifact", "Test description");
      expect(artifact.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it("returns Artifact with version=1", () => {
      const artifact = createArtifact("Test", "Description");
      expect(artifact.version).toBe(1);
    });

    it("returns Artifact with timestamps", () => {
      const artifact = createArtifact("Test", "Description");
      expect(artifact.createdAt).toBeTruthy();
      expect(artifact.updatedAt).toBeTruthy();
      expect(artifact.createdAt).toBe(artifact.updatedAt);
      // Verify ISO format
      expect(() => new Date(artifact.createdAt)).not.toThrow();
    });

    it("returns Artifact with empty blocks array", () => {
      const artifact = createArtifact("Test", "Description");
      expect(artifact.blocks).toEqual([]);
    });

    it("name and description are set correctly", () => {
      const artifact = createArtifact("My Artifact", "My Description");
      expect(artifact.name).toBe("My Artifact");
      expect(artifact.description).toBe("My Description");
    });

    it("isSeed is false for created artifacts", () => {
      const artifact = createArtifact("Test", "Description");
      expect(artifact.isSeed).toBe(false);
    });

    it("aliases are auto-generated from name", () => {
      const artifact = createArtifact("Test Name", "Description");
      expect(artifact.aliases).toEqual(expect.arrayContaining(["testname"]));
    });
  });

  describe("createBlock", () => {
    it("returns valid ArtifactBlock with UUID id", () => {
      const block = createBlock("Label", "Content", ["tag1"]);
      expect(block.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it("default priority is 50", () => {
      const block = createBlock("Label", "Content", ["tag1"]);
      expect(block.priority).toBe(50);
    });

    it("doNotSend defaults to false", () => {
      const block = createBlock("Label", "Content", ["tag1"]);
      expect(block.doNotSend).toBe(false);
    });

    it("custom priority is preserved", () => {
      const block = createBlock("Label", "Content", ["tag1"], 75);
      expect(block.priority).toBe(75);
    });

    it("tokenCount is calculated and > 0 for non-empty content", () => {
      const block = createBlock(
        "Label",
        "This is some content that should have tokens",
        ["tag1"]
      );
      expect(block.tokenCount).toBeGreaterThan(0);
    });

    it("tokenCount is 0 for empty content", () => {
      const block = createBlock("Label", "", ["tag1"]);
      expect(block.tokenCount).toBe(0);
    });

    it("label and content are set correctly", () => {
      const block = createBlock("My Label", "My Content", ["tag1", "tag2"]);
      expect(block.label).toBe("My Label");
      expect(block.content).toBe("My Content");
    });

    it("tags are set correctly", () => {
      const block = createBlock("Label", "Content", ["tag1", "tag2", "tag3"]);
      expect(block.tags).toEqual(["tag1", "tag2", "tag3"]);
    });
  });

  describe("generateAliases", () => {
    it('multi-word name "Artificial Intelligence" includes no-space version', () => {
      const aliases = generateAliases("Artificial Intelligence");
      expect(aliases).toContain("artificialintelligence");
    });

    it('multi-word name "Artificial Intelligence" includes acronym', () => {
      const aliases = generateAliases("Artificial Intelligence");
      expect(aliases).toContain("ai");
    });

    it('multi-word name "Artificial Intelligence" includes hyphenated version', () => {
      const aliases = generateAliases("Artificial Intelligence");
      expect(aliases).toContain("artificial-intelligence");
    });

    it('single word "Security" includes lowercase version', () => {
      const aliases = generateAliases("Security");
      expect(aliases).toContain("security");
    });

    it("single word does not include acronym", () => {
      const aliases = generateAliases("Security");
      // Single word should only have one alias (no spaces, no hyphen, no acronym)
      expect(aliases.length).toBe(1);
      expect(aliases).toEqual(["security"]);
    });

    it("all aliases are lowercase", () => {
      const aliases = generateAliases("CamelCase Name");
      aliases.forEach((alias) => {
        expect(alias).toBe(alias.toLowerCase());
      });
    });

    it("handles multiple spaces", () => {
      const aliases = generateAliases("Multiple   Spaces   Here");
      expect(aliases).toContain("multiplespaceshere");
      expect(aliases).toContain("multiple-spaces-here");
      expect(aliases).toContain("msh"); // acronym
    });

    it("generates unique aliases only", () => {
      const aliases = generateAliases("Test");
      const uniqueAliases = [...new Set(aliases)];
      expect(aliases.length).toBe(uniqueAliases.length);
    });
  });
});
