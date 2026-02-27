# QA Findings: Test Coverage Audit

**Auditor:** Engineer Agent (Claude Opus 4.6)
**Date:** 2026-02-27
**Scope:** Full file-by-file comparison of `src/` against `tests/`, REVIEW.md fix verification, edge case analysis

---

## Executive Summary

Reviewed all 50 source files and 16 test files. The codebase has **solid core coverage** for the compiler pipeline, artifacts, and lint system. However, the audit identified **6 modules with zero test coverage**, **5 REVIEW.md minor issues with no fix-verification tests**, and **several edge cases in existing tested modules that lack coverage**. Wrote 35 new tests covering the 5 most dangerous gaps.

---

## Phase 1: Coverage Map

### Source Files vs Test Files

| Source File | Test File | Coverage Status |
|---|---|---|
| `src/compiler/intent-parser.ts` | `tests/compiler/intent-parser.test.ts`, `tests/compiler/all-modules.test.ts` | COVERED |
| `src/compiler/block-selector.ts` | `tests/compiler/block-selector.test.ts`, `tests/compiler/all-modules.test.ts` | COVERED |
| `src/compiler/spec-generator.ts` | `tests/compiler/spec-generator.test.ts`, `tests/compiler/all-modules.test.ts` | COVERED |
| `src/compiler/renderer.ts` | `tests/compiler/renderer.test.ts`, `tests/compiler/all-modules.test.ts` | COVERED |
| `src/compiler/pipeline.ts` | `tests/compiler/pipeline.test.ts`, `tests/compiler/pipeline-integration.test.ts` | COVERED |
| `src/core/types.ts` | N/A (type-only file) | N/A |
| `src/core/schema.ts` | `tests/core/validator.test.ts` (via imports) | PARTIAL |
| `src/core/validator.ts` | `tests/core/validator.test.ts` | COVERED |
| `src/artifacts/model.ts` | `tests/artifacts/model.test.ts` | COVERED |
| `src/artifacts/store.ts` | `tests/artifacts/store.test.ts` | COVERED |
| `src/artifacts/injector.ts` | `tests/artifacts/injector.test.ts` | COVERED |
| `src/artifacts/resolver.ts` | `tests/artifacts/resolver.test.ts` | COVERED |
| `src/artifacts/seeds/*.json` (8 files) | `tests/artifacts/seeds.test.ts` | COVERED |
| `src/lint/rules.ts` | `tests/lint/rules.test.ts` | COVERED |
| `src/lint/engine.ts` | `tests/lint/engine.test.ts` | COVERED |
| `src/lint/scorer.ts` | `tests/lint/scorer.test.ts` | COVERED |
| **`src/app/lib/tokens.ts`** | **NONE** | **ZERO COVERAGE** |
| **`src/app/lib/db.ts`** | **NONE** (used via store tests with fake-indexeddb) | **ZERO COVERAGE** |
| **`src/app/hooks/useCompiler.ts`** | **NONE** | **ZERO COVERAGE** |
| **`src/app/hooks/useArtifacts.ts`** | **NONE** | **ZERO COVERAGE** |
| **`src/app/hooks/useCommands.ts`** | **NONE** | **ZERO COVERAGE** |
| **`src/app/api/compile/route.ts`** | **NONE** | **ZERO COVERAGE** |
| `src/app/page.tsx` | NONE | ZERO COVERAGE (React component) |
| `src/app/layout.tsx` | NONE | ZERO COVERAGE (React component) |
| `src/app/components/*.tsx` (9 files) | NONE | ZERO COVERAGE (React components) |
| `src/templates/*.ts` (5 files + index) | Indirect via pipeline-integration.test.ts | INDIRECT |

### Coverage Summary

- **16 source modules** with direct test files
- **6 pure logic modules** with ZERO test coverage
- **10 React components** with ZERO test coverage (expected for unit test suite)
- **5 template files** with only indirect coverage

---

## Phase 1a: REVIEW.md Fix Verification

### Critical Fixes (C1, C2) — Test Coverage Status

