import type { PromptSpec } from "@/core/types";

export function renderPrompt(spec: PromptSpec): string {
  const parts: string[] = [];

  // System instruction
  parts.push("[System Instruction]");
  parts.push(spec.systemInstruction);
  parts.push("");
  parts.push("---");

  // Sections
  for (const section of spec.sections) {
    parts.push("");
    parts.push(`# ${section.heading}`);
    parts.push("");
    parts.push(section.instruction);

    // Injected blocks
    for (const block of section.injectedBlocks) {
      parts.push("");
      parts.push(`## [Context: ${block.blockLabel}]`);
      parts.push(block.content);
    }

    parts.push("");
    parts.push("---");
  }

  // Constraints
  if (spec.constraints.length > 0) {
    parts.push("");
    parts.push("[Constraints]");
    parts.push(spec.constraints.join("\n"));
  }

  return parts.join("\n");
}
