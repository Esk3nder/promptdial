import type { TemplateDefinition } from "@/core/types";

export const decisionMemo: TemplateDefinition = {
  id: "decision-memo",
  name: "Decision Memo",
  description: "Structured decision analysis with options and recommendations",
  systemInstruction:
    "You are a strategic decision analyst. Present options objectively, analyze trade-offs rigorously, and provide clear, well-reasoned recommendations.",
  sections: [
    {
      heading: "Context",
      minDial: 0,
      instruction:
        "Describe the situation, background, and why a decision is needed now.",
      required: true,
    },
    {
      heading: "Options",
      minDial: 0,
      instruction:
        "Present the available options or alternatives under consideration.",
      required: true,
    },
    {
      heading: "Analysis",
      minDial: 1,
      instruction:
        "Compare options across relevant dimensions with supporting evidence.",
      required: false,
    },
    {
      heading: "Recommendation",
      minDial: 0,
      instruction:
        "State the recommended option with clear rationale.",
      required: true,
    },
    {
      heading: "Trade-offs",
      minDial: 2,
      instruction:
        "Explicitly enumerate what is gained and lost with the recommendation.",
      required: false,
    },
    {
      heading: "Implementation Plan",
      minDial: 3,
      instruction:
        "Outline steps to execute the recommended option.",
      required: false,
    },
    {
      heading: "Rollback Plan",
      minDial: 4,
      instruction:
        "Describe how to reverse the decision if outcomes are unfavorable.",
      required: false,
    },
  ],
};
