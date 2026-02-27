import type {
  Artifact,
  InjectedBlock,
  InjectionReport,
  InjectionReportEntry,
} from "@/core/types";

export function injectBlocks(
  artifacts: Artifact[],
  sectionTags: string[],
  tokenBudget: number
): { blocks: InjectedBlock[]; report: InjectionReport } {
  const entries: InjectionReportEntry[] = [];
  const included: InjectedBlock[] = [];

  // Gather all blocks with their parent artifact info
  const candidates = artifacts.flatMap((a) =>
    a.blocks.map((b) => ({ artifact: a, block: b }))
  );

  // Phase 1: Filter doNotSend
  const afterDoNotSend = candidates.filter(({ artifact, block }) => {
    if (block.doNotSend) {
      entries.push({
        artifactId: artifact.id,
        artifactName: artifact.name,
        blockId: block.id,
        blockLabel: block.label,
        included: false,
        reason: "do_not_send flag",
        priority: block.priority,
        tokenCount: block.tokenCount,
      });
      return false;
    }
    return true;
  });

  // Phase 2: Filter by section tags (if any specified)
  const afterTags =
    sectionTags.length > 0
      ? afterDoNotSend.filter(({ artifact, block }) => {
          const hasMatch = block.tags.some((t) => sectionTags.includes(t));
          if (!hasMatch) {
            entries.push({
              artifactId: artifact.id,
              artifactName: artifact.name,
              blockId: block.id,
              blockLabel: block.label,
              included: false,
              reason: "no matching tags",
              priority: block.priority,
              tokenCount: block.tokenCount,
            });
          }
          return hasMatch;
        })
      : afterDoNotSend;

  // Phase 3: Sort by priority descending
  afterTags.sort((a, b) => b.block.priority - a.block.priority);

  // Phase 4: Budget enforcement
  let tokensUsed = 0;

  for (const { artifact, block } of afterTags) {
    if (tokenBudget > 0 && tokensUsed + block.tokenCount > tokenBudget) {
      entries.push({
        artifactId: artifact.id,
        artifactName: artifact.name,
        blockId: block.id,
        blockLabel: block.label,
        included: false,
        reason: `exceeded token budget of ${tokenBudget}`,
        priority: block.priority,
        tokenCount: block.tokenCount,
      });
      continue;
    }

    tokensUsed += block.tokenCount;

    included.push({
      artifactId: artifact.id,
      artifactName: artifact.name,
      blockId: block.id,
      blockLabel: block.label,
      content: block.content,
      tags: block.tags,
      priority: block.priority,
      tokenCount: block.tokenCount,
    });

    entries.push({
      artifactId: artifact.id,
      artifactName: artifact.name,
      blockId: block.id,
      blockLabel: block.label,
      included: true,
      reason: "included",
      priority: block.priority,
      tokenCount: block.tokenCount,
    });
  }

  const report: InjectionReport = {
    entries,
    totalTokensUsed: tokensUsed,
    totalTokensBudget: tokenBudget,
    blocksIncluded: included.length,
    blocksOmitted: entries.filter((e) => !e.included).length,
  };

  return { blocks: included, report };
}
