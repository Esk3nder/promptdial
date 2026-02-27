import type { TemplateDefinition } from "@/core/types";

export const critique: TemplateDefinition = {
  id: "critique",
  name: "Critique",
  description: "Balanced critical analysis with strengths, weaknesses, and recommendations",
  systemInstruction:
    "You are a critical analysis assistant. Provide balanced, evidence-based evaluation with clear reasoning. Identify both strengths and weaknesses objectively.",
  sections: [
    {
      heading: "Summary",
      minDial: 0,
      instruction:
        "Provide a brief summary of the subject being critiqued.",
      required: true,
    },
    {
      heading: "Strengths",
      minDial: 0,
      instruction:
        "Identify and explain the key strengths and positive aspects.",
      required: true,
    },
    {
      heading: "Weaknesses",
      minDial: 0,
      instruction:
        "Identify and explain the key weaknesses and areas for improvement.",
      required: true,
    },
    {
      heading: "Evidence Assessment",
      minDial: 2,
      instruction:
        "Evaluate the quality and reliability of evidence presented.",
      required: false,
    },
    {
      heading: "Methodology Review",
      minDial: 3,
      instruction:
        "Assess the methodology, approach, or framework used.",
      required: false,
    },
    {
      heading: "Alternative Perspectives",
      minDial: 3,
      instruction:
        "Present alternative viewpoints and counterarguments.",
      required: false,
    },
    {
      heading: "Recommendations",
      minDial: 1,
      instruction:
        "Provide actionable recommendations for improvement.",
      required: false,
    },
  ],
};
