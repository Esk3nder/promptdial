import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { db } from "@/app/lib/db";
import {
  getAllArtifacts,
  getArtifactById,
  getArtifactByAlias,
  createArtifactInStore,
  updateArtifact,
  deleteArtifact,
  initSeedArtifacts,
} from "@/artifacts/store";
import type { Artifact } from "@/core/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeArtifact(overrides: Partial<Artifact> = {}): Artifact {
  return {
    id: crypto.randomUUID(),
    name: "Test Artifact",
    aliases: ["test", "test-artifact", "ta"],
    description: "A test artifact",
    blocks: [],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isSeed: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Artifact Store (IndexedDB)", () => {
  beforeEach(async () => {
    // Clear all data between tests
    await db.artifacts.clear();
  });

  // ---- CRUD ----

  describe("createArtifactInStore", () => {
    it("stores an artifact and returns its id", async () => {
      const artifact = makeArtifact({ id: "store-test-1" });
      const id = await createArtifactInStore(artifact);

      expect(id).toBe("store-test-1");
    });

    it("stored artifact is retrievable", async () => {
      const artifact = makeArtifact({ id: "store-test-2", name: "Stored" });
      await createArtifactInStore(artifact);

      const retrieved = await getArtifactById("store-test-2");
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe("Stored");
    });
  });

  describe("getArtifactById", () => {
    it("returns artifact by exact id", async () => {
      const artifact = makeArtifact({ id: "exact-id" });
      await createArtifactInStore(artifact);

      const result = await getArtifactById("exact-id");
      expect(result).toBeDefined();
      expect(result!.id).toBe("exact-id");
    });

    it("returns undefined for non-existent id", async () => {
      const result = await getArtifactById("does-not-exist");
      expect(result).toBeUndefined();
    });
  });

  describe("getArtifactByAlias", () => {
    it("finds artifact by alias", async () => {
      const artifact = makeArtifact({
        id: "alias-test",
        name: "Alias Test",
        aliases: ["myalias", "otheralias"],
      });
      await createArtifactInStore(artifact);

      const result = await getArtifactByAlias("myalias");
      expect(result).toBeDefined();
      expect(result!.id).toBe("alias-test");
    });

    it("alias lookup normalizes to lowercase", async () => {
      const artifact = makeArtifact({
        id: "case-test",
        aliases: ["lowercase"],
      });
      await createArtifactInStore(artifact);

      // getArtifactByAlias normalizes input to lowercase
      const found = await getArtifactByAlias("lowercase");
      expect(found).toBeDefined();

      const alsoFound = await getArtifactByAlias("LOWERCASE");
      expect(alsoFound).toBeDefined();
      expect(alsoFound!.id).toBe("case-test");
    });

    it("returns undefined for non-existent alias", async () => {
      const result = await getArtifactByAlias("nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("getAllArtifacts", () => {
    it("returns empty array when store is empty", async () => {
      const all = await getAllArtifacts();
      expect(all).toEqual([]);
    });

    it("returns all stored artifacts", async () => {
      await createArtifactInStore(makeArtifact({ id: "a1", name: "First" }));
      await createArtifactInStore(makeArtifact({ id: "a2", name: "Second" }));

      const all = await getAllArtifacts();
      expect(all).toHaveLength(2);
      const names = all.map((a) => a.name);
      expect(names).toContain("First");
      expect(names).toContain("Second");
    });
  });

  describe("updateArtifact", () => {
    it("updates name and increments version", async () => {
      const artifact = makeArtifact({
        id: "update-test",
        name: "Original",
        version: 1,
      });
      await createArtifactInStore(artifact);

      await updateArtifact("update-test", { name: "Updated" });

      const updated = await getArtifactById("update-test");
      expect(updated!.name).toBe("Updated");
      expect(updated!.version).toBe(2);
    });

    it("updates updatedAt timestamp", async () => {
      const artifact = makeArtifact({
        id: "timestamp-test",
        updatedAt: "2020-01-01T00:00:00.000Z",
      });
      await createArtifactInStore(artifact);

      await updateArtifact("timestamp-test", { description: "new desc" });

      const updated = await getArtifactById("timestamp-test");
      expect(updated!.updatedAt).not.toBe("2020-01-01T00:00:00.000Z");
      const date = new Date(updated!.updatedAt);
      expect(date.getTime()).not.toBeNaN();
    });

    it("throws for non-existent artifact", async () => {
      await expect(
        updateArtifact("nonexistent", { name: "Nope" }),
      ).rejects.toThrow("Artifact not found: nonexistent");
    });

    it("preserves fields not in update", async () => {
      const artifact = makeArtifact({
        id: "partial-update",
        name: "Original",
        description: "Keep this",
      });
      await createArtifactInStore(artifact);

      await updateArtifact("partial-update", { name: "Changed" });

      const updated = await getArtifactById("partial-update");
      expect(updated!.name).toBe("Changed");
      expect(updated!.description).toBe("Keep this");
    });
  });

  describe("deleteArtifact", () => {
    it("removes artifact from store", async () => {
      const artifact = makeArtifact({ id: "delete-me" });
      await createArtifactInStore(artifact);

      await deleteArtifact("delete-me");

      const result = await getArtifactById("delete-me");
      expect(result).toBeUndefined();
    });

    it("does not throw for non-existent id", async () => {
      await expect(deleteArtifact("nonexistent")).resolves.toBeUndefined();
    });

    it("only deletes the targeted artifact", async () => {
      await createArtifactInStore(makeArtifact({ id: "keep" }));
      await createArtifactInStore(makeArtifact({ id: "remove" }));

      await deleteArtifact("remove");

      const remaining = await getAllArtifacts();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe("keep");
    });
  });

  // ---- Seed initialization ----

  describe("initSeedArtifacts", () => {
    it("loads seed artifacts into empty store", async () => {
      await initSeedArtifacts();

      const all = await getAllArtifacts();
      expect(all.length).toBe(8);
    });

    it("does not duplicate seeds on second call", async () => {
      await initSeedArtifacts();
      await initSeedArtifacts();

      const all = await getAllArtifacts();
      expect(all.length).toBe(8);
    });

    it("skips seeding when store already has data", async () => {
      await createArtifactInStore(
        makeArtifact({ id: "existing", aliases: ["existing"] }),
      );

      await initSeedArtifacts();

      const all = await getAllArtifacts();
      // Should only have the one we added, not 8 seeds
      expect(all.length).toBe(1);
    });

    it("seeds have valid structure", async () => {
      await initSeedArtifacts();

      const all = await getAllArtifacts();
      for (const artifact of all) {
        expect(artifact.id).toMatch(/^seed-/);
        expect(artifact.isSeed).toBe(true);
        expect(artifact.blocks.length).toBeGreaterThan(0);
        expect(artifact.aliases.length).toBeGreaterThan(0);
      }
    });

    it("seed blocks have recomputed token counts", async () => {
      await initSeedArtifacts();

      const all = await getAllArtifacts();
      for (const artifact of all) {
        for (const block of artifact.blocks) {
          expect(block.tokenCount).toBeGreaterThan(0);
        }
      }
    });

    it("AI seed is findable by alias after init", async () => {
      await initSeedArtifacts();

      const ai = await getArtifactByAlias("ai");
      expect(ai).toBeDefined();
      expect(ai!.name).toBe("Artificial Intelligence");
    });

    it("security seed is findable by alias after init", async () => {
      await initSeedArtifacts();

      const sec = await getArtifactByAlias("security");
      expect(sec).toBeDefined();
      expect(sec!.name).toBe("Security");
    });
  });
});
