# QA Findings: Adversarial Edge Case Testing (CODEX1)

**Date**: 2026-02-27
**Test File**: `/home/skish/prompt-dial/tests/adversarial/edge-cases.test.ts`
**Tests Written**: 109
**Tests Passing**: 109/109

---

## Summary

Adversarial edge-case testing was performed against the prompt-dial compiler pipeline, lint system, artifact injection, schema validation, and token estimation modules. The codebase is generally robust against malformed inputs, with a few notable findings documented below.

---

## FINDING 1: NaN Dial Bypasses Auto-Repair (BUG)

**Severity**: Medium
**Location**: `src/core/validator.ts`, `validateAndRepairSpec()`, line 50
**Test**: "documents NaN dial behavior through validator repair"

The auto-repair logic for invalid `dial` values checks:
```ts
if (typeof repaired.dial !== "number" || repaired.dial < 0 || repaired.dial > 5)
```

`NaN` is `typeof "number"`, and both `NaN < 0` and `NaN > 5` evaluate to `false`. This means NaN **slips through the repair guard** and is passed to Zod, which correctly rejects it. The result is that auto-repair fails to fix a trivially repairable value.

**Impact**: A PromptSpec with `dial: NaN` will fail validation with `repaired: false`, even though the system could have repaired it to the default (3). Users of `validateAndRepairSpec` who expect all `typeof number` dial values to be repaired will get unexpected validation failures.

**Recommended Fix**:
```ts
if (typeof repaired.dial !== "number" || !Number.isFinite(repaired.dial) || repaired.dial < 0 || repaired.dial > 5)
```

---

## FINDING 2: Raw User Input Not Interpolated Into Rendered Output (GOOD)

**Severity**: Informational (Positive Finding)
**Location**: `src/compiler/renderer.ts`, `renderPrompt()`
**Test**: "compiles HTML-injection input without including raw HTML in rendered output"

The renderer does **not** interpolate `rawInput` into the final rendered prompt. The rendered output consists solely of:
- Template system instructions
- Template section headings and instructions
- Injected artifact block content
- Extracted constraints

This means HTML/script injection via `rawInput` (e.g., `<script>alert(1)</script>`) does not appear in the rendered prompt. The raw input is preserved in `spec.rawInput` for reference but is not rendered.

**Impact**: This is actually good security design. The rawInput is used for intent parsing and constraint extraction only. The rendered prompt uses curated template content. No XSS risk in the rendered output from user input alone. However, artifact block content IS directly rendered -- if an artifact's block content contains malicious strings, they will appear in the rendered output.

---

## FINDING 3: Unknown Lint Severity Causes No Score Deduction (MINOR)

**Severity**: Low
**Location**: `src/lint/scorer.ts`, `calculateScore()`, line 6-16
**Test**: "handles results with unknown severity gracefully"

The `switch` statement in `calculateScore` has cases for `"error"`, `"warning"`, and `"info"` but no `default` case. If a `LintResult` has an unexpected severity value (e.g., due to a coding error or upstream data corruption), it will be included in the results array but cause **zero score deduction**.

**Impact**: Minimal in practice since TypeScript's type system prevents invalid severity values at compile time. However, at runtime, if data arrives from an external source or is manually constructed, unknown severities would be silently ignored rather than flagged.

**Recommended Fix**: Add a `default` case that either throws or applies a warning-level deduction.

---

## FINDING 4: Email Addresses Partially Matched as Artifact References (MINOR)

**Severity**: Low
**Location**: `src/artifacts/resolver.ts`, `extractArtifactRefs()`, line 5
**Test**: "does not match email addresses as artifacts"

The regex `/@([A-Za-z][A-Za-z0-9_]*)/g` matches `@domain` within email addresses like `user@domain.com`. This means text containing email addresses will generate spurious artifact reference lookups.

**Impact**: Unlikely to cause errors (unresolved refs are handled gracefully), but produces unnecessary resolver calls and noise in artifact ref lists. The `parseIntent` function uses a simpler regex `/@(\w+)/g` which has the same behavior.

**Recommended Fix**: Consider a negative lookbehind to exclude `@` preceded by a word character: `(?<!\w)@([A-Za-z][A-Za-z0-9_]*)`.

---

## FINDING 5: Zero-Width Characters Preserved in Cleaned Input (INFO)

**Severity**: Informational
**Location**: `src/compiler/intent-parser.ts`, `parseIntent()`
**Test**: "handles zero-width characters"

Zero-width characters (U+200B, U+200C, U+200D, U+FEFF) are preserved in `cleanedInput` and pass through to template matching. They don't cause crashes but could subtly affect keyword matching if injected between keyword characters (e.g., `re\u200Bsearch` would not match "research").

**Impact**: Edge case only. Could be exploited to bypass template keyword detection, but the practical risk is negligible.

---

## FINDING 6: Whitespace-Only rawInput Passes CompileInput Schema (INFO)

**Severity**: Informational
**Location**: `src/core/schema.ts`, `CompileInputSchema`
**Test**: "CompileInput schema accepts rawInput with only whitespace"

`CompileInputSchema` uses `z.string().min(1)` for `rawInput`, which checks string length, not trimmed length. A string of pure whitespace like `"   "` passes validation even though it has no meaningful content. The pipeline does handle it gracefully (defaults to academic-report template), but the schema does not prevent it.

**Impact**: Cosmetic. The pipeline handles it, but stricter validation could catch the issue earlier.

---

## Test Coverage Summary

| Category | Tests | Status |
|----------|-------|--------|
| Malformed Inputs (parseIntent) | 16 | All Pass |
| Malformed Inputs (renderPrompt) | 7 | All Pass |
| Malformed Inputs (compile pipeline) | 7 | All Pass |
| Dial Boundary Conditions | 10 | All Pass |
| TokenBudget Boundary Conditions | 7 | All Pass |
| Artifact Boundary Conditions | 6 | All Pass |
| Template Edge Cases | 6 | All Pass |
| Lint Edge Cases (runLint) | 8 | All Pass |
| Lint Edge Cases (calculateScore) | 6 | All Pass |
| Validator Edge Cases | 9 | All Pass |
| estimateTokens Edge Cases | 6 | All Pass |
| extractArtifactRefs Edge Cases | 8 | All Pass |
| Spec Generator Edge Cases | 5 | All Pass |
| Full Pipeline Integration | 5 | All Pass |
| NaN Dial Regression | 1 | All Pass |
| **Total** | **109** | **109 Pass** |

---

## Conclusion

The prompt-dial codebase demonstrates solid robustness against adversarial inputs. The most actionable finding is the **NaN dial repair bypass** (Finding 1), which is a straightforward fix. The remaining findings are informational or low-severity. The architecture wisely avoids interpolating raw user input into rendered prompts, providing a natural defense against injection attacks.
