# QA Findings: Prompt-Dial Compilation Pipeline Determinism

**Date:** 2026-02-27
**Test File:** `tests/adversarial/determinism.test.ts`
**Tests Written:** 53 | **Passed:** 53 | **Failed:** 0

---

## Executive Summary

The prompt-dial compilation pipeline is **deterministic and correct** across all tested inputs. Given identical inputs and mock dependencies, the pipeline produces byte-identical output (excluding the expected non-deterministic fields: `id`, `compiledAt`, `compileDurationMs`). No correctness issues were found in the pipeline logic itself.

Two documentation/expectation issues were discovered during test construction (detailed in Findings below).

---

## Input 1: "Write a report on AI" (dial=3, tokenBudget=1000, no artifacts)

### Stage-by-Stage Expected vs Actual

| Stage | Field | Expected | Actual | Match |
|-------|-------|----------|--------|-------|
| parseIntent | templateId | `"academic-report"` | `"academic-report"` | YES |
| parseIntent | confidence | `0.7` (0.5 + 0.2 for "report") | `0.7` | YES |
| parseIntent | artifactRefs | `[]` | `[]` | YES |
| parseIntent | cleanedInput | `"Write a report on AI"` | `"Write a report on AI"` | YES |
| parseIntent | constraints | `[]` | `[]` | YES |
| generateSpec | sections.length | `9` (minDial <= 3) | `9` | YES |
| generateSpec | section headings | Executive Summary, Introduction, Background, Methodology, Analysis, Discussion, Limitations, Conclusion, References | Same order | YES |
| generateSpec | rawInput | `"Write a report on AI"` | `"Write a report on AI"` | YES |
| generateSpec | injectedBlocks | All empty `[]` | All empty `[]` | YES |
| generateSpec | systemInstruction | Academic writing assistant text | Matches template | YES |
| selectBlocks | (no-op) | No blocks to select | Correct no-op | YES |
| renderPrompt | Contains `[System Instruction]` | Yes | Yes | YES |
| renderPrompt | Contains all 9 `#` headings | Yes | Yes | YES |
| renderPrompt | Contains `[Constraints]` | No (no constraints) | No | YES |
| compile (lint) | vague-input fires | Yes (5 words < 10) | Yes | YES |
| compile (lint) | missing-constraints fires | Yes | Yes | YES |
| compile (lint) | no-template-match fires | Yes (lint keywords differ from parser keywords) | Yes | YES |
| compile (lint) | score | `70` (100 - 10 - 10 - 10) | `70` | YES |
| compile (lint) | passed | `true` (70 >= 70) | `true` | YES |
| compile (injection) | blocksIncluded | `0` | `0` | YES |
| compile (injection) | blocksOmitted | `0` | `0` | YES |
| compile (injection) | totalTokensUsed | `0` | `0` | YES |
| compile (injection) | totalTokensBudget | `1000` | `1000` | YES |
| compile (meta) | totalTokens | `estimateTokens(rendered)` | Matches | YES |

---

## Input 2: "Explain @ai safety" (dial=4, tokenBudget=500, with mock artifact)

### Stage-by-Stage Expected vs Actual

| Stage | Field | Expected | Actual | Match |
|-------|-------|----------|--------|-------|
| parseIntent | artifactRefs | `["ai"]` | `["ai"]` | YES |
| parseIntent | cleanedInput | `"Explain  safety"` (double space) | `"Explain  safety"` | YES |
| parseIntent | templateId | `"academic-report"` (no keyword match) | `"academic-report"` | YES |
| parseIntent | confidence | `0.3` (default, no match) | `0.3` | YES |
| parseIntent | constraints | `[]` | `[]` | YES |
| selectBlocks (background, budget=500) | included | blk-safety (p80), blk-ethics (p60) | Both included, priority order | YES |
| selectBlocks (background, budget=500) | omitted | blk-secret (doNotSend) | Omitted with reason "do_not_send flag" | YES |
| selectBlocks (background, budget=10) | included | blk-safety only (9 tokens) | `[blk-safety]` | YES |
| selectBlocks (background, budget=10) | omitted | blk-ethics ("exceeded token budget") | Correct | YES |
| selectBlocks (exec summary tags) | included | `[]` (no matching tags) | `[]` | YES |
| selectBlocks (budget=0) | behavior | Unlimited; all matching pass | All non-doNotSend matching blocks pass | YES |
| generateSpec | sections.length | `10` (all at dial=4) | `10` | YES |
| generateSpec | rawInput | `"Explain @ai safety"` | `"Explain @ai safety"` | YES |
| renderPrompt | Contains `## [Context: AI Safety]` | Yes (when injected) | Yes | YES |
| compile | artifactRefs[0].raw | `"@ai"` | `"@ai"` | YES |
| compile | artifactRefs[0].resolved | `true` | `true` | YES |
| compile | rawInput preserved | `"Explain @ai safety"` | `"Explain @ai safety"` | YES |
| compile | doNotSend block omitted | blk-secret excluded | Yes | YES |
| compile | totalTokensUsed <= 500 | Yes | Yes | YES |

---

## Input 3: "   " (whitespace-only, dial=0, tokenBudget=0)

### Stage-by-Stage Expected vs Actual

