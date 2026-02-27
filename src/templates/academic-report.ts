import type { TemplateDefinition } from "@/core/types";

export const academicReport: TemplateDefinition = {
  id: "academic-report",
  name: "Academic Report",
  description: "Structured academic or research report",
  systemInstruction:
    "You are an academic writing assistant. Produce well-structured, evidence-based content with proper citations and rigorous analysis.",
  sections: [
    {
      heading: "Executive Summary",
      minDial: 0,
      instruction:
        "Provide a concise overview of the topic, key findings, and conclusions.",
      required: true,
    },
    {
      heading: "Introduction",
      minDial: 0,
      instruction:
        "Introduce the topic, state the research question or thesis, and outline the scope.",
      required: true,
    },
    {
      heading: "Background",
      minDial: 1,
      instruction:
        "Provide historical context and prior work relevant to the topic.",
      required: false,
    },
    {
      heading: "Methodology",
      minDial: 2,
      instruction:
        "Describe the approach, framework, or methodology used in the analysis.",
      required: false,
    },
    {
      heading: "Analysis",
      minDial: 1,
      instruction:
        "Present detailed analysis with supporting evidence and data.",
      required: true,
    },
    {
      heading: "Discussion",
      minDial: 2,
      instruction:
        "Interpret findings, discuss implications, compare with existing literature.",
      required: false,
    },
    {
      heading: "Limitations",
      minDial: 3,
      instruction:
        "Acknowledge limitations of the analysis and potential biases.",
      required: false,
    },
    {
      heading: "Future Work",
      minDial: 4,
      instruction:
        "Suggest areas for further research and investigation.",
      required: false,
    },
    {
      heading: "Conclusion",
      minDial: 0,
      instruction: "Summarize key findings and their significance.",
      required: true,
    },
    {
      heading: "References",
      minDial: 3,
      instruction: "List all sources cited in the report.",
      required: false,
    },
  ],
};
