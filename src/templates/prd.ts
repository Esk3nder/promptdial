import type { TemplateDefinition } from "@/core/types";

export const prd: TemplateDefinition = {
  id: "prd",
  name: "Product Requirements Document",
  description: "Comprehensive product requirements and feature specification",
  systemInstruction:
    "You are a product management assistant. Produce clear, actionable product requirements with well-defined user stories, success metrics, and technical considerations.",
  sections: [
    {
      heading: "Problem Statement",
      minDial: 0,
      instruction:
        "Define the problem being solved, who it affects, and why it matters.",
      required: true,
    },
    {
      heading: "User Personas",
      minDial: 1,
      instruction:
        "Describe the target users, their needs, goals, and pain points.",
      required: false,
    },
    {
      heading: "Requirements",
      minDial: 0,
      instruction:
        "List functional and non-functional requirements with clear acceptance criteria.",
      required: true,
    },
    {
      heading: "User Stories",
      minDial: 2,
      instruction:
        "Write user stories in the format: As a [persona], I want [goal] so that [benefit].",
      required: false,
    },
    {
      heading: "Technical Architecture",
      minDial: 3,
      instruction:
        "Outline the technical approach, system components, and integration points.",
      required: false,
    },
    {
      heading: "Success Metrics",
      minDial: 1,
      instruction:
        "Define measurable KPIs and success criteria for the product.",
      required: false,
    },
    {
      heading: "Timeline",
      minDial: 2,
      instruction:
        "Provide a phased timeline with milestones and deliverables.",
      required: false,
    },
    {
      heading: "Risks",
      minDial: 3,
      instruction:
        "Identify risks, dependencies, and mitigation strategies.",
      required: false,
    },
    {
      heading: "Appendix",
      minDial: 4,
      instruction:
        "Include supplementary materials, references, and supporting documents.",
      required: false,
    },
  ],
};
