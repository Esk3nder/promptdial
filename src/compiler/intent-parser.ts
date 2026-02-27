import type { TemplateId } from "@/core/types";

export interface ParsedIntent {
  templateId: TemplateId;
  confidence: number;
  constraints: string[];
  artifactRefs: string[];
  cleanedInput: string;
}

const TEMPLATE_KEYWORDS: Record<TemplateId, string[]> = {
  "academic-report": ["report", "research", "study", "paper", "academic", "thesis"],
  prd: ["prd", "product", "requirements", "feature", "spec", "specification"],
  "decision-memo": ["decide", "decision", "choose", "option", "memo", "compare"],
  critique: ["critique", "review", "evaluate", "assess", "assessment", "criticism"],
  "research-brief": ["brief", "summary", "overview", "findings", "digest"],
};

const CONSTRAINT_PATTERNS: { pattern: RegExp; extract: (m: RegExpMatchArray) => string }[] = [
  { pattern: /\bfor\s+([\w\s]+?)(?:\s+audience|\s*[,.])/i, extract: (m) => `Audience: ${m[1].trim()}` },
  { pattern: /\bin\s+(formal|casual|technical|conversational|academic)\s+tone\b/i, extract: (m) => `Tone: ${m[1]}` },
  { pattern: /\bunder\s+(\d+)\s+words?\b/i, extract: (m) => `Max words: ${m[1]}` },
  { pattern: /\b(formal|casual|technical|conversational|academic)\b/i, extract: (m) => `Tone: ${m[1]}` },
  { pattern: /\bmax(?:imum)?\s+(\d+)\s+(?:words?|tokens?)\b/i, extract: (m) => `Max length: ${m[1]} ${m[0].includes("token") ? "tokens" : "words"}` },
];

export function parseIntent(
  rawInput: string,
  templateOverride?: TemplateId
): ParsedIntent {
  // Extract @references
  const refMatches = rawInput.match(/@(\w+)/g) || [];
  const artifactRefs = refMatches.map((r) => r.slice(1));
  const cleanedInput = rawInput.replace(/@\w+/g, "").trim();

  // Detect template
  let templateId: TemplateId = "academic-report";
  let confidence = 0.3; // default low confidence

  if (templateOverride) {
    templateId = templateOverride;
    confidence = 1.0;
  } else {
    const lower = cleanedInput.toLowerCase();
    let bestScore = 0;

    for (const [id, keywords] of Object.entries(TEMPLATE_KEYWORDS) as [TemplateId, string[]][]) {
      let score = 0;
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          score += 1;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        templateId = id;
        confidence = Math.min(0.5 + score * 0.2, 1.0);
      }
    }
  }

  // Extract constraints
  const constraints: string[] = [];
  const seen = new Set<string>();

  for (const { pattern, extract } of CONSTRAINT_PATTERNS) {
    const match = cleanedInput.match(pattern);
    if (match) {
      const constraint = extract(match);
      // Deduplicate by prefix (e.g., "Tone:")
      const prefix = constraint.split(":")[0];
      if (!seen.has(prefix)) {
        seen.add(prefix);
        constraints.push(constraint);
      }
    }
  }

  return {
    templateId,
    confidence,
    constraints,
    artifactRefs,
    cleanedInput,
  };
}
