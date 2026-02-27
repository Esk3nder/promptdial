import { db } from "@/app/lib/db";
import type { Artifact } from "@/core/types";

export async function getAllArtifacts(): Promise<Artifact[]> {
  return db.artifacts.toArray();
}

export async function getArtifactById(
  id: string
): Promise<Artifact | undefined> {
  return db.artifacts.get(id);
}

export async function getArtifactByAlias(
  alias: string
): Promise<Artifact | undefined> {
  const normalized = alias.toLowerCase();
  return db.artifacts.where("aliases").equals(normalized).first();
}

export async function createArtifactInStore(
  artifact: Artifact
): Promise<string> {
  await db.artifacts.add(artifact);
  return artifact.id;
}

export async function updateArtifact(
  id: string,
  updates: Partial<Artifact>
): Promise<void> {
  const existing = await db.artifacts.get(id);
  if (!existing) throw new Error(`Artifact not found: ${id}`);

  await db.artifacts.update(id, {
    ...updates,
    version: existing.version + 1,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteArtifact(id: string): Promise<void> {
  await db.artifacts.delete(id);
}

export async function initSeedArtifacts(): Promise<void> {
  const count = await db.artifacts.count();
  if (count > 0) return;

  const seeds: Artifact[] = await Promise.all([
    import("./seeds/ai.json").then((m) => m.default as Artifact),
    import("./seeds/ml.json").then((m) => m.default as Artifact),
    import("./seeds/llms.json").then((m) => m.default as Artifact),
    import("./seeds/product-management.json").then((m) => m.default as Artifact),
    import("./seeds/startups.json").then((m) => m.default as Artifact),
    import("./seeds/security.json").then((m) => m.default as Artifact),
    import("./seeds/data-science.json").then((m) => m.default as Artifact),
    import("./seeds/ux-design.json").then((m) => m.default as Artifact),
  ]);

  await db.artifacts.bulkAdd(seeds);
}
