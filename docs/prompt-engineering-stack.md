# The "Prompt Engineering Stack"

*A layered, end‑to‑end system for writing world‑class prompts*

---

## Layer 0 — Model & Context Selection

1. **Pick a reasoning‑grade model** (e.g., OpenAI o3, Claude Opus 4, Gemini 2.5 Pro).
2. **Load task context** (domain corpus, tool APIs, retrieval endpoints).

> Without this foundation, higher‑layer tactics deliver diminishing returns.

---

## Layer 1 — Contract‑First Intent Clarification

*(adapted from the "Intent Translator MAX" prompt)*

| Phase | What the model does | Your control signals |
| ----------------------- | ---------------------------------------------------------------------------- | ----------------------------- |
| **0 SILENT SCAN** | Lists unknown facts/constraints. | — |
| **1 CLARIFY LOOP** | Asks one targeted question until ≥ 95 % confidence. | Answer or type `RESET`. |
| **2 ECHO CHECK** | Returns single‑sentence summary + "✅ YES / ❌ EDITS / 🔧 BLUEPRINT / ⚠ RISK". | Confirm or request sub‑modes. |
| **3 BLUEPRINT** | Outlines key steps / I‑O schema. | Pause, tweak, lock. |
| **4 RISK** | Surfaces top 3 failure modes. | Mitigate or revise. |
| **5 BUILD & SELF‑TEST** | Generates output, runs static checks. | Review deliverable. |

This handshake prevents the #1 failure mode—misaligned intent—before any heavy token spend.

---

## Layer 2 — Prompt Blueprint (P‑I‑R‑O)

Structure every final prompt in **four slots**:

1. **Purpose** – goal, audience, success criteria.
2. **Instructions** – step order, guardrails/edge‑cases, fallback behaviour.
3. **Reference** – data snippets, style guides, exemplar Q‑A pairs.
4. **Output** – format contract (JSON / Markdown / code), length/tone limits.

This mirrors the taxonomy in the Prompt Report's best‑practice guidelines.

---

## Layer 3 — Embedded Reasoning Drivers

*Attach the evidence‑based techniques inside the blueprint's **Instructions** block.*

| Technique | When to embed | Micro‑syntax |
| ----------------------------------- | --------------------------- | ---------------------------------------------------------- |
| **Self‑Consistency** | Knowledge & logic questions | "Generate 5 candidate answers; compare & emit consensus." |
| **Program‑of‑Thought** | Math / data / code | "Write Python to compute … then return result." |
| **Plan‑Then‑Solve** | Multi‑step tasks | "First produce a numbered plan, wait for ✅, then execute." |
| **Retrieval‑Augmented (RAG)** | Knowledge‑intensive tasks | "If fact needed, call SEARCH() and cite." |
| **Chain / Tree / Graph‑of‑Thought** | Complex reasoning trees | "Think step‑by‑step; branch if ambiguity > 0.2." |

---

## Layer 4 — Meta‑Prompting Loops

Leverage the model to improve its own prompt:

1. **Self‑Improvement Loop** – "Here's my current prompt → suggest 3 upgrades → apply best."
2. **Uncertainty Probe** – "List ambiguous parts & missing info."
3. **Capability Discovery** – "If unconstrained, how else could you solve this?"
4. **Explain‑Your‑Work / Socratic Why** – "Why did you choose approach X? What alternatives?"

Meta‑prompting is a formally recognised technique in the literature.

---

## Layer 5 — Auto‑Optimization (Optional)

When scale matters, wrap Layer 4 with automation:

* **APE / GrIPS / AutoPrompt** to generate, score and iterate prompt variants.
* Reinforcement or evolutionary search on task metrics.
* Keep a "prompt registry" with version tags, eval traces, and rollback keys.

---

## Layer 6 — Evaluation & Hardening

*Every prompt ships with its own test‑harness.*

| Dimension | Method |
| --------------- | ------------------------------------------------------------------------------------------------ |
| **Correctness** | Few‑shot hidden tests, gold benchmarks, automatic self‑verification |
| **Robustness** | Canary phrases, negative examples, anti‑jailbreak rules (see security section of Prompt Report) |
| **Calibration** | "Give answer + confidence 0‑1; if < 0.6, cite uncertainty source." |
| **Performance** | Token budget assertions in output block; static code‑lint for program‑of‑thought. |

---

## Copy‑Ready Master Template

```text
########################################
# PROMPT BLUEPRINT (P‑I‑R‑O pattern) #
########################################

PURPOSE
• Mission: <<crisp objective>>
• Success criteria: <<measurable>>

INSTRUCTIONS
1. Contract‑First handshake (CLARIFY → ECHO → YES/EDITS).
2. Planning: generate step list, wait for ✅LOCK.
3. Execution: follow Program‑of‑Thought (Python) or RAG as needed.
4. Self‑Consistency: produce N variants, reconcile → final_answer.
5. Output must follow schema in OUTPUT section.
6. Guardrails:
– If unable → respond "UNCERTAIN".
– Forbidden: … # security
– Edge‑cases: … # domain‑specific

REFERENCE
<<insert facts, style snippets, exemplar Q‑A, API docs>>

OUTPUT
```json
{
"answer": "...",
"reasoning": "...",
"confidence": 0.0‑1.0
}
```

########################################
```

---

## Quick‑Start Checklist

| ✔︎ | Question |
|----|----------|
| ☐ | Have I picked a reasoning‑grade model & loaded context? |
| ☐ | Did the CLARIFY loop hit 95 % confidence? |
| ☐ | Does the blueprint include P‑I‑R‑O slots? |
| ☐ | Which reasoning driver(s) are embedded? |
| ☐ | Is a meta‑prompting self‑improvement hook present? |
| ☐ | Are robustness tests & uncertainty outputs defined? |

---

## How to Use This Stack

1. **Start at Layer 1** with the Contract‑First scaffold; lock intent.
2. **Fill P‑I‑R‑O** using domain artefacts.
3. **Attach Layer 3 drivers** relevant to task type.
4. **Run meta loop** until the prompt scores ≥ pass on your eval harness.
5. **Snapshot & version**; monitor drift over time.

Execute these layers faithfully and you'll be writing—by design—the **best fucking prompts on the planet**.