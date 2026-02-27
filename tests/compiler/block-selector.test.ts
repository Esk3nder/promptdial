import { describe, it, expect } from "vitest";
import { selectBlocks, type BlockSelectionInput } from "@/compiler/block-selector";
import type { ArtifactBlock } from "@/core/types";

describe("block-selector", () => {
  describe("basic selection", () => {
    it("includes all blocks with matching tags sorted by priority", () => {
      const blocks: ArtifactBlock[] = [
        {
          id: "b1",
          label: "Block 1",
          content: "Content 1",
          tags: ["test"],
          priority: 1,
          doNotSend: false,
          tokenCount: 10,
        },
        {
          id: "b2",
          label: "Block 2",
          content: "Content 2",
          tags: ["test"],
          priority: 3,
          doNotSend: false,
          tokenCount: 10,
        },
        {
          id: "b3",
          label: "Block 3",
          content: "Content 3",
          tags: ["test"],
          priority: 2,
          doNotSend: false,
          tokenCount: 10,
        },
      ];

      const input: BlockSelectionInput = {
        blocks,
        sectionTags: ["test"],
        tokenBudget: 0,
        artifactId: "art1",
        artifactName: "Test Artifact",
      };

      const result = selectBlocks(input);

      expect(result.included).toHaveLength(3);
      expect(result.included[0].blockId).toBe("b2"); // priority 3
      expect(result.included[1].blockId).toBe("b3"); // priority 2
      expect(result.included[2].blockId).toBe("b1"); // priority 1
      expect(result.omitted).toHaveLength(0);
    });

    it("includes blocks with case-insensitive tag matching", () => {
      const blocks: ArtifactBlock[] = [
        {
          id: "b1",
          label: "Block 1",
          content: "Content 1",
          tags: ["Test"],
          priority: 1,
          doNotSend: false,
          tokenCount: 10,
        },
      ];

      const input: BlockSelectionInput = {
        blocks,
        sectionTags: ["test"],
        tokenBudget: 0,
        artifactId: "art1",
        artifactName: "Test Artifact",
      };

      const result = selectBlocks(input);

      expect(result.included).toHaveLength(1);
    });
  });

  describe("doNotSend flag", () => {
    it("omits blocks with doNotSend=true", () => {
      const blocks: ArtifactBlock[] = [
        {
          id: "b1",
          label: "Block 1",
          content: "Content 1",
          tags: ["test"],
          priority: 1,
          doNotSend: true,
          tokenCount: 10,
        },
      ];

      const input: BlockSelectionInput = {
        blocks,
        sectionTags: ["test"],
        tokenBudget: 0,
        artifactId: "art1",
        artifactName: "Test Artifact",
      };

      const result = selectBlocks(input);

      expect(result.included).toHaveLength(0);
      expect(result.omitted).toHaveLength(1);
      expect(result.omitted[0].reason).toBe("do_not_send flag");
      expect(result.omitted[0].block.id).toBe("b1");
    });

    it("includes blocks with doNotSend=false", () => {
      const blocks: ArtifactBlock[] = [
        {
          id: "b1",
          label: "Block 1",
          content: "Content 1",
          tags: ["test"],
          priority: 1,
          doNotSend: false,
          tokenCount: 10,
        },
      ];

      const input: BlockSelectionInput = {
        blocks,
        sectionTags: ["test"],
        tokenBudget: 0,
        artifactId: "art1",
        artifactName: "Test Artifact",
      };

      const result = selectBlocks(input);

      expect(result.included).toHaveLength(1);
      expect(result.omitted).toHaveLength(0);
    });
  });

  describe("tag filtering", () => {
    it("omits blocks with non-matching tags", () => {
      const blocks: ArtifactBlock[] = [
        {
          id: "b1",
          label: "Block 1",
          content: "Content 1",
          tags: ["other"],
          priority: 1,
          doNotSend: false,
          tokenCount: 10,
        },
      ];

      const input: BlockSelectionInput = {
        blocks,
        sectionTags: ["test"],
        tokenBudget: 0,
        artifactId: "art1",
        artifactName: "Test Artifact",
      };

      const result = selectBlocks(input);

      expect(result.included).toHaveLength(0);
      expect(result.omitted).toHaveLength(1);
      expect(result.omitted[0].reason).toBe("no matching tags");
    });

    it("includes blocks with at least one matching tag", () => {
      const blocks: ArtifactBlock[] = [
        {
          id: "b1",
          label: "Block 1",
          content: "Content 1",
          tags: ["test", "other"],
          priority: 1,
          doNotSend: false,
          tokenCount: 10,
        },
      ];

      const input: BlockSelectionInput = {
        blocks,
        sectionTags: ["test"],
        tokenBudget: 0,
        artifactId: "art1",
        artifactName: "Test Artifact",
      };

      const result = selectBlocks(input);

      expect(result.included).toHaveLength(1);
    });

    it("includes all non-doNotSend blocks when sectionTags is empty", () => {
      const blocks: ArtifactBlock[] = [
        {
          id: "b1",
          label: "Block 1",
          content: "Content 1",
          tags: ["tag1"],
          priority: 1,
          doNotSend: false,
          tokenCount: 10,
        },
        {
          id: "b2",
          label: "Block 2",
          content: "Content 2",
          tags: ["tag2"],
          priority: 2,
          doNotSend: false,
          tokenCount: 10,
        },
      ];

      const input: BlockSelectionInput = {
        blocks,
        sectionTags: [],
        tokenBudget: 0,
        artifactId: "art1",
        artifactName: "Test Artifact",
      };

      const result = selectBlocks(input);

      expect(result.included).toHaveLength(2);
      expect(result.omitted).toHaveLength(0);
    });
  });

  describe("budget enforcement", () => {
    it("enforces token budget by omitting blocks that exceed budget", () => {
      const blocks: ArtifactBlock[] = [
        { id: "b1", label: "B1", content: "C1", tags: ["test"], priority: 3, doNotSend: false, tokenCount: 50 },
        { id: "b2", label: "B2", content: "C2", tags: ["test"], priority: 2, doNotSend: false, tokenCount: 50 },
        { id: "b3", label: "B3", content: "C3", tags: ["test"], priority: 1, doNotSend: false, tokenCount: 50 },
      ];

      const input: BlockSelectionInput = {
        blocks,
        sectionTags: ["test"],
        tokenBudget: 100,
        artifactId: "art1",
        artifactName: "Test Artifact",
      };

      const result = selectBlocks(input);

      expect(result.included).toHaveLength(2);
      expect(result.included[0].blockId).toBe("b1");
      expect(result.included[1].blockId).toBe("b2");
      expect(result.omitted).toHaveLength(1);
      expect(result.omitted[0].block.id).toBe("b3");
      expect(result.omitted[0].reason).toBe("exceeded token budget");
      expect(result.tokensUsed).toBe(100);
    });

    it("includes all blocks when budget is 0 (unlimited)", () => {
      const blocks: ArtifactBlock[] = [
        { id: "b1", label: "B1", content: "C1", tags: ["test"], priority: 1, doNotSend: false, tokenCount: 1000 },
        { id: "b2", label: "B2", content: "C2", tags: ["test"], priority: 2, doNotSend: false, tokenCount: 1000 },
      ];

      const input: BlockSelectionInput = {
        blocks,
        sectionTags: ["test"],
        tokenBudget: 0,
        artifactId: "art1",
        artifactName: "Test Artifact",
      };

      const result = selectBlocks(input);

      expect(result.included).toHaveLength(2);
      expect(result.omitted).toHaveLength(0);
      expect(result.tokensUsed).toBe(2000);
    });

    it("respects priority order when enforcing budget", () => {
      const blocks: ArtifactBlock[] = [
        { id: "b1", label: "B1", content: "C1", tags: ["test"], priority: 1, doNotSend: false, tokenCount: 50 },
        { id: "b2", label: "B2", content: "C2", tags: ["test"], priority: 10, doNotSend: false, tokenCount: 50 },
      ];

      const input: BlockSelectionInput = {
        blocks,
        sectionTags: ["test"],
        tokenBudget: 50,
        artifactId: "art1",
        artifactName: "Test Artifact",
      };

      const result = selectBlocks(input);

      expect(result.included).toHaveLength(1);
      expect(result.included[0].blockId).toBe("b2"); // Higher priority included first
      expect(result.omitted[0].block.id).toBe("b1");
    });
  });

  describe("injected block structure", () => {
    it("creates properly structured InjectedBlock objects", () => {
      const blocks: ArtifactBlock[] = [
        {
          id: "b1",
          label: "Test Block",
          content: "Test Content",
          tags: ["test"],
          priority: 5,
          doNotSend: false,
          tokenCount: 20,
        },
      ];

      const input: BlockSelectionInput = {
        blocks,
        sectionTags: ["test"],
        tokenBudget: 0,
        artifactId: "art-123",
        artifactName: "My Artifact",
      };

      const result = selectBlocks(input);

      expect(result.included).toHaveLength(1);
      const injected = result.included[0];
      expect(injected.artifactId).toBe("art-123");
      expect(injected.artifactName).toBe("My Artifact");
      expect(injected.blockId).toBe("b1");
      expect(injected.blockLabel).toBe("Test Block");
      expect(injected.content).toBe("Test Content");
      expect(injected.tags).toEqual(["test"]);
      expect(injected.priority).toBe(5);
      expect(injected.tokenCount).toBe(20);
    });
  });

  describe("edge cases", () => {
    it("handles empty blocks array", () => {
      const input: BlockSelectionInput = {
        blocks: [],
        sectionTags: ["test"],
        tokenBudget: 100,
        artifactId: "art1",
        artifactName: "Test Artifact",
      };

      const result = selectBlocks(input);

      expect(result.included).toHaveLength(0);
      expect(result.omitted).toHaveLength(0);
      expect(result.tokensUsed).toBe(0);
    });

    it("omits all blocks when budget is 1 and all blocks exceed 1 token", () => {
      const blocks: ArtifactBlock[] = [
        { id: "b1", label: "B1", content: "C1", tags: ["test"], priority: 1, doNotSend: false, tokenCount: 10 },
        { id: "b2", label: "B2", content: "C2", tags: ["test"], priority: 2, doNotSend: false, tokenCount: 10 },
      ];

      const input: BlockSelectionInput = {
        blocks,
        sectionTags: ["test"],
        tokenBudget: 1,
        artifactId: "art1",
        artifactName: "Test Artifact",
      };

      const result = selectBlocks(input);

      expect(result.included).toHaveLength(0);
      expect(result.omitted).toHaveLength(2);
      expect(result.omitted[0].reason).toBe("exceeded token budget");
      expect(result.omitted[1].reason).toBe("exceeded token budget");
    });

    it("handles blocks with zero token count", () => {
      const blocks: ArtifactBlock[] = [
        { id: "b1", label: "B1", content: "C1", tags: ["test"], priority: 1, doNotSend: false, tokenCount: 0 },
      ];

      const input: BlockSelectionInput = {
        blocks,
        sectionTags: ["test"],
        tokenBudget: 100,
        artifactId: "art1",
        artifactName: "Test Artifact",
      };

      const result = selectBlocks(input);

      expect(result.included).toHaveLength(1);
      expect(result.tokensUsed).toBe(0);
    });

    it("handles exact budget match", () => {
      const blocks: ArtifactBlock[] = [
        { id: "b1", label: "B1", content: "C1", tags: ["test"], priority: 1, doNotSend: false, tokenCount: 100 },
      ];

      const input: BlockSelectionInput = {
        blocks,
        sectionTags: ["test"],
        tokenBudget: 100,
        artifactId: "art1",
        artifactName: "Test Artifact",
      };

      const result = selectBlocks(input);

      expect(result.included).toHaveLength(1);
      expect(result.tokensUsed).toBe(100);
    });

    it("handles blocks with empty tags array", () => {
      const blocks: ArtifactBlock[] = [
        { id: "b1", label: "B1", content: "C1", tags: [], priority: 1, doNotSend: false, tokenCount: 10 },
      ];

      const input: BlockSelectionInput = {
        blocks,
        sectionTags: ["test"],
        tokenBudget: 0,
        artifactId: "art1",
        artifactName: "Test Artifact",
      };

      const result = selectBlocks(input);

      expect(result.included).toHaveLength(0);
      expect(result.omitted).toHaveLength(1);
      expect(result.omitted[0].reason).toBe("no matching tags");
    });
  });
});