| Fix | Description | Test Coverage |
|---|---|---|
| **C1: rawInput preservation** | rawInput now threaded through pipeline as original user input | **PARTIAL** — `spec-generator.test.ts` tests rawInput preservation but does NOT test that @references survive in rawInput. The critical scenario (rawInput with @refs vs cleanedInput without) was untested. **NOW TESTED** in `coverage-gaps.test.ts` GAP 5. |
| **C2: doNotSend lint rule rewrite** | Rule now checks for 4 sensitive tag variants case-insensitively | **PARTIAL** — `rules.test.ts` tests "do-not-send" tag but NOT "donotsend", "sensitive", or "internal-only" variants. Mixed-case variants also untested. **NOW TESTED** in `coverage-gaps.test.ts` GAP 2. |

### Major Fixes (M1-M6) — Test Coverage Status

| Fix | Description | Test Coverage |
|---|---|---|
| **M1: Case-insensitive tag matching in injector** | Added `.toLowerCase()` to injector tag comparison | **PARTIAL** — `injector.test.ts` does not test mixed-case tags. `block-selector.test.ts` has one case test but does not exercise the injector's fix path. **NOW TESTED** in `coverage-gaps.test.ts` GAP 3. |
| **M2: Zod schema allows empty blocks** | Removed `.min(1)` from ArtifactSchema blocks | **NOT TESTED** — No test validates that a newly created artifact (blocks: []) passes ArtifactSchema. **NOW TESTED** in `coverage-gaps.test.ts` GAP 4. |
| **M3: Debounce timer cleanup** | Added useEffect cleanup for timerRef on unmount | **NOT TESTABLE** in unit tests (requires React hook testing with cleanup simulation). The hook file has zero coverage. |
| **M4: Shared estimateTokens usage** | Lint rule now uses shared `estimateTokens` function | **INDIRECTLY TESTED** — budget-exceeded rule tests pass, confirming the import works. But `estimateTokens` itself had zero direct tests. **NOW TESTED** in `coverage-gaps.test.ts` GAP 1. |
| **M5: Seed tokenCount recomputation** | `initSeedArtifacts()` recomputes token counts from content | **TESTED** — `store.test.ts` verifies seed blocks have `tokenCount > 0` after init. |
| **M6: Duplicate key fix in ArtifactChips** | Changed to `key={\`${ref.raw}-${i}\`}` | **NOT TESTABLE** in unit tests (React component, no component test file). |

### Minor Issues (m1-m5) — Were Tests Written?

| Issue | Description | Tests Written? |
|---|---|---|
| **m1: Dead code extractArtifactRefs** | Exported but never imported | **NO** — `resolver.test.ts` tests the function but doesn't verify it's dead code. No test ensures the intent parser does NOT use it. |
| **m2: @Reference regex mismatch** | Intent parser `/@(\w+)/g` vs resolver `/@([A-Za-z][A-Za-z0-9_]*)/g` | **PARTIALLY** — `resolver.test.ts` tests that `@123test` is NOT extracted (resolver rejects leading digits). `intent-parser.test.ts` does NOT test this edge case. The inconsistency remains untested as a behavioral difference. |
| **m3: API route stub** | Returns 501 with documentation | **NO** — No test file exists for the route. |
| **m4: useCommands hook unused** | Exported but never used | **NO** — No test file exists. |
| **m5: BlockEditor mount onChange** | useEffect fires onChange on initial mount | **NO** — No component test file exists. |

---

## Phase 1b: Edge Cases in Existing Tested Modules

### Untested Edge Cases Identified

1. **estimateTokens**: Called by `createBlock`, `store.initSeedArtifacts`, `pipeline`, and `budget-exceeded` lint rule. Zero direct test coverage means any change to the formula would not be caught.

2. **Injector tag matching**: The fix for M1 added `.toLowerCase()` to line 43 of injector.ts. Existing tests use all-lowercase tags, so the case-insensitive matching path was never actually exercised.

3. **do-not-send-leak variants**: The C2 rewrite added "donotsend", "sensitive", "internal-only" detection. Only "do-not-send" had test coverage, leaving 3 of 4 detection paths untested.

4. **ArtifactSchema empty blocks**: The M2 fix changed the schema, but no test validated the boundary condition (empty blocks array passing validation).

5. **rawInput with @references in spec**: The C1 fix was the most critical bug fix, but the test for rawInput preservation in spec-generator.test.ts used an input WITHOUT @references, so the actual fix path was never verified.