| Stage | Field | Expected | Actual | Match |
|-------|-------|----------|--------|-------|
| parseIntent | cleanedInput | `""` (empty after trim) | `""` | YES |
| parseIntent | templateId | `"academic-report"` | `"academic-report"` | YES |
| parseIntent | confidence | `0.3` | `0.3` | YES |
| parseIntent | artifactRefs | `[]` | `[]` | YES |
| parseIntent | constraints | `[]` | `[]` | YES |
| generateSpec | sections.length | `3` (minDial=0 only) | `3` | YES |
| generateSpec | section headings | Executive Summary, Introduction, Conclusion | Same | YES |
| generateSpec | rawInput | `"   "` (preserved) | `"   "` | YES |
| selectBlocks (budget=0) | behavior | Unlimited mode | Correct | YES |
| renderPrompt | Contains 3 sections | Yes | Yes | YES |
| renderPrompt | Excludes Analysis (minDial=1) | Yes | Yes | YES |
| compile | Does not throw | Correct | Correct | YES |
| compile (lint) | vague-input fires | Yes (0 words after filter) | Yes | YES |
| compile (lint) | budget-exceeded fires | No (tokenBudget=0 = unlimited) | No | YES |
| compile (injection) | blocksIncluded | `0` | `0` | YES |
| compile (injection) | blocksOmitted | `0` | `0` | YES |

---

## Determinism Verification (10 iterations of Input 1)

| Check | Result |
|-------|--------|
| All non-deterministic fields stripped, JSON-serialized comparison across 10 runs | **IDENTICAL** |
| `rendered` text identical across 10 runs | **IDENTICAL** (Set size = 1) |
| `lint.score` identical across 10 runs | **IDENTICAL** (Set size = 1) |
| Section headings identical across 10 runs | **IDENTICAL** (Set size = 1) |
| `meta.totalTokens` identical across 10 runs | **IDENTICAL** (Set size = 1) |
| `spec.id` unique across 10 runs | **UNIQUE** (Set size = 10, as expected from crypto.randomUUID) |

**Conclusion:** The pipeline is fully deterministic for all fields that should be deterministic.

---

## Findings and Observations

### Finding 1: Lint keyword set differs from intent-parser keyword set (by design, but surprising)

**Severity:** Informational (not a bug)

The intent-parser's `TEMPLATE_KEYWORDS` for `academic-report` includes `"report"`, which causes the template to match. However, the lint rule `no-template-match` uses a *different* keyword list that does NOT include `"report"`:

- **Intent parser keywords:** `["report", "research", "study", "paper", "academic", "thesis"]`
- **Lint rule keywords:** `["research", "study", "analysis", "findings", "methodology", "hypothesis", "literature", "academic", "paper", "thesis"]`

This means input like `"Write a report on AI"` correctly matches the `academic-report` template via the parser, but then the lint rule fires a `no-template-match` warning because `"report"` is absent from its own keyword list.

**Impact:** The lint score drops by an extra 10 points (from 80 to 70) for a perfectly valid template match. This is a false positive in the lint layer.

**Recommendation:** Synchronize the lint rule's keyword list with the intent parser's keyword list, or at minimum add `"report"` to the lint rule's `academic-report` keywords.

### Finding 2: Analysis section has minDial=1, not minDial=0

**Severity:** Informational

The `academic-report` template's "Analysis" section has `minDial: 1`, meaning it is excluded at dial=0. At dial=0, only 3 sections appear: Executive Summary, Introduction, Conclusion. This is correct behavior per the template definition, but is worth noting because "Analysis" is marked `required: true` yet is absent at the minimum dial level.

The `required` flag does not override `minDial` -- a section is only included if `minDial <= dial`, regardless of the `required` flag. The `required` field appears to be unused in the current pipeline code.

**Recommendation:** Either lower Analysis to `minDial: 0` (since it is marked required), or document that `required` is purely informational metadata and does not affect section inclusion.

### Finding 3: Whitespace-only input bypasses CompileInputSchema validation

**Severity:** Low

`CompileInputSchema` uses `z.string().min(1)` for `rawInput`, which checks string length, not trimmed length. A whitespace-only string like `"   "` (length 3) passes schema validation despite being semantically empty. The pipeline itself does not validate via the schema -- it accepts whatever is passed directly.

**Impact:** No runtime errors. The pipeline gracefully handles whitespace-only input by producing a valid (if minimal) output with appropriate lint warnings. However, an API consumer relying on schema validation would not catch this edge case.

**Recommendation:** Consider adding `.trim().min(1)` or a `.refine()` check to `CompileInputSchema.rawInput` if truly empty input should be rejected at the API boundary.

### Finding 4: `cleanedInput` leaves double spaces after @ref removal

**Severity:** Informational

When `@ai` is removed from `"Explain @ai safety"`, the result is `"Explain  safety"` with a double space. The `replace(/@\w+/g, "").trim()` pattern removes the ref text but leaves the surrounding whitespace intact.

**Impact:** No functional impact -- the double space does not affect template matching or constraint extraction. However, if `cleanedInput` were displayed to users, it would look slightly malformed.

---

## Non-Deterministic Fields (Expected)

These fields are correctly non-deterministic and excluded from comparison:

| Field | Source | Why Non-Deterministic |
|-------|--------|-----------------------|
| `spec.id` | `crypto.randomUUID()` | Each compilation gets a fresh UUID |
| `spec.meta.compiledAt` | `new Date().toISOString()` | Timestamp of compilation |
| `spec.meta.compileDurationMs` | `performance.now()` delta | Wall-clock execution time |

---

## Test Coverage Summary

| Pipeline Stage | Tests | Status |
|----------------|-------|--------|
| intent-parser (parseIntent) | 14 | All PASS |
| block-selector (selectBlocks) | 7 | All PASS |
| spec-generator (generateSpec) | 8 | All PASS |
| renderer (renderPrompt) | 5 | All PASS |
| pipeline (compile) | 13 | All PASS |
| Determinism (10-iteration) | 6 | All PASS |
| **Total** | **53** | **All PASS** |
