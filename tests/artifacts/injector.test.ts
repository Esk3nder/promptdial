import { describe, it, expect } from "vitest";
import { injectBlocks } from "@/artifacts/injector";
import type { Artifact, ArtifactBlock } from "@/core/types";

describe("injectBlocks", () => {
  // Helper to create test artifacts
  const createTestArtifact = (
    id: string,
    name: string,
    blocks: ArtifactBlock[]
  ): Artifact => ({
    id,
    name,
    aliases: [],
    description: "",
    blocks,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isSeed: false,
  });

  const createTestBlock = (
    id: string,
    label: string,
    tags: string[],
    priority: number,
    tokenCount: number,
    doNotSend = false
  ): ArtifactBlock => ({
    id,
    label,
    content: `Content for ${label}`,
    tags,
    priority,
    doNotSend,
    tokenCount,
  });

  describe("tag filtering", () => {
    it("includes blocks with matching tags", () => {
      const block1 = createTestBlock(
        "b1",
        "Block 1",
        ["overview"],
        50,
        10,
        false
      );
      const block2 = createTestBlock(
        "b2",
        "Block 2",
        ["technical"],
        50,
        10,
        false
      );

      const artifact = createTestArtifact("a1", "Test", [block1, block2]);

      const { blocks, report } = injectBlocks([artifact], ["overview"], 0);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].blockId).toBe("b1");
      expect(report.blocksIncluded).toBe(1);
      expect(report.blocksOmitted).toBe(1);
    });

    it("excludes blocks without matching tags", () => {
      const block1 = createTestBlock(
        "b1",
        "Block 1",
        ["overview"],
        50,
        10,
        false
      );
      const block2 = createTestBlock(
        "b2",
        "Block 2",
        ["technical"],
        50,
        10,
        false
      );

      const artifact = createTestArtifact("a1", "Test", [block1, block2]);

      const { blocks, report } = injectBlocks([artifact], ["overview"], 0);

      const omitted = report.entries.find((e) => e.blockId === "b2");
      expect(omitted?.included).toBe(false);
      expect(omitted?.reason).toBe("no matching tags");
    });

    it("includes all blocks when no sectionTags specified", () => {
      const block1 = createTestBlock(
        "b1",
        "Block 1",
        ["overview"],
        50,
        10,
        false
      );
      const block2 = createTestBlock(
        "b2",
        "Block 2",
        ["technical"],
        50,
        10,
        false
      );

      const artifact = createTestArtifact("a1", "Test", [block1, block2]);

      const { blocks, report } = injectBlocks([artifact], [], 0);

      expect(blocks).toHaveLength(2);
      expect(report.blocksIncluded).toBe(2);
      expect(report.blocksOmitted).toBe(0);
    });
  });

  describe("doNotSend filtering", () => {
    it("excludes doNotSend blocks with reason", () => {
      const block1 = createTestBlock(
        "b1",
        "Block 1",
        ["overview"],
        50,
        10,
        true
      );
      const block2 = createTestBlock(
        "b2",
        "Block 2",
        ["overview"],
        50,
        10,
        false
      );

      const artifact = createTestArtifact("a1", "Test", [block1, block2]);

      const { blocks, report } = injectBlocks([artifact], [], 0);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].blockId).toBe("b2");

      const omitted = report.entries.find((e) => e.blockId === "b1");
      expect(omitted?.included).toBe(false);
      expect(omitted?.reason).toBe("do_not_send flag");
    });

    it("all doNotSend blocks results in empty output", () => {
      const block1 = createTestBlock(
        "b1",
        "Block 1",
        ["overview"],
        50,
        10,
        true
      );
      const block2 = createTestBlock(
        "b2",
        "Block 2",
        ["overview"],
        50,
        10,
        true
      );

      const artifact = createTestArtifact("a1", "Test", [block1, block2]);

      const { blocks, report } = injectBlocks([artifact], [], 0);

      expect(blocks).toHaveLength(0);
      expect(report.blocksIncluded).toBe(0);
      expect(report.blocksOmitted).toBe(2);
    });
  });

  describe("priority ordering", () => {
    it("higher priority blocks come first", () => {
      const block1 = createTestBlock(
        "b1",
        "Low Priority",
        ["overview"],
        30,
        10,
        false
      );
      const block2 = createTestBlock(
        "b2",
        "High Priority",
        ["overview"],
        90,
        10,
        false
      );
      const block3 = createTestBlock(
        "b3",
        "Medium Priority",
        ["overview"],
        60,
        10,
        false
      );

      const artifact = createTestArtifact("a1", "Test", [
        block1,
        block2,
        block3,
      ]);

      const { blocks } = injectBlocks([artifact], [], 0);

      expect(blocks[0].blockId).toBe("b2"); // 90
      expect(blocks[1].blockId).toBe("b3"); // 60
      expect(blocks[2].blockId).toBe("b1"); // 30
    });
  });

  describe("token budget enforcement", () => {
    it("includes blocks within budget", () => {
      const block1 = createTestBlock(
        "b1",
        "Block 1",
        ["overview"],
        50,
        100,
        false
      );
      const block2 = createTestBlock(
        "b2",
        "Block 2",
        ["overview"],
        50,
        50,
        false
      );

      const artifact = createTestArtifact("a1", "Test", [block1, block2]);

      const { blocks, report } = injectBlocks([artifact], [], 200);

      expect(blocks).toHaveLength(2);
      expect(report.totalTokensUsed).toBe(150);
      expect(report.blocksIncluded).toBe(2);
    });

    it("omits blocks exceeding budget", () => {
      const block1 = createTestBlock(
        "b1",
        "Block 1",
        ["overview"],
        90,
        100,
        false
      );
      const block2 = createTestBlock(
        "b2",
        "Block 2",
        ["overview"],
        80,
        80,
        false
      );
      const block3 = createTestBlock(
        "b3",
        "Block 3",
        ["overview"],
        70,
        50,
        false
      );

      const artifact = createTestArtifact("a1", "Test", [
        block1,
        block2,
        block3,
      ]);

      const { blocks, report } = injectBlocks([artifact], [], 150);

      expect(blocks).toHaveLength(2);
      expect(blocks[0].blockId).toBe("b1"); // 100 tokens, priority 90
      expect(blocks[1].blockId).toBe("b3"); // 50 tokens, priority 70 (b2 omitted due to budget)
      expect(report.totalTokensUsed).toBe(150);

      const omitted = report.entries.find((e) => e.blockId === "b2");
      expect(omitted?.included).toBe(false);
      expect(omitted?.reason).toContain("exceeded token budget");
    });

    it("budget=0 includes all matching blocks", () => {
      const block1 = createTestBlock(
        "b1",
        "Block 1",
        ["overview"],
        50,
        1000,
        false
      );
      const block2 = createTestBlock(
        "b2",
        "Block 2",
        ["overview"],
        50,
        2000,
        false
      );

      const artifact = createTestArtifact("a1", "Test", [block1, block2]);

      const { blocks, report } = injectBlocks([artifact], [], 0);

      expect(blocks).toHaveLength(2);
      expect(report.totalTokensUsed).toBe(3000);
    });

    it("lower priority blocks omitted when budget exceeded", () => {
      const highPriority = createTestBlock(
        "high",
        "High",
        ["overview"],
        90,
        60,
        false
      );
      const lowPriority = createTestBlock(
        "low",
        "Low",
        ["overview"],
        10,
        60,
        false
      );

      const artifact = createTestArtifact("a1", "Test", [
        lowPriority,
        highPriority,
      ]);

      const { blocks, report } = injectBlocks([artifact], [], 100);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].blockId).toBe("high");
      expect(report.blocksIncluded).toBe(1);
      expect(report.blocksOmitted).toBe(1);

      const omitted = report.entries.find((e) => e.blockId === "low");
      expect(omitted?.reason).toContain("exceeded token budget");
    });
  });

  describe("injection report", () => {
    it("correct counts for blocksIncluded and blocksOmitted", () => {
      const block1 = createTestBlock(
        "b1",
        "Block 1",
        ["overview"],
        50,
        10,
        false
      );
      const block2 = createTestBlock(
        "b2",
        "Block 2",
        ["technical"],
        50,
        10,
        false
      );
      const block3 = createTestBlock(
        "b3",
        "Block 3",
        ["overview"],
        50,
        10,
        true
      );

      const artifact = createTestArtifact("a1", "Test", [
        block1,
        block2,
        block3,
      ]);

      const { report } = injectBlocks([artifact], ["overview"], 0);

      expect(report.blocksIncluded).toBe(1); // b1 only
      expect(report.blocksOmitted).toBe(2); // b2 (no tag), b3 (doNotSend)
    });

    it("totalTokensUsed reflects included blocks only", () => {
      const block1 = createTestBlock(
        "b1",
        "Block 1",
        ["overview"],
        50,
        25,
        false
      );
      const block2 = createTestBlock(
        "b2",
        "Block 2",
        ["overview"],
        50,
        30,
        false
      );
      const block3 = createTestBlock(
        "b3",
        "Block 3",
        ["overview"],
        50,
        100,
        true
      );

      const artifact = createTestArtifact("a1", "Test", [
        block1,
        block2,
        block3,
      ]);

      const { report } = injectBlocks([artifact], [], 0);

      expect(report.totalTokensUsed).toBe(55); // 25 + 30, excluding doNotSend
    });

    it("totalTokensBudget matches input", () => {
      const artifact = createTestArtifact("a1", "Test", []);

      const { report } = injectBlocks([artifact], [], 500);

      expect(report.totalTokensBudget).toBe(500);
    });
  });

  describe("edge cases", () => {
    it("empty artifacts array returns empty result", () => {
      const { blocks, report } = injectBlocks([], [], 0);

      expect(blocks).toEqual([]);
      expect(report.blocksIncluded).toBe(0);
      expect(report.blocksOmitted).toBe(0);
      expect(report.totalTokensUsed).toBe(0);
    });

    it("artifact with no blocks returns empty result", () => {
      const artifact = createTestArtifact("a1", "Empty", []);

      const { blocks, report } = injectBlocks([artifact], [], 0);

      expect(blocks).toEqual([]);
      expect(report.blocksIncluded).toBe(0);
    });

    it("multiple artifacts with blocks from all considered", () => {
      const block1 = createTestBlock(
        "b1",
        "Block 1",
        ["overview"],
        80,
        10,
        false
      );
      const block2 = createTestBlock(
        "b2",
        "Block 2",
        ["overview"],
        70,
        10,
        false
      );

      const artifact1 = createTestArtifact("a1", "Artifact 1", [block1]);
      const artifact2 = createTestArtifact("a2", "Artifact 2", [block2]);

      const { blocks, report } = injectBlocks(
        [artifact1, artifact2],
        [],
        0
      );

      expect(blocks).toHaveLength(2);
      expect(report.blocksIncluded).toBe(2);
      // Verify both artifacts represented
      expect(blocks[0].artifactId).toBe("a1");
      expect(blocks[1].artifactId).toBe("a2");
    });

    it("multiple artifacts respect priority across artifacts", () => {
      const block1 = createTestBlock(
        "b1",
        "Low from A1",
        ["overview"],
        30,
        10,
        false
      );
      const block2 = createTestBlock(
        "b2",
        "High from A2",
        ["overview"],
        90,
        10,
        false
      );

      const artifact1 = createTestArtifact("a1", "Artifact 1", [block1]);
      const artifact2 = createTestArtifact("a2", "Artifact 2", [block2]);

      const { blocks } = injectBlocks([artifact1, artifact2], [], 0);

      expect(blocks[0].blockId).toBe("b2"); // Higher priority comes first
      expect(blocks[1].blockId).toBe("b1");
    });
  });

  describe("combined filters", () => {
    it("applies doNotSend, then tags, then priority, then budget", () => {
      const doNotSend = createTestBlock(
        "dns",
        "Do Not Send",
        ["overview"],
        100,
        10,
        true
      );
      const wrongTag = createTestBlock(
        "wt",
        "Wrong Tag",
        ["technical"],
        90,
        10,
        false
      );
      const highPriority = createTestBlock(
        "hp",
        "High Priority",
        ["overview"],
        80,
        50,
        false
      );
      const lowPriority = createTestBlock(
        "lp",
        "Low Priority",
        ["overview"],
        20,
        60,
        false
      );

      const artifact = createTestArtifact("a1", "Test", [
        doNotSend,
        wrongTag,
        highPriority,
        lowPriority,
      ]);

      const { blocks, report } = injectBlocks(
        [artifact],
        ["overview"],
        80
      );

      expect(blocks).toHaveLength(1);
      expect(blocks[0].blockId).toBe("hp");

      expect(report.entries.length).toBe(4);

      const dnsEntry = report.entries.find((e) => e.blockId === "dns");
      expect(dnsEntry?.reason).toBe("do_not_send flag");

      const wtEntry = report.entries.find((e) => e.blockId === "wt");
      expect(wtEntry?.reason).toBe("no matching tags");

      const lpEntry = report.entries.find((e) => e.blockId === "lp");
      expect(lpEntry?.reason).toContain("exceeded token budget");
    });
  });
});
