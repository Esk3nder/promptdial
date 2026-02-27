import type {
  Artifact,
  ArtifactRef,
  CompileInput,
  CompileOutput,
  InjectedBlock,
  InjectionReport,
  InjectionReportEntry,
} from "@/core/types";
import { estimateTokens } from "@/app/lib/tokens";
import { getTemplate } from "@/templates/index";
import { parseIntent } from "@/compiler/intent-parser";
import { selectBlocks } from "@/compiler/block-selector";
import { generateSpec } from "@/compiler/spec-generator";
import { renderPrompt } from "@/compiler/renderer";
import { runLint } from "@/lint/engine";
import { calculateScore } from "@/lint/scorer";

/** Resolves raw @reference strings to ArtifactRef objects */
export type ArtifactResolverFn = (refs: string[]) => Promise<ArtifactRef[]>;

/** Fetches a full artifact by ID */
export type ArtifactFetcherFn = (id: string) => Promise<Artifact | null>;

export async function compile(
  input: CompileInput,
  resolveArtifacts: ArtifactResolverFn,
  fetchArtifact: ArtifactFetcherFn,
): Promise<CompileOutput> {
  const start = performance.now();

  // 1. Parse intent
  const parsedIntent = parseIntent(input.rawInput, input.templateOverride);

  // 2. Get template
  const template = getTemplate(parsedIntent.templateId);

  // 3. Resolve artifact references
  const allRefs = [
    ...parsedIntent.artifactRefs,
    ...(input.forceArtifacts ?? []),
  ];
  const artifactRefs = allRefs.length > 0
    ? await resolveArtifacts(allRefs)
    : [];

  // 4. Fetch full artifacts and select blocks per section
  const resolvedBlocks = new Map<string, InjectedBlock[]>();
  const allInjectionEntries: InjectionReportEntry[] = [];
  let totalTokensUsed = 0;

  const resolvedArtifactIds = artifactRefs
    .filter((ref) => ref.resolved)
    .map((ref) => ref.artifactId);

  const artifacts: Artifact[] = [];
  for (const artifactId of resolvedArtifactIds) {
    const artifact = await fetchArtifact(artifactId);
    if (artifact) {
      artifacts.push(artifact);
    }
  }

  // Filter sections active at this dial level
  const activeSections = template.sections.filter(
    (s) => s.minDial <= input.dial
  );

  // For each section, select blocks from all artifacts
  for (const section of activeSections) {
    const sectionBlocks: InjectedBlock[] = [];
    const sectionTags = [section.heading.toLowerCase()];

    for (const artifact of artifacts) {
      const result = selectBlocks({
        blocks: artifact.blocks,
        sectionTags,
        tokenBudget: input.tokenBudget > 0
          ? Math.max(0, input.tokenBudget - totalTokensUsed)
          : 0,
        artifactId: artifact.id,
        artifactName: artifact.name,
      });

      sectionBlocks.push(...result.included);
      totalTokensUsed += result.tokensUsed;

      for (const block of result.included) {
        allInjectionEntries.push({
          artifactId: block.artifactId,
          artifactName: block.artifactName,
          blockId: block.blockId,
          blockLabel: block.blockLabel,
          included: true,
          reason: "matched section tags",
          priority: block.priority,
          tokenCount: block.tokenCount,
        });
      }

      for (const { block, reason } of result.omitted) {
        allInjectionEntries.push({
          artifactId: artifact.id,
          artifactName: artifact.name,
          blockId: block.id,
          blockLabel: block.label,
          included: false,
          reason,
          priority: block.priority,
          tokenCount: block.tokenCount,
        });
      }
    }

    if (sectionBlocks.length > 0) {
      resolvedBlocks.set(section.heading, sectionBlocks);
    }
  }

  // 5. Generate spec
  const spec = generateSpec({
    rawInput: input.rawInput,
    parsedIntent,
    template,
    dial: input.dial,
    tokenBudget: input.tokenBudget,
    resolvedBlocks,
    artifactRefs,
  });

  // 6. Render prompt
  const rendered = renderPrompt(spec);

  // 7. Lint
  const lintResults = runLint(spec, rendered);
  const lintReport = calculateScore(lintResults);

  // 8. Finalize metadata
  const compileDurationMs = performance.now() - start;
  spec.meta.totalTokens = estimateTokens(rendered);
  spec.meta.compileDurationMs = compileDurationMs;
  spec.meta.lintScore = lintReport.score;

  // 9. Build injection report
  const injection: InjectionReport = {
    entries: allInjectionEntries,
    totalTokensUsed,
    totalTokensBudget: input.tokenBudget,
    blocksIncluded: allInjectionEntries.filter((e) => e.included).length,
    blocksOmitted: allInjectionEntries.filter((e) => !e.included).length,
  };

  return { spec, rendered, lint: lintReport, injection };
}
