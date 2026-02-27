import type { TemplateDefinition } from "@/core/types";

export const researchBrief: TemplateDefinition = {
  id: "research-brief",
  name: "Research Brief",
  description: "Concise research summary with key findings and recommendations",
  systemInstruction:
    "You are a research analyst. Synthesize information clearly, highlight key findings, and provide actionable recommendations backed by data.",
  sections: [
    {
      heading: "Key Findings",
      minDial: 0,
      instruction:
        "Present the most important findings and insights upfront.",
      required: true,
    },
    {
      heading: "Background",
      minDial: 1,
      instruction:
        "Provide context and background information on the research topic.",
      required: false,
    },
    {
      heading: "Data Sources",
      minDial: 2,
      instruction:
        "Describe the data sources, their reliability, and any limitations.",
      required: false,
    },
    {
      heading: "Analysis",
      minDial: 1,
      instruction:
        "Present the detailed analysis supporting the key findings.",
      required: false,
    },
    {
      heading: "Implications",
      minDial: 2,
      instruction:
        "Discuss the implications of the findings for stakeholders.",
      required: false,
    },
    {
      heading: "Recommendations",
      minDial: 0,
      instruction:
        "Provide clear, actionable recommendations based on the analysis.",
      required: true,
    },
    {
      heading: "Appendix",
      minDial: 4,
      instruction:
        "Include supplementary data, charts, and detailed methodology.",
      required: false,
    },
  ],
};
