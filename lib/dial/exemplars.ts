/**
 * Exemplar prompts for few-shot learning in the dial system.
 * These demonstrate the transformation from "lazy" prompts to rigorous, optimized prompts.
 */

export type TaskType = 'content' | 'analysis' | 'code' | 'planning' | 'extraction';

export interface Exemplar {
  id: string;
  taskType: TaskType;
  lazyPrompt: string;
  rigorousPrompt: string;
}

/**
 * Collection of exemplar prompts covering the main task categories.
 */
export const EXEMPLARS: Record<TaskType, Exemplar> = {
  content: {
    id: 'content-blog-ai',
    taskType: 'content',
    lazyPrompt: 'write a blog about AI',
    rigorousPrompt: `You are an expert AI explainer and long-form technology blogger.

## Objective

Write a compelling, well-structured blog post that introduces **artificial intelligence (AI)** to a broad, smart audience. Assume the user originally typed only: **"write a blog about AI"**. Your job is to deliver the rich, thoughtful article they *actually* wanted.

The blog should answer:
- What AI is (in modern terms, especially generative AI and large language models).
- How it works at a high level (no math; intuitions and metaphors).
- Where it's useful today in everyday work and life.
- Where its limits, risks, and myths lie.
- How readers can start using AI effectively and responsibly.

## Audience

- Curious, non-expert professionals (knowledge workers, founders, students, creatives, engineers who aren't ML specialists).
- They are familiar with tools like ChatGPT or Copilot but don't really understand what AI is doing or how to get the most out of it.

## Learning Outcomes

By the end of the article, a reader should be able to:

1. Explain, in their own words, what "AI" means today (especially generative AI).
2. Describe at a high level how systems like ChatGPT are trained and why they feel conversational.
3. Identify 3–5 concrete, realistic use cases where AI can help them right now.
4. Recognize common limitations and risks (hallucinations, bias, data privacy, over-trust).
5. Apply a few practical prompting habits to get better results from AI tools in their own work.

Write in a way that deliberately targets these outcomes.

## Tone & Voice

- Tone: Conversational, confident, grounded; optimistic but not breathless or doomy.
- Voice: Like a senior engineer or researcher who's good at explaining things to non-experts.
- Style rules:
  - Prefer short paragraphs and clear sentences.
  - Use concrete examples and analogies, but don't overdo the metaphors.
  - Avoid marketing speak ("revolutionary," "paradigm shift") unless you immediately back it up with something specific.
  - Avoid first-person plural "we technologists"; speak directly to the reader ("you") where helpful.
  - Do **not** say "as an AI language model" or break the fourth wall.

## Section Structure

Use clear headings and subheadings (Markdown-style). At a minimum, include:

1. **Title**
   - One strong, honest, slightly catchy title about AI for curious professionals.

2. **Hook / Opening (1–3 short paragraphs)**
   - Anchor the reader in a concrete scene.
   - Surface the central promise: AI is powerful, but how you understand and use it determines the value you get.

3. **Section 1 — What We Mean by "AI" Today**
   - Clarify that "AI" is an umbrella term, but focus on machine learning and generative AI/LLMs.
   - Explain in plain language: These systems are trained on huge amounts of data to predict what comes next.

4. **Section 2 — How Generative AI Works (Without the Math)**
   - Give a high-level intuition using 1–2 simple analogies.

5. **Section 3 — Where AI Is Genuinely Useful Today**
   - Provide 4–7 concrete, specific examples across different domains.

6. **Section 4 — Limits, Risks, and Common Myths**
   - Cover hallucinations, bias, privacy & data, over-trust.
   - Gently debunk 2–3 common myths.

7. **Section 5 — How to Get Better Results from AI (Prompting Basics)**
   - Give 3–5 practical prompting patterns the reader can copy.

8. **Section 6 — What AI Might Mean for Work and Creativity**
   - Briefly explore AI as a "junior collaborator" and the enduring value of human judgment.

9. **Conclusion**
   - Reiterate the main message and encourage the reader to run one small experiment.

## Concrete Examples to Include

- One mini-story of a person using lazy prompts vs. better prompts.
- Two or more short example prompts that readers can copy-paste.
- At least one comparison table showing "Bad / vague prompt" vs. "Improved / specific prompt".

## Anti-Patterns to Avoid

- Vague hype without concrete examples.
- Overly technical deep dives that will lose non-expert readers.
- Long, unbroken text walls.
- Fabricated statistics or specific claims that aren't grounded.

## Formatting & Length

- Format in Markdown with \`#\` for main title, \`##\` and \`###\` for sections.
- Target length: roughly **1,800–2,400 words**.
- Output **only** the finished blog post content.`,
  },

  analysis: {
    id: 'analysis-react-vue',
    taskType: 'analysis',
    lazyPrompt: 'Compare React vs Vue',
    rigorousPrompt: `You are a senior frontend architect and technical evaluator.

## Objective

Produce a rigorous, decision-ready comparison of **React** vs **Vue** as front-end frameworks for building modern web applications.

The output should help a technical decision-maker answer:
- "Which framework is better for *our* situation?"
- "What tradeoffs am I accepting if I choose one over the other?"
- "What might this choice look like over the next 3–5 years?"

## Audience & Context

- Primary audience: CTOs, Heads of Engineering, Staff/Senior Frontend Engineers.
- They understand JavaScript/TypeScript and SPA concepts.
- They need to justify technology choices to both engineers and non-technical stakeholders.

Assume they are considering React vs Vue for **new or evolving production systems**, not toy projects.

## Learning Outcomes

By the end of your analysis, the reader should be able to:

1. Summarize React and Vue's core philosophies and mental models.
2. Compare them across key dimensions: ecosystem, performance, DX, scaling, hiring, and long-term risk.
3. Map those tradeoffs onto *specific* project scenarios.
4. Make a defensible framework choice for their context, with clear reasoning.

## Evaluation Criteria

Evaluate React vs Vue along at least these dimensions:

1. **Core Paradigm & Mental Model** - Component model, reactivity, rendering approach, state management patterns.
2. **Ecosystem & Community** - Meta-frameworks, routing, state libraries, community size.
3. **Developer Experience (DX)** - Tooling, TypeScript support, DevTools, learning curve.
4. **Performance & Architecture** - Bundle sizes, SSR/SSG/ISR support, scalability.
5. **Team & Org Considerations** - Hiring pool, onboarding time, enterprise alignment.
6. **Maintainability & Long-Term Viability** - API stability, upgrade paths, governance models.
7. **Integration & Interoperability** - Design systems, legacy codebases, micro-frontends.

## Evidence Requirements

- Ground claims in observable facts (official documentation, ecosystem conventions).
- Avoid fabricated statistics; use qualitative language when precise numbers aren't available.
- Be explicit when something is opinionated or version-dependent.

## Structure & Output Format

Include at minimum:

1. **Title** - A concise title, e.g., "React vs Vue: A Practical Comparison for Engineering Teams"
2. **Executive Summary (5–10 bullet points)** - Core differences, when each is a better fit, key risks.
3. **High-Level Overview** - Brief description of each framework's history and philosophy.
4. **Side-by-Side Comparison Table** - Paradigm, Ecosystem, DX, Performance, Learning Curve, Talent Availability, etc.
5. **Deep-Dive Sections (Narrative)** - For each major evaluation criterion.
6. **Decision Framework** - Simple, explicit framework for choosing (decision tree or checklist).
7. **Use-Case-Specific Guidance** - Address: Early-Stage SaaS, Large Enterprise, Content-Heavy Sites, Internal Tools.
8. **Risks, Tradeoffs, and Migration Considerations**
9. **Conclusion & Recommendation Patterns**

## Style & Constraints

- Clear, concise technical prose.
- Prefer bullet points and tables over dense paragraphs.
- Avoid fanboyism or framework evangelism.
- Format in Markdown with clear headings and at least one comparison table.
- Output **only** the final analysis.`,
  },

  code: {
    id: 'code-email-validation',
    taskType: 'code',
    lazyPrompt: 'Write a function to validate emails',
    rigorousPrompt: `You are a senior backend engineer and library designer.

## Objective

Design and implement a **robust, production-ready email validation utility**.

Your job is to produce what a high-quality engineering team would actually want:
- A clearly specified API (types, inputs, outputs).
- Thoughtful handling of edge cases and bad input.
- A small, maintainable implementation that avoids regex pitfalls.
- A comprehensive test suite that documents behavior.

Use **TypeScript** targeting a typical Node.js / browser-compatible library.

## API & Behavior Specification

### Language & Environment
- Language: **TypeScript**
- Target: ES2019+ JavaScript runtime (Node or browser).
- No external validation libraries; implement the logic directly.

### Public API

Implement and export:

\`\`\`ts
export type EmailValidationErrorCode =
  | 'NOT_STRING'
  | 'EMPTY'
  | 'TOO_LONG'
  | 'INVALID_FORMAT';

export interface EmailValidationResult {
  valid: boolean;
  sanitized: string | null;
  error?: EmailValidationErrorCode;
}

export function validateEmail(input: unknown): EmailValidationResult;
\`\`\`

**Behavior:**
- If \`input\` is not a string: \`{ valid: false, sanitized: null, error: 'NOT_STRING' }\`
- Trim leading/trailing whitespace before validation.
- Empty trimmed string: \`{ valid: false, sanitized: null, error: 'EMPTY' }\`
- Exceeds 320 characters: \`{ valid: false, sanitized: null, error: 'TOO_LONG' }\`
- Check pragmatic email format (not full RFC 5322), return valid/invalid accordingly.

## Validation Rules & Edge Cases

Implement email format validation using simple, safe rules:
1. Exactly **one \`@\`** character.
2. Non-empty **local part** (before \`@\`), with no spaces.
3. Non-empty **domain part** (after \`@\`): contains at least one \`.\`, no spaces, no leading/trailing dots.
4. Total length ≤ 320 characters.

### Required Edge Cases to Handle

- Valid: \`user@example.com\`, \`user.name+tag@sub.domain.co\`
- Whitespace handling: \`"  user@example.com  "\` → valid, sanitized \`"user@example.com"\`
- Invalid: \`"user@"\`, \`"@example.com"\`, \`"userexample.com"\`, \`"user@@example.com"\`, \`"user@localhost"\`, \`"user@.example.com"\`, \`"user@example.com."\`, \`"user name@example.com"\`
- Non-string input: \`null\`, \`undefined\`, \`42\`, \`{}\`, \`[]\` → all \`NOT_STRING\`
- Very long string: > 320 chars → \`TOO_LONG\`

## Error Handling Requirements

- **Never throw** for normal bad input; return a structured result instead.
- Ensure the validator is **pure**: no external I/O, no global state.

## Performance Constraints

- O(n) in input string length.
- Avoid regex patterns that risk **catastrophic backtracking**.
- Compile regex patterns **once** (module-level constant).
- Add comment noting how the regex avoids ReDoS-style issues.

## Security Considerations

Address in comments:
- **ReDoS safety**: how regex and length checks protect against catastrophic performance.
- **Input trust**: validation ≠ deliverability; not for auth/authz.
- **Sanitization**: only trims whitespace; does not escape for HTML/SQL.

## Tests & Examples

Use **Jest**. Produce:

1. **Test File** - Cover all required edge cases with table-driven tests.
2. **Usage Examples** - Show using \`validateEmail\` in a form handler and API endpoint.

## Output Format & Structure

Output in this order:

1. **Library Implementation** - \`validateEmail.ts\`
2. **Test Suite** - \`validateEmail.test.ts\`
3. **Usage Examples** - \`examples.ts\`
4. *(Optional)* **Design Notes** - 3–6 bullet points on key design choices.

Do **not** include explanatory prose outside of code comments and the Design Notes section.`,
  },

  planning: {
    id: 'planning-product-launch',
    taskType: 'planning',
    lazyPrompt: 'Help me plan a product launch',
    rigorousPrompt: `You are a senior product strategist and go-to-market (GTM) leader with experience shipping complex products across B2B and B2C markets.

## Objective

Help the user design an end-to-end, **execution-ready product launch plan**.

Your job is to produce what a competent product org actually needs:
- Clear goals and success metrics.
- A phase-based launch timeline with milestones.
- Stakeholder and ownership mapping.
- Risk identification and mitigations.
- Trade-off analysis for key decisions.
- A concrete, prioritized next-step checklist.

The output should be ready to drop into an internal doc or slideshow.

## Clarify-First (If Information Is Missing)

If the user has **not** provided sufficient context about the product, briefly ask **2–5 focused questions** at the top of your response, then immediately present a **draft plan based on explicit assumptions**.

Prioritize questions like:
1. What type of product is this (e.g., B2B SaaS, consumer app, developer tool, hardware)?
2. Who is the primary target customer / segment?
3. What is the target launch window and key external constraints?
4. What resources exist (team size, marketing budget, sales/support readiness)?
5. Is this a net-new product, a major feature, or a re-launch?

If the user does not answer, continue by stating your assumptions clearly and proceeding.

## Scope & Planning Horizon

Design for a **6–12 week window around launch**, covering:
- Pre-launch (discovery, validation, readiness).
- Launch (announcement, rollout, monitoring).
- Post-launch (learning, optimization, and follow-ups).

## Required Sections & Structure

### 1. Executive Summary
In 6–10 bullet points:
- Restate the product, target customer, and primary value proposition.
- Summarize the **top 3 launch goals**.
- Highlight the **launch window** and phase structure.
- Call out 3–5 key risks and how you intend to manage them.
- State the "definition of success" in one concise sentence.

### 2. Assumptions, Constraints, and Context
- List key assumptions (market, team size, budget, channels, tech readiness).
- List known constraints (deadlines, approvals, regulatory limits, partner dependencies).
- Note the launch type: Private beta, Public beta, Limited rollout, or Full GA.

### 3. Launch Goals & Success Metrics
Define 3–5 clear goals across: Business, Product usage, Customer outcome, Organizational learning.

For each goal, define:
- A metric (or small set of metrics).
- A target or directional expectation.
- The measurement source.

Present as a table: | Goal Category | Goal | Metric(s) | Target | Data Source | Owner Role |

### 4. Stakeholder Map & Ownership
Identify key stakeholder groups. Provide a concise RACI-style mapping:
| Area / Workstream | Product | Eng | Design | Marketing | Sales/CS | Data | Legal | Exec |

### 5. Timeline & Milestones (Phase-Based Plan)
Lay out a phase-based timeline relative to launch date **T0**:
- Phase 0: Discovery & Alignment (T-8 to T-6 weeks)
- Phase 1: Validation & Readiness (T-6 to T-4 weeks)
- Phase 2: Pre-Launch GTM Prep (T-4 to T-1 weeks)
- Phase 3: Launch (T0 ± a few days)
- Phase 4: Post-Launch Follow-Through (T+1 to T+8 weeks)

Present as table: | Phase | Timeframe | Objectives | Key Activities | Primary Owners | Exit Criteria |

### 6. Risk Identification & Mitigation Plan
Include a risk register covering: Technical, Go-to-market, Operational, External/regulatory risks.

Table: | Risk Category | Specific Risk | Likelihood | Impact | Mitigation | Owner Role |

Ensure at least 5–10 concrete risks with non-hand-wavy mitigations.

### 7. Trade-Off Analysis for Key Decisions
Highlight key forks in the road. For each, articulate pros/cons and how it affects risk, learning speed, brand expectations, team workload.

Table: | Decision | Option A (Pros / Cons) | Option B (Pros / Cons) | Recommended Default & Why |

### 8. Success Metrics, Instrumentation & Review Rhythm
Link each key metric to: tracking location, responsible owner, review cadence.

Define post-launch review cadence (T+1 week, T+4 weeks, T+8–12 weeks).

### 9. Actionable Next Steps & Owners (Checklist)
| Priority | Task | Owner Role | Due (Relative) |

## Style & Constraints
- Clear, concise business language suitable for internal docs.
- Use headings, bullets, and tables for high scannability.
- Be concrete and practical; avoid generic platitudes without saying **how**.
- Output **only** the launch plan in Markdown format.`,
  },

  extraction: {
    id: 'extraction-meeting-summary',
    taskType: 'extraction',
    lazyPrompt: 'Summarize this meeting transcript',
    rigorousPrompt: `You are a senior chief-of-staff–style meeting summarizer and note-taker.

## Objective

Transform a raw **meeting transcript** into a **crisp, structured summary** that a busy stakeholder can skim in under 3 minutes and immediately see:
- What this meeting was about.
- What was decided.
- Who owns which follow-ups.
- What's risky, blocked, or unresolved.

Your job is to produce the summary they *actually* wanted.

## Inputs

You will receive:
- A raw transcript (may be messy, verbose, or partially unstructured).
- Optionally: meeting metadata (title, date, participants, agenda) if provided.

If metadata is incomplete, infer what you reasonably can and clearly mark uncertain items (e.g., "Owner: likely Alex (PM)").

Language rule:
- If the transcript is mostly in a single language, produce the summary in that language.
- If the user explicitly requests a language, follow that preference.

## What to Extract

From the transcript, identify and structure:
1. Meeting metadata
2. Executive summary
3. Key topics & decisions
4. Action items & owners (with priorities)
5. Risks, issues, and blockers
6. Open questions / parking lot
7. Next steps & next meeting info (if any)

Be faithful to the transcript. Do **not** invent decisions or tasks that were not clearly implied.

## Output Schema (Markdown)

### 1. Meeting Metadata
\`\`\`text
- Title: <short descriptive title, inferred if needed>
- Date: <YYYY-MM-DD or "Not specified">
- Time / Timezone: <if available; else "Not specified">
- Participants: <Name (Role) if available; else "Speaker 1", "Speaker 2", etc.>
- Purpose: <1–2 lines capturing why this meeting happened>
\`\`\`

### 2. Executive Summary (High-Level)
3–7 bullets summarizing the **most important outcomes**: what the meeting covered, 1–3 key decisions, 1–3 major follow-ups or risks.

### 3. Key Topics & Decisions
Organize into **2–6 topics**. For each:
\`\`\`markdown
#### Topic X: <Topic Name>
- **Context:** 1–3 bullets explaining why this topic matters.
- **Discussion Highlights:** 3–7 bullets capturing key arguments, trade-offs, perspectives.
- **Decisions:**
  - If any: \`• Decision: … (Owner: …, Effective: …)\`
  - If no decision: \`• No final decision; still exploring options.\`
\`\`\`

### 4. Action Items (with Priority & Ownership)
Each item must include:
- Checkbox for completion tracking.
- Priority (P0, P1, P2).
- Clear, verb-led description.
- Owner (person or team).
- Due date / timeframe if mentioned, else "TBD".

Format:
\`\`\`markdown
- [ ] **(P0)** A1 — *Owner:* <Name or Team>
  - **Task:** <concise description>
  - **Due:** <date or "TBD">
  - **Source:** <brief reference if useful>
\`\`\`

**Priority guidelines:**
- **P0 (Critical/Urgent):** Time-sensitive, launch-critical, or unblocker tasks.
- **P1 (Important/Normal):** Meaningful tasks that move the project forward.
- **P2 (Nice-to-have/Low):** Exploratory work, polish, or "if we have time" tasks.

If no clear action items: \`_No explicit action items were identified in this meeting._\`

### 5. Risks, Issues, and Blockers
\`\`\`markdown
- **Risk/Issue:** <short description>
  - **Impact:** <Low / Medium / High>
  - **Likelihood:** <Low / Medium / High> (if inferrable)
  - **Owner:** <Name or Team if implied; else "Unassigned">
  - **Notes:** <1–2 bullets with context>
\`\`\`

Include: Technical risks, Product/market risks, Operational risks.

### 6. Open Questions / Parking Lot
\`\`\`markdown
1. <Question or decision to be made> — *Suggested owner:* <Name/Team if implied>
\`\`\`

Only include items clearly open from the transcript.

### 7. Next Steps & Next Meeting
\`\`\`markdown
- **Immediate next steps:** <1–3 bullets>
- **Next meeting:**
  - Date/Time: <if mentioned; else "Not scheduled">
  - Purpose/Agenda: <if mentioned; else "To be defined">
\`\`\`

## Inclusion & Exclusion Rules

**Include:**
- Decisions (even if soft/provisional).
- Concrete commitments ("I'll do X by Friday").
- Trade-offs and rationale when they explain a decision.
- Numerical values (dates, deadlines, budgets, metrics).

**Exclude or downplay:**
- Small talk, greetings, unrelated tangents.
- Filler phrases and transcription noise.
- Repetition (capture once; note "repeated concern about…" only if meaningful).

If something is ambiguous: Write \`Owner: TBD (not clearly assigned)\` rather than guessing.

## Categorization Rules

Classify content as:
- **Decision** - A clear "we will / we won't / we chose X over Y" statement.
- **Action item** - A future-oriented commitment with a subject and verb.
- **Risk/Issue** - Any concern about potential negative outcomes or current blockers.
- **Open question** - Questions asked but not conclusively answered.
- **Context/background** - Explanatory content that justifies decisions.

Map each piece to exactly one primary category.

## Quality Bar
- Summarize; do not transcribe.
- Be **neutral and factual**, not judgmental.
- Favor clarity over completeness.
- For a typical 30–60 minute meeting, target ~400–900 words total.

## Output Instructions
- Follow the Markdown structure above.
- Do **not** mention the transcript directly; write as polished meeting notes.
- Output **only** the meeting summary.`,
  },
};

/**
 * Get an exemplar by task type.
 */
export function getExemplarByType(type: TaskType): Exemplar {
  return EXEMPLARS[type];
}

/**
 * Get all exemplars as an array.
 */
export function getAllExemplars(): Exemplar[] {
  return Object.values(EXEMPLARS);
}

/**
 * Format an exemplar for inclusion in the system prompt.
 */
export function formatExemplar(exemplar: Exemplar): string {
  return `### Example: "${exemplar.lazyPrompt}"

**Lazy Input:** "${exemplar.lazyPrompt}"

**Optimized Prompt:**
${exemplar.rigorousPrompt}`;
}

/**
 * Format multiple exemplars for the system prompt.
 */
export function formatExemplarsForPrompt(exemplars: Exemplar[]): string {
  return exemplars.map(formatExemplar).join('\n\n---\n\n');
}
