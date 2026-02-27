import type { ArtifactBlock, InjectedBlock } from "@/core/types";

export interface BlockSelectionInput {
  blocks: ArtifactBlock[];
  sectionTags: string[];
  tokenBudget: number;
  artifactId: string;
  artifactName: string;
}

export interface BlockSelectionResult {
  included: InjectedBlock[];
  omitted: { block: ArtifactBlock; reason: string }[];
  tokensUsed: number;
}

export function selectBlocks(input: BlockSelectionInput): BlockSelectionResult {
  const { blocks, sectionTags, tokenBudget, artifactId, artifactName } = input;
  const included: InjectedBlock[] = [];
  const omitted: { block: ArtifactBlock; reason: string }[] = [];
  let tokensUsed = 0;

  // Filter out doNotSend, then filter by tag match, then sort by priority desc
  const candidates: ArtifactBlock[] = [];

  for (const block of blocks) {
    if (block.doNotSend) {
      omitted.push({ block, reason: "do_not_send flag" });
      continue;
    }

    // If sectionTags is empty, include all non-doNotSend blocks
    if (sectionTags.length > 0) {
      const hasMatch = block.tags.some((tag) =>
        sectionTags.includes(tag.toLowerCase())
      );
      if (!hasMatch) {
        omitted.push({ block, reason: "no matching tags" });
        continue;
      }
    }

    candidates.push(block);
  }

  // Sort by priority descending
  candidates.sort((a, b) => b.priority - a.priority);

  // Greedily add blocks within budget
  for (const block of candidates) {
    if (tokenBudget > 0 && tokensUsed + block.tokenCount > tokenBudget) {
      omitted.push({ block, reason: "exceeded token budget" });
      continue;
    }

    included.push({
      artifactId,
      artifactName,
      blockId: block.id,
      blockLabel: block.label,
      content: block.content,
      tags: block.tags,
      priority: block.priority,
      tokenCount: block.tokenCount,
    });

    tokensUsed += block.tokenCount;
  }

  return { included, omitted, tokensUsed };
}
