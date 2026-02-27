import type {
  ArtifactRef,
  DialLevel,
  InjectedBlock,
  PromptSpec,
  PromptSpecSection,
  TemplateDefinition,
} from "@/core/types";

export interface SpecGeneratorInput {
  parsedIntent: { templateId: string; constraints: string[]; cleanedInput: string };
  template: TemplateDefinition;
  dial: DialLevel;
  tokenBudget: number;
  resolvedBlocks: Map<string, InjectedBlock[]>;
  artifactRefs: ArtifactRef[];
}

export function generateSpec(input: SpecGeneratorInput): PromptSpec {
  const { parsedIntent, template, dial, tokenBudget, resolvedBlocks, artifactRefs } = input;

  // Filter sections by dial level
  const sections: PromptSpecSection[] = [];

  for (const sectionSpec of template.sections) {
    if (sectionSpec.minDial <= dial) {
      const blocks = resolvedBlocks.get(sectionSpec.heading) || [];
      sections.push({
        heading: sectionSpec.heading,
        instruction: sectionSpec.instruction,
        injectedBlocks: blocks,
      });
    }
  }

  return {
    id: crypto.randomUUID(),
    rawInput: parsedIntent.cleanedInput,
    templateId: template.id,
    dial,
    tokenBudget,
    systemInstruction: template.systemInstruction,
    sections,
    constraints: parsedIntent.constraints,
    artifactRefs,
    meta: {
      totalTokens: 0, // filled later by pipeline
      compileDurationMs: 0, // filled later by pipeline
      compiledAt: new Date().toISOString(),
      lintScore: 100, // filled later by pipeline
    },
  };
}