6. **getTemplate with unknown ID**: `templates/index.ts` throws on unknown template IDs. No test exercises this error path.

7. **Validator with non-Zod errors**: `validator.ts` re-throws non-ZodError exceptions, but no test exercises this path.

8. **Pipeline with resolver that rejects**: No test covers the case where the artifact resolver throws an exception (vs returning unresolved refs).

---

## Phase 2: Adversarial Tests Written

### File: `/home/skish/prompt-dial/tests/adversarial/coverage-gaps.test.ts`

**35 tests covering 5 critical gaps:**

| Gap | Module | Tests | Risk Addressed |
|---|---|---|---|
| **GAP 1** | `src/app/lib/tokens.ts` | 10 tests | Token estimation accuracy. This function is used by lint rules, pipeline metadata, seed init, and block creation. A bug here corrupts every token count in the system silently. |
| **GAP 2** | `src/lint/rules.ts` (do-not-send-leak) | 9 tests | Sensitive data leak detection. All 4 tag variants tested, mixed-case tested, cross-section detection tested. Without these tests, 3 of 4 sensitive tag patterns could regress without detection. |
| **GAP 3** | `src/artifacts/injector.ts` (tag matching) | 5 tests | Case-insensitive injection. The M1 fix could silently regress, causing blocks with mixed-case tags (like "Overview") to fail matching, breaking artifact injection for real-world seeds. |
| **GAP 4** | `src/core/schema.ts` (ArtifactSchema) | 6 tests | Schema validation boundary. The M2 fix removed min(1) on blocks. Without this test, someone could re-add the constraint and break artifact creation. Also validates priority range enforcement (0-100). |
| **GAP 5** | `src/compiler/spec-generator.ts` (rawInput) | 5 tests | @reference preservation. The C1 fix was the most critical bug in the codebase. These tests verify rawInput with @references survives into the spec AND that the no-template-match lint rule correctly analyzes rawInput (not cleanedInput). |

### Test Execution Results

```
RUN  v4.0.18 /home/skish/prompt-dial

 OK  tests/adversarial/coverage-gaps.test.ts (35 tests) 29ms

 Test Files  1 passed (1)
      Tests  35 passed (35)
   Duration  3.22s
```

All 35 tests pass.

---

## Remaining Coverage Gaps (Not Addressed)

### High Priority (should be tested)

1. **useCompiler hook** — No hook tests at all. The clear() function, debounce behavior, and error handling in compileNow() are untested. Requires `@testing-library/react` renderHook pattern.

2. **useArtifacts hook** — CRUD operations through the hook are untested. Error recovery path (catch block setting artifacts to []) is untested.

3. **useCommands hook** — Dead code (m4), but if kept, its regex parsing should be tested.

4. **getTemplate error path** — `templates/index.ts:18` throws for unknown template IDs. Should have a test.

### Medium Priority

5. **API route** — The 501 stub route should be tested if it's kept, or removed (m3).

6. **db.ts** — The Dexie database class is tested indirectly through store.test.ts with fake-indexeddb, which is adequate.

7. **Template definitions** — The 5 template files have indirect coverage through pipeline-integration tests, which is adequate for now.

### Low Priority (React components)

8. **All 9 React components** — No component tests exist. This is typical for a project with vitest unit tests. E2E or component tests with React Testing Library would cover these.

---

## Recommendations

1. **Add hook tests** using `@testing-library/react` `renderHook` for `useCompiler` and `useArtifacts`. Focus on:
   - `useCompiler.clear()` resetting all state
   - Debounce timer behavior (500ms delay)
   - Error handling when compilation fails
   - `useArtifacts` error recovery path

2. **Delete dead code**: Remove `extractArtifactRefs` from `resolver.ts` (m1) and `useCommands` hook (m4). The resolver function is confusing because it has a different regex than the intent parser.

3. **Unify @reference regex**: Create a single shared constant in `core/` used by both intent-parser and resolver to prevent the m2 inconsistency from becoming a real bug.

4. **Add component tests**: If the project grows, add React Testing Library component tests for the most interactive components (Editor, ArtifactManager, DialControl).

5. **Test the getTemplate error path**: One simple test in the pipeline test file would catch regressions in template registration.
