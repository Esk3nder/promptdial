# Prompt Dial v3 — Project Plan (Prompt-Native, Agent-First)

### Guiding Principle

*All logic lives in prompts; the wrapper is a thin transport layer.*
Epics are organised around the LLM's responsibilities, not traditional SDLC phases. Each story can be implemented by an autonomous coding agent (self-planning, self-executing).

---

### Epic 1 · Kernel Contract & Policy

**Goal:** lock the immutable "constitution" every prompt shard must obey.

| Story ID | Description | Acceptance Criteria |
| -------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| K-1 | Draft policy matrix (privacy, disallowed content, refusal template). | Verifier rejects any answer that violates matrix; test prompts pass. |
| K-2 | Versioned JSON wire schema (`schema_version`, deterministic key order). | Regression suite decodes v3 and v2; no wrapper changes needed. |
| K-3 | Remove `run_python`; final tool registry = `fetch_web`. | Planner never emits code-execution steps in ≥ 100 random tasks. |
| K-4 | Token budget guardrail (≤ 1800 tokens / turn). | Executor auto-splits answers > 1700 tokens into continuation plan. |

---

### Epic 2 · Planner Prompt (LLM Call #1)

| Story ID | Description | Acceptance Criteria |
| -------- | ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| P-1 | Self-consistency planning: generate ≥ 3 candidate plans → converge. | Plans converge to identical step list in stochastic test (T=0.7). |
| P-2 | Gap-scan → clarify loop (max 3 questions). | 95 % of tasks lock within 3 clarifications; fallback to partial plan. |
| P-3 | Plan validation rubric (no forbidden tools, no chain-of-thought). | Static analysis script flags zero violations in sample corpus. |

---

### Epic 3 · Executor Prompt (LLM Call #2‥N)

| Story ID | Description | Acceptance Criteria |
| -------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| E-1 | Deterministic tool call syntax for `fetch_web`. | Wrapper regex extracts URL reliably in sandbox tests. |
| E-2 | Error-aware step handling (`ok:false`, `error` field). | Executor retries once, logs WARN, skips or aborts per policy. |
| E-3 | State mutation contract (`cursor`, `artifacts`). | End-to-end test shows complete trace with ordered artifacts. |

---

### Epic 4 · Verifier Prompt (LLM Call #last)

| Story ID | Description | Acceptance Criteria |
| -------- | ------------------------------------------------------------- | --------------------------------------------------------- |
| V-1 | Checklist-driven audit: policy, factual plausibility, length. | Random injection of policy violation → Verifier refuses. |
| V-2 | Safe-completion branch (`next_action:"safe_refuse"`). | Wrapper surfaces safe-refusal payload; no raw CoT leaked. |
| V-3 | Single regeneration attempt, then escalate. | Infinite-loop guard passes chaos-monkey test. |

---

### Epic 5 · Wrapper & Observability (≈50 LOC)

| Story ID | Description | Acceptance Criteria |
| -------- | ------------------------------------------------ | ---------------------------------------------------------------- |
| W-1 | Timestamped JSON event log (`t, lvl, msg`). | Grafana dashboard displays P0–P3 metrics in real-time. |
| W-2 | Idempotent retry on LLM 5xx/timeouts (back-off). | Replay test shows no duplicate side-effects. |
| W-3 | Domain allow-list for `fetch_web`; 5 s timeout. | Attempt to access disallowed domain → Executor WARN, plan abort. |

---

### Epic 6 · Red-Team & Evaluation Harness

| Story ID | Description | Acceptance Criteria |
| -------- | ---------------------------------------------------------------- | --------------------------------------------- |
| R-1 | Prompt-injection battery (override persona, leak CoT). | Kernel resists 100 % of injections. |
| R-2 | Safety-policy adversarial test set (self-harm, illicit content). | Verifier safe-refuses every red-flag prompt. |
| R-3 | Numeric reasoning regression (no `run_python`). | ≤ 1 % arithmetic error on 200-item benchmark. |

---

### Epic 7 · Documentation & Developer UX

| Story ID | Description | Acceptance Criteria |
| -------- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| D-1 | **README:** architecture diagram, usage examples, quick-start. | New dev reproduces "summarise + 5 tweets" task in < 5 min. |
| D-2 | Prompt authoring guide (kernel constraints, negative examples). | Internal team writes a new shard without wrapper changes. |
| D-3 | Compliance brief (policy summary, audit log format). | Passes legal review for enterprise deployment. |

---

### How Autonomous Coding Agents Execute These Stories

1. **Plan** – Agent reads the story, runs its own Planner prompt to break work into sub-tasks.
2. **Implement** – Agent edits the prompt files or wrapper code in-place, commits via git.
3. **Self-Test** – Agent invokes Verifier shard against synthetic test cases it generated.
4. **Report** – Agent outputs PR diff + JSON trace to human reviewer.

This self-referential loop keeps all logic prompt-native while letting agents own the SDLC.