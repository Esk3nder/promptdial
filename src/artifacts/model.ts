import type { Artifact, ArtifactBlock } from "@/core/types";
import { estimateTokens } from "@/app/lib/tokens";

export function generateAliases(name: string): string[] {
  const lower = name.toLowerCase();
  const noSpaces = lower.replace(/\s+/g, "");
  const hyphenated = lower.replace(/\s+/g, "-");
  const aliases = [noSpaces];

  if (hyphenated !== noSpaces) {
    aliases.push(hyphenated);
  }

  // Add acronym for multi-word names
  const words = lower.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const acronym = words.map((w) => w[0]).join("");
    if (!aliases.includes(acronym)) {
      aliases.push(acronym);
    }
  }

  return aliases;
}

export function createBlock(
  label: string,
  content: string,
  tags: string[],
  priority = 50
): ArtifactBlock {
  return {
    id: crypto.randomUUID(),
    label,
    content,
    tags,
    priority,
    doNotSend: false,
    tokenCount: estimateTokens(content),
  };
}

export function createArtifact(name: string, description: string): Artifact {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    aliases: generateAliases(name),
    description,
    blocks: [],
    version: 1,
    createdAt: now,
    updatedAt: now,
    isSeed: false,
  };
}
