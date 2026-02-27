import type { ArtifactRef } from "@/core/types";
import { getArtifactByAlias } from "./store";

export function extractArtifactRefs(text: string): string[] {
  const pattern = /@([A-Za-z][A-Za-z0-9_]*)/g;
  const refs: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    refs.push(match[1]);
  }

  return refs;
}

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
