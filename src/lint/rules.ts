import type { PromptSpec, LintResult } from "@/core/types";
import { estimateTokens } from "@/app/lib/tokens";

export interface LintRule {
  id: string;
  name: string;
  check: (spec: PromptSpec, rendered: string) => LintResult | null;
}

export const rules: LintRule[] = [
  // 1. vague-input: warning if rawInput < 10 words
  {
    id: "vague-input",
    name: "Vague Input",
    check: (spec) => {
      const words = spec.rawInput.trim().split(/\s+/).filter(Boolean);
      if (words.length < 10) {
        return {
          ruleId: "vague-input",
          ruleName: "Vague Input",
          severity: "warning",
          message: `Input is only ${words.length} words. More specific inputs produce better prompts.`,
          fix: "Add more detail: specify the topic, audience, purpose, and desired depth.",
        };
      }
      return null;
    },
  },

  // 2. missing-constraints: warning if no constraints extracted
  {
    id: "missing-constraints",
    name: "Missing Constraints",
    check: (spec) => {
      if (spec.constraints.length === 0) {
        return {
          ruleId: "missing-constraints",
          ruleName: "Missing Constraints",
          severity: "warning",
          message: "No constraints detected. Prompts without audience, tone, or length guidance tend to produce generic output.",
          fix: "Specify constraints like target audience, tone (formal/casual), length, or format requirements.",
        };
      }
      return null;
    },
  },

  // 3. no-template-match: warning if input is too generic to confidently match a template
  {
    id: "no-template-match",
    name: "Weak Template Match",
    check: (spec) => {
      const templateKeywords: Record<string, string[]> = {
        "academic-report": ["research", "study", "analysis", "findings", "methodology", "hypothesis", "literature", "academic", "paper", "thesis", "report"],
        "prd": ["product", "feature", "requirements", "user story", "stakeholder", "roadmap", "specification", "mvp", "sprint"],
        "decision-memo": ["decision", "options", "tradeoff", "recommend", "evaluate", "compare", "choose", "pros", "cons", "alternative"],
        "critique": ["critique", "review", "evaluate", "strengths", "weaknesses", "feedback", "assess", "opinion", "argument"],
        "research-brief": ["brief", "overview", "summary", "landscape", "market", "trends", "survey", "competitive", "insights"],
      };

      const inputLower = spec.rawInput.toLowerCase();
      const keywords = templateKeywords[spec.templateId] ?? [];
      const matchCount = keywords.filter((kw) => inputLower.includes(kw)).length;

      if (matchCount === 0) {
        return {
          ruleId: "no-template-match",
          ruleName: "Weak Template Match",
          severity: "warning",
          message: `Input doesn't contain keywords typical for the "${spec.templateId}" template. The auto-detected template may not be the best fit.`,
          fix: `Consider using a different template, or add context that aligns with the "${spec.templateId}" format.`,
        };
      }
      return null;
    },
  },

  // 4. budget-exceeded: error if rendered prompt tokens exceed tokenBudget
  {
    id: "budget-exceeded",
    name: "Budget Exceeded",
    check: (spec, rendered) => {
      if (spec.tokenBudget <= 0) return null;

      const estimatedTokens = estimateTokens(rendered);
      if (estimatedTokens > spec.tokenBudget) {
        return {
          ruleId: "budget-exceeded",
          ruleName: "Budget Exceeded",
          severity: "error",
          message: `Rendered prompt is ~${estimatedTokens} tokens, exceeding the ${spec.tokenBudget} token budget.`,
          fix: "Lower the dial level, reduce artifact inclusions, or increase the token budget.",
        };
      }
      return null;
    },
  },

  // 5. empty-sections: warning for sections with empty instruction and no injected blocks
  {
    id: "empty-sections",
    name: "Empty Sections",
    check: (spec) => {
      const emptySections = spec.sections.filter(
        (s) => !s.instruction.trim() && s.injectedBlocks.length === 0,
      );
      if (emptySections.length > 0) {
        const names = emptySections.map((s) => `"${s.heading}"`).join(", ");
        return {
          ruleId: "empty-sections",
          ruleName: "Empty Sections",
          severity: "warning",
          message: `${emptySections.length} section(s) have no content: ${names}.`,
          fix: "Remove empty sections by lowering the dial, or add instructions/artifacts to fill them.",
        };
      }
      return null;
    },
  },

  // 6. do-not-send-leak: error if any injectedBlock has a "do-not-send" tag
  // The block-selector filters doNotSend blocks by their boolean flag, but
  // this rule provides a safety net by also checking for the conventional
  // "do-not-send" tag in case a block's tag signals sensitivity even when
  // the boolean flag was not set.
  {
    id: "do-not-send-leak",
    name: "Do-Not-Send Leak",
    check: (spec) => {
      const leakedBlocks: string[] = [];

      for (const section of spec.sections) {
        for (const block of section.injectedBlocks) {
          const lowerTags = block.tags.map((t) => t.toLowerCase());
          if (
            lowerTags.includes("do-not-send") ||
            lowerTags.includes("donotsend") ||
            lowerTags.includes("sensitive") ||
            lowerTags.includes("internal-only")
          ) {
            leakedBlocks.push(`${block.artifactName}/${block.blockLabel}`);
          }
        }
      }

      if (leakedBlocks.length > 0) {
        return {
          ruleId: "do-not-send-leak",
          ruleName: "Do-Not-Send Leak",
          severity: "error",
          message: `${leakedBlocks.length} potentially sensitive block(s) in output: ${leakedBlocks.join(", ")}.`,
          fix: "Review blocks with sensitive tags (do-not-send, sensitive, internal-only). Mark them doNotSend: true in the artifact to exclude from output.",
        };
      }
      return null;
    },
  },
];
