import type { ArtifactRef } from "@/core/types";
import { getArtifactByAlias } from "./store";

export async function resolveRefs(rawRefs: string[]): Promise<ArtifactRef[]> {
  const results: ArtifactRef[] = [];

  for (const raw of rawRefs) {
    const normalized = raw.toLowerCase();
    const artifact = await getArtifactByAlias(normalized);

    results.push({
      raw,
      artifactId: artifact?.id ?? "",
      artifactName: artifact?.name ?? "",
      resolved: !!artifact,
    });
  }

  return results;
}
