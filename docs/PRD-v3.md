# Product Requirements Document

**Product Name:** Prompt Dial v3 ("Prompt-Native Orchestrator")
**Author:** Eskender (Product Lead)
**Last Updated:** 2025-08-07

---

## 1 · Executive Summary

Prompt Dial turns a single LLM into its own planner, executor, and verifier.
All business logic lives inside three prompt shards, while a 50-line wrapper merely forwards JSON, persists `state`, and logs `events`. No micro-services, no server-side plugins.

---

## 2 · Goals & Non-Goals

| | In Scope (Goals) | Out of Scope |
| -------------------------------------------------------------------------------- | ------------------------------------ | ------------ |
| **G1** Declarative workflow in prompts (Planner → Executor → Verifier). | External orchestration engines. | |
| **G2** Kernel contract: tool registry, policy, JSON wire schema. | Arbitrary tool marketplace. | |
| **G3** Zero "hidden" chain-of-thought; verifiable audit trail. | Fine-tuned private models. | |
| **G4** Latency ≤ 3 LLM calls for 95 % of tasks. | Real-time streaming token response. | |
| **G5** Drop run-time code execution (remove `run_python`) to stay prompt-native. | Heavy data science pipelines in-app. | |

---

## 3 · Success Metrics

| Metric | Target (30 days post-GA) |
| -------------------------------------------------------- | ------------------------ |
| **P0** Tasks completing without manual retry | ≥ 92 % |
| **P1** Avg. total tokens per task (incl. clarifications) | ≤ 2500 |
| **P2** Clarification loop length | ≤ 3 turns median |
| **P3** Policy-violation escapes to user | 0 (block-rate = 100 %) |
| **P4** "Helpful" CSAT on delivered answers | ≥ 4.3 / 5 |

---

## 4 · Personas

| Persona | Need | Key Pain-Point Today |
| ------------------------- | ------------------------------------- | ---------------------------------------- |
| **Power Prompt Engineer** | Compose multi-step content pipelines. | Juggling separate agents + brittle JSON. |
| **Data-lite Analyst** | Summaries, tweet threads, memos. | Doesn't want to debug Python sandboxes. |
| **Ops Auditor** | Verify no policy breaches. | Black-box chain-of-thought. |

---

## 5 · User Stories

1. *As a prompt engineer* I paste a long research URL → get a five-step plan, execution, and verified summary in one chat.
2. *As an analyst* I can inspect the `events` log for each step to understand provenance.
3. *As compliance* I see a refusal if the request asks for disallowed content, not hidden CoT.

---

## 6 · Functional Requirements

### 6.1 Kernel (Static System Prompt)

* Defines persona ("senior technical architect").
* Registers **fetch\_web(url\:str)** only.
* Policy matrix: privacy, self-harm, illicit behaviour, PII.
* Output schema (version-tagged):

```json
{ ok, state, events, next_action, final_answer, schema_version }
```
* Token hard-cap: 1800 / response.

### 6.2 Planner Prompt

* Input: `user_goal`, `state` (empty on first call).
* Output: ordered `plan[]`, sets `next_action:"execute"`.

### 6.3 Executor Prompt

* Executes `plan[cursor]`.
* Handles tool errors (`fetch_web.ok == false`) by logging WARNING and retrying once.
* Moves to Verifier when `cursor == plan.length`.

### 6.4 Verifier Prompt

* Checklist: policy, length, factual plausibility.
* On pass → `next_action:"done"`.
* On fail → regenerate (max 1) or `safe_refuse`.

### 6.5 Wrapper (Thin Code)

* Adds UTC timestamp to each `events` entry.
* Enforces 5-second HTTP timeout.
* Persists `{prompts,responses}` for replay.

---

## 7 · Non-Functional Requirements

| Category | Requirement |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Security** | No code execution; network only via `fetch_web` with allow-list domains (configurable). |
| **Reliability** | Wrapper retries LLM call once on 5xx / timeout; idempotent on duplicate calls via `state` hash. |
| **Observability** | Structured JSON logs; Grafana dashboards for P0–P3 metrics. |
| **Extensibility** | New tools require kernel update + `schema_version` bump; backward-compat wrapper accepts older version for 90 days. |

---

## 8 · Technical Architecture

```
User ↔ Wrapper (Python 3.11, ~50 LOC)
│
├── call #1 → LLM (Planner prompt)
├── call #2…N → LLM (Executor prompt, looping)
└── call #last → LLM (Verifier prompt)
```

*State* and *events* travel as JSON; wrapper does no business logic.

---

## 9 · Open Questions

1. **Policy Source-of-Truth:** adopt OpenAI 2025-06 spec verbatim or trim to minimal subset?
2. **fetch\_web allow-list:** static list in env-var vs. dynamic user override?
3. **Clarification Budget:** hard-limit of 3 questions or adaptive based on token usage?
4. **Trace Exposure:** will end-users download full JSON trace or only see `final_answer`?

---

## 10 · Assumptions

* All target LLMs exhibit deterministic tool-call syntax parsing.
* Users accept occasional numeric inaccuracies (< 1 %) without `run_python`.
* Wrapper runs in a container with egress restricted to approved domains.

---

## 11 · Milestones & Timeline

| Date | Milestone |
| ---------- | ------------------------------------------------------ |
| **Aug 15** | Finalise policy matrix & allow-list. |
| **Aug 22** | Implement wrapper v0.9 (logging + retries). |
| **Aug 29** | Kernel + Planner + Executor + Verifier prompts frozen. |
| **Sep 05** | Internal dogfood → collect P0 metrics. |
| **Sep 12** | GA release if P0–P2 targets met. |

---

### Appendix A · Kernel Draft (v3-RC1)

*(See previous message for full text — ready for red-team review.)*