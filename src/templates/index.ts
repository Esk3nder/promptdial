import type { TemplateDefinition, TemplateId } from "@/core/types";
import { academicReport } from "./academic-report";
import { prd } from "./prd";
import { decisionMemo } from "./decision-memo";
import { critique } from "./critique";
import { researchBrief } from "./research-brief";

export const templates: Map<TemplateId, TemplateDefinition> = new Map([
  ["academic-report", academicReport],
  ["prd", prd],
  ["decision-memo", decisionMemo],
  ["critique", critique],
  ["research-brief", researchBrief],
]);

export function getTemplate(id: TemplateId): TemplateDefinition {
  const template = templates.get(id);
  if (!template) {
    throw new Error(`Unknown template: ${id}`);
  }
  return template;
}

export { academicReport, prd, decisionMemo, critique, researchBrief };
