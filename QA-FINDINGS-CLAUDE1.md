# Prompt Dial -- Adversarial QA Findings

**Reviewer:** Engineer Agent (Claude Opus 4.6)
**Date:** 2026-02-27
**Scope:** All 47 source files in `src/`, focusing on race conditions, type narrowing, silent wrong output, and reassessment of REVIEW.md m1-m5

---

## Finding 1: Race Condition -- Stale Closure Over `compileNow` in Debounced `compile`

- Severity: MAJOR
- File(s): `src/app/hooks/useCompiler.ts:40-46`
- Description: The debounced `compile` function captures `compileNow` in its closure. When `compile` is called, it sets a 500ms timer that will invoke `compileNow`. However, `compileNow` is defined with `useCallback([], ...)` (empty dependency array on its own internal closure -- the dynamic imports ensure fresh module references, but the `setOutput`/`setCompiling`/`setError` state setters are stable). The real race condition is: if a user types rapidly and triggers multiple compile calls, each clears the previous timer, BUT the `compileNow` that finally executes will use the `input` argument from the **last** `compile(input)` call. This is correct in isolation. However, the `compile` function is called from the `useEffect` in `page.tsx:39-50`, and the `useEffect` depends on `[rawInput, dial, tokenBudget, templateOverride, compile, clear]`. Because `compile` is memoized on `[compileNow]` and `compileNow` is memoized on `[]`, the `compile` reference is stable. BUT the `useEffect` closure captures `rawInput`, `dial`, `tokenBudget`, `templateOverride` at each render and passes them into `compile({rawInput, dial, tokenBudget, templateOverride})` -- so the debounced timer will fire with the correct latest values. The actual race is: **two compilations can overlap asynchronously**. When the timer fires and `compileNow` starts, it sets `compiling=true` and awaits `runCompile()`. If a new compile is triggered (new keystroke after 500ms idle) while the first is still awaiting, `compile()` clears the timer (but the first `compileNow` is already running, not in the timer anymore). The second timer fires after another 500ms. Now two `compileNow` invocations run concurrently. Whichever finishes last wins and sets `setOutput`. If the first (with stale input) finishes after the second (with current input), the UI shows the result of the stale compilation.
- Impact: User sees output for a previous input, not the current one. The output is silently wrong -- no error shown, just stale data.
- Suggested fix: Add an abort mechanism. Use a monotonically increasing request counter (or `AbortController`). In `compileNow`, capture a request ID at start; after `await runCompile()`, only call `setOutput` if this request ID is still the latest. Example:
  ```ts
  const latestRequestRef = useRef(0);
  const compileNow = useCallback(async (input: CompileInput) => {
    const requestId = ++latestRequestRef.current;
    setCompiling(true);
    setError(null);
    try {
      // ... compile ...
      if (requestId === latestRequestRef.current) {
        setOutput(result);
      }
    } catch (err) {
      if (requestId === latestRequestRef.current) {
        setError(...);
      }
    } finally {
      if (requestId === latestRequestRef.current) {
        setCompiling(false);
      }
    }
  }, []);
  ```

---

## Finding 2: Token Budget Shared Across Artifacts But Not Across Sections -- Double-Spending Budget

- Severity: MAJOR
- File(s): `src/compiler/pipeline.ts:70-118`
- Description: The pipeline iterates over `activeSections`, and for each section iterates over all artifacts, calling `selectBlocks()` with a remaining budget of `Math.max(0, input.tokenBudget - totalTokensUsed)`. The `totalTokensUsed` accumulates across all sections and artifacts. However, there is a subtle double-spending problem: the `selectBlocks` function is called per-artifact per-section. Within a single section, if Artifact A consumes 50 tokens, then `totalTokensUsed` increases by 50. When Artifact B is processed for the same section, it sees the reduced budget. This is correct. BUT: the same block from the same artifact can be matched and included in MULTIPLE sections if its tags match multiple section headings. Consider a block with tags `["overview", "analysis"]` -- if the template has both an "Overview" section and an "Analysis" section, this block will be included in both sections. Its token count is added to `totalTokensUsed` TWICE, AND the block's content appears in the rendered output TWICE. The budget accounting reflects double the actual cost (counting the same block's tokens twice), but the rendered output genuinely contains the content twice, so the actual token cost IS doubled. The issue is that there is no deduplication: the same block injected into two different sections inflates the prompt with duplicate content, which is wasteful and confusing to the LLM consuming the prompt.
- Impact: Duplicate block content in rendered prompts when a block's tags match multiple section headings. Token budget is consumed faster than expected. The LLM receiving this prompt gets redundant context.
- Suggested fix: Track already-injected block IDs in a `Set<string>` across the outer section loop. Skip blocks that have already been injected in a previous section. Or, only inject a block into the section with the strongest tag match (first match wins).

---

## Finding 3: `updateArtifact` Spreads Partial Over Existing Then Overwrites Version/Timestamp -- Caller Can Corrupt Version

- Severity: MAJOR
- File(s): `src/artifacts/store.ts:29-41`
- Description: The `updateArtifact` function does:
  ```ts
  await db.artifacts.update(id, {
    ...updates,
    version: existing.version + 1,
    updatedAt: new Date().toISOString(),
  });
  ```
  The intent is that `version` and `updatedAt` are always server-controlled. However, `ArtifactEditor.handleSave` (line 40-47 of `ArtifactManager/ArtifactEditor.tsx`) calls `onSave({...artifact, name, description, aliases, blocks})` which passes the **full artifact** (including `artifact.version`, `artifact.id`, `artifact.createdAt`, `artifact.isSeed`). Then in `ArtifactManager/index.tsx:45-48`, `handleSave` calls `updateArtifact(updated.id, updated)` -- passing the entire artifact as `updates`. Since `Partial<Artifact>` accepts all fields including `id`, the spread `...updates` puts the OLD `id` and `createdAt` into the update payload. The `version` and `updatedAt` after the spread overwrite correctly. However, because Dexie's `update()` method performs a shallow merge, passing `id` as part of the update object is a no-op (Dexie ignores the primary key in updates). The `createdAt` being overwritten is harmless since it's the same value. The actual bug is more subtle: `isSeed` is passed through. A user who edits a seed artifact through the editor has the `isSeed: true` flag preserved, meaning they can modify seed artifact fields even though the UI tries to prevent it (the `disabled={artifact.isSeed}` on inputs). The UI disables inputs for seed artifacts but still renders the Save button path -- and `ArtifactEditor.tsx:61` only hides the Save button for seeds: `{!artifact.isSeed && (...)}`. So the Save button is hidden. This is mitigated by UI, but a programmatic caller of `updateArtifact` could still overwrite seed data.
- Impact: Low in practice due to UI guard, but the function contract is misleading -- it accepts `Partial<Artifact>` but callers pass entire artifacts, which could lead to unintended overwrites if the function signature changes or new fields are added.
- Suggested fix: Either (a) destructure only the mutable fields from `updates` before passing to `db.artifacts.update()`, or (b) change the `ArtifactEditor` to only pass the changed fields rather than the full artifact.

---

## Finding 4: Constraint Extraction Produces Duplicate/Conflicting Results for Overlapping Patterns

- Severity: MAJOR
- File(s): `src/compiler/intent-parser.ts:19-25, 62-77`
- Description: The constraint patterns overlap significantly. Pattern index 1 matches `in (formal|casual|technical|conversational|academic) tone` and produces `Tone: <match>`. Pattern index 3 matches ANY standalone occurrence of `(formal|casual|technical|conversational|academic)` and also produces `Tone: <match>`. The deduplication logic (lines 70-75) uses the prefix before the colon -- `Tone` -- so only the first match wins. However, pattern index 0 (`for [\w\s]+? audience`) and pattern index 4 (`max(imum)? \d+ words/tokens`) do not overlap, so they are fine. The real problem is that pattern index 0 (`\bfor\s+([\w\s]+?)(?:\s+audience|\s*[,.])/i`) is extremely greedy in a non-obvious way: the `[\w\s]+?` is non-greedy but it still matches **any sequence of word characters and spaces** up to `audience`, comma, or period. For an input like `"Write a report for my team on formal methods."`, this pattern matches `for my team on formal methods` with the period terminator -- extracting `Audience: my team on formal methods`. This is a silent wrong output: the entire rest of the sentence gets swallowed as the "audience" constraint.
- Impact: The audience constraint extraction can capture far more text than intended, producing misleading constraint strings that get rendered into the final prompt. Users see `[Constraints] Audience: my team on formal methods` when they only meant the audience to be "my team".
- Suggested fix: Make the audience pattern more restrictive. Limit `[\w\s]+?` to a maximum word count (e.g., 1-4 words) or require the `audience` keyword to be present: `/\bfor\s+([\w\s]{1,40}?)\s+audience\b/i`. Alternatively, only match when "audience" explicitly appears.

---

## Finding 5: `initSeedArtifacts` Race Condition -- Multiple Tabs Can Seed Simultaneously

- Severity: MAJOR
- File(s): `src/artifacts/store.ts:47-70`, `src/app/hooks/useArtifacts.ts:10-24`, `src/app/components/ArtifactManager/index.tsx:21-26`
- Description: `initSeedArtifacts()` checks `db.artifacts.count()` and if it returns 0, inserts all seeds. This is called from two independent code paths: the `useArtifacts` hook (used in `page.tsx`) and the `ArtifactManager` component (direct import). If a user opens the app in two tabs simultaneously, both tabs call `initSeedArtifacts()`. Both can read `count === 0` before either completes `bulkAdd()`. Dexie's `bulkAdd()` will fail on the second call because the seed IDs are hardcoded (`seed-ai`, `seed-ml`, etc.) -- the primary key constraint will throw a `ConstraintError`. This error is caught in `useArtifacts` (the catch block on line 18-20 silently sets empty artifacts), but in `ArtifactManager/index.tsx` it is NOT caught -- there is no try/catch around `loadArtifacts()`, and `loadArtifacts` calls `initSeedArtifacts()` directly without error handling. This will cause an unhandled promise rejection that crashes the ArtifactManager component.
- Impact: In a multi-tab scenario, the ArtifactManager can crash on load. Even in a single-tab scenario, if the `useArtifacts` hook and `ArtifactManager` component both mount and call `initSeedArtifacts()` concurrently (which they do -- both are on the same page), one of them can fail.
- Suggested fix: Use Dexie's `bulkPut()` instead of `bulkAdd()` (upsert semantics, no constraint error on duplicate keys). Or wrap the init in a transaction with a proper check-and-insert pattern. Also add error handling in `ArtifactManager/index.tsx:loadArtifacts`.

---

## Finding 6: Block Selection Tag Matching Only Uses Section Heading, Ignoring Most Block Content

- Severity: MAJOR
- File(s): `src/compiler/pipeline.ts:72`, `src/compiler/block-selector.ts:33-41`
- Description: In the pipeline, `sectionTags` is set to `[section.heading.toLowerCase()]` (line 72). This means the only "tag" used for matching is the lowercase section heading (e.g., `"executive summary"`, `"methodology"`, `"analysis"`). For a block to be injected into a section, the block must have a tag that exactly equals the section heading (case-insensitive). But seed artifact blocks have tags like `["overview", "foundations", "introduction"]`, `["methodology", "paradigms", "technical"]` etc. The section heading `"Executive Summary"` lowercases to `"executive summary"`, which will NEVER match any tag in any seed artifact (no seed block has the tag `"executive summary"`). Similarly, `"Problem Statement"` matches nothing, `"Key Findings"` matches nothing. The only section heading that happens to match a tag is `"Analysis"` (lowercased to `"analysis"`) -- but no seed block has an `"analysis"` tag either (they have `"analytics"` or `"evaluation"`). Looking at all seed block tags across all 8 seed files: `overview, foundations, introduction, methodology, paradigms, technical, ethics, safety, governance, capabilities, state-of-art, current, evaluation, metrics, features, data, preprocessing, operations, deployment, infrastructure, architecture, training, prompting, usage, techniques, limitations, discovery, research, prioritization, frameworks, strategy, analytics, measurement, users, threat-modeling, owasp, web, vulnerabilities, zero-trust, incident-response, process, trends, landscape, competitive, ux, design, principles, accessibility, usability, systems, patterns`. None of these exactly match any template section heading (e.g., `"Executive Summary"`, `"Introduction"`, `"Background"`, `"Methodology"`, `"Discussion"`, `"Limitations"`, `"Future Work"`, `"Conclusion"`, `"References"`, `"Problem Statement"`, `"User Personas"`, etc.). Wait -- let me recheck. The heading "Methodology" lowercased is "methodology" and the seed block `ai-paradigms` has tag `"methodology"`. So that one section WOULD match. But the vast majority of section-to-tag matches will fail.

  This means: **for most template sections, no artifact blocks will ever be injected**, even when the user explicitly references an artifact with `@ai`. The blocks exist, the artifact is resolved, but the tag matching is too strict (exact match on section heading) and the seed block tags use different vocabulary than the template section headings.
- Impact: The artifact injection system is largely non-functional for most sections. Users who reference `@ai` or `@security` will see those artifacts listed in the "Referenced Artifacts" chips, but no context blocks will actually appear in the rendered output for most sections. This is a **silent wrong output** -- no error is thrown, the system just produces a prompt without the injected context the user expected.
- Suggested fix: Either (a) align seed block tags with template section headings, (b) use fuzzy/substring matching instead of exact equality, or (c) provide a broader tag vocabulary in the section specs (e.g., `sectionTags: ["executive summary", "overview", "summary", "introduction"]`).

---

## Finding 7: `DialControl` Casts to `DialLevel` Without Validation

- Severity: MINOR
- File(s): `src/app/page.tsx:117`
- Description: The DialControl `onChange` callback does `(v) => setDial(v as DialLevel)`. The `DialControl` component's onChange passes `Number(e.target.value)` from a range input (min=0, max=5, step=1). In practice, the HTML range input should only produce integers 0-5. However, the `as DialLevel` cast bypasses TypeScript's type system. If the value were somehow not a valid DialLevel (e.g., through a browser bug or DOM manipulation), the cast would silently pass an invalid value through the entire pipeline. The Zod schema `DialLevelSchema` is a union of literals 0-5, so validation would catch this IF validation is ever called on the spec -- but the pipeline does not validate the CompileInput via Zod before compiling (the `compile` function trusts its typed input).
- Impact: Low probability, but a defense-in-depth gap. Invalid dial values could produce unexpected spec generator behavior (including all sections or no sections).
- Suggested fix: Add a clamp: `setDial(Math.min(5, Math.max(0, Math.round(v))) as DialLevel)`.

---

## Finding 8: `tokenBudget` Input Accepts Negative Numbers

- Severity: MINOR
- File(s): `src/app/page.tsx:84-92`
- Description: The token budget `<input type="number" min={0}>` sets an HTML `min` attribute, but `Number(e.target.value)` does not clamp or validate. Users can type a negative number (e.g., `-100`) and the HTML `min` attribute is only advisory (browsers may not enforce it on manual keyboard input). A negative token budget flows into `compile({...tokenBudget: -100...})`. In `block-selector.ts:51`, the check is `if (tokenBudget > 0 && ...)` -- since `-100 > 0` is false, a negative budget is treated as "unlimited" (same as 0). This is not catastrophic but is a silent behavioral surprise: the user intended a very restrictive budget but gets unlimited injection.
- Impact: User sets a negative budget expecting extreme restriction, but gets unlimited artifact injection. No error shown.
- Suggested fix: Clamp on input: `setTokenBudget(Math.max(0, Number(e.target.value) || 0))`.

---

## Finding 9: `Editor` insertMention Uses `textareaRef.current?.selectionStart` Which May Not Reflect Current Input

- Severity: MINOR
- File(s): `src/app/components/Editor.tsx:69-86`
- Description: In `insertMention`, the `after` slice is computed from `textareaRef.current?.selectionStart ?? mentionStart`. At this point, the user has been typing filter characters after the `@`. The `selectionStart` reflects the textarea's current cursor position, which is correct. However, `value` (captured in the closure) is the parent component's state, which may be one render behind the actual textarea content if React batched state updates. Specifically: the user types `@a` -> `handleChange` fires -> `onChange(val)` updates parent state -> React re-renders with new `value`. But `insertMention` reads `value` from the closure, which was captured when the component last rendered. If `insertMention` is called before the re-render from the latest keystroke propagates (e.g., during the same event loop tick via keyboard Enter), `value` could be stale by one character. The `before` slice would be correct (from `mentionStart`), but `after` could include or exclude the latest character.
- Impact: Very rare edge case. Could result in a duplicated or dropped character after the inserted mention. Low practical impact since React typically batches and re-renders before the next user interaction.
- Suggested fix: Read the current value directly from `textareaRef.current?.value` instead of the `value` prop in `insertMention`.

---

## Finding 10: `BlockEditor` useEffect Causes Infinite Render Loop Risk (Reassessment of m5)

- Severity: MAJOR (upgraded from MINOR in REVIEW.md m5)
- File(s): `src/app/components/ArtifactManager/BlockEditor.tsx:27-42`
- Description: The REVIEW.md documented this as minor issue m5: "useEffect fires onChange on mount". The reality is worse than documented. The `useEffect` depends on `[label, content, tagsInput, priority, doNotSend, tokenCount]` and calls `onChange(...)` which is `handleBlockChange` from `ArtifactEditor`. The `handleBlockChange` calls `setBlocks(prev => prev.map(...))`, which creates a **new array reference** for the `blocks` state. This causes `ArtifactEditor` to re-render. On re-render, `ArtifactEditor` passes the same `block` object reference (from the new `blocks` array) to each `BlockEditor`. The `BlockEditor` component does NOT re-initialize its `useState` hooks from the new `block` prop (React preserves state across re-renders when `key` is the same). So the local state stays the same, the `useEffect` deps do not change, and the effect does NOT re-fire. The loop is prevented by React's `useState` identity preservation.

  HOWEVER, there is a more severe issue the review missed: the `useEffect` has `block` and `onChange` deliberately excluded from the dependency array (the `eslint-disable` comment). This means if the parent changes the `block` prop (e.g., due to an external update or reorder), the `BlockEditor`'s local state is stale -- it will keep showing and reporting the old values. The `onChange` callback is also stale -- if the parent's `handleBlockChange` closure changes (which it does on every re-render since it's not memoized), the `BlockEditor`'s `useEffect` will keep calling the old one. This means block updates from the BlockEditor may target the wrong index if blocks are reordered while editing.
- Impact: If blocks are added, removed, or reordered while a BlockEditor is active, the onChange callback can write to the wrong block index, silently corrupting artifact data. The eslint-disable is hiding a real dependency bug, not just a cosmetic issue.
- Suggested fix: Either (a) lift all block editing state to the parent and make `BlockEditor` controlled, or (b) use `useEffect` to sync local state from `block` prop when the block identity changes, and include `onChange` in the deps with proper memoization.

---

## Finding 11: `ArtifactManager` and `useArtifacts` Maintain Independent Duplicate State

- Severity: MAJOR
- File(s): `src/app/components/ArtifactManager/index.tsx`, `src/app/hooks/useArtifacts.ts`, `src/app/page.tsx`
- Description: `page.tsx` uses the `useArtifacts` hook which maintains its own `artifacts` state. `ArtifactManager` (loaded via dynamic import) has its own completely independent `artifacts` state loaded from the same IndexedDB. When the user creates, edits, or deletes an artifact in `ArtifactManager`, it calls `loadArtifacts()` to refresh ITS copy. But `page.tsx`'s `useArtifacts` hook is never notified. The `page.tsx` uses its artifacts list to populate the `Editor`'s autocomplete dropdown (line 128-133). So after creating a new artifact in the ArtifactManager, the Editor's `@mention` autocomplete will NOT show the new artifact until the user triggers a full page re-render (e.g., by typing, which triggers compilation, which does NOT refresh the artifacts list).

  The only way `useArtifacts` refreshes is if its `loadArtifacts` is called. It's called once on mount (`useEffect` line 26-28). After that, `create`/`update`/`remove` on the hook instance would refresh, but the ArtifactManager does NOT use the hook's `create`/`update`/`remove` -- it imports store functions directly.
- Impact: The Editor autocomplete and Referenced Artifacts chips can show stale artifact data after the user modifies artifacts via the ArtifactManager. New artifacts are invisible to `@mention` until page reload. Deleted artifacts still appear in autocomplete.
- Suggested fix: Either (a) have `ArtifactManager` accept and use the `useArtifacts` hook's CRUD functions from the parent, or (b) use a shared state management solution (context, zustand, etc.), or (c) add a `refresh` callback from parent to `ArtifactManager` that triggers on any mutation.

---

## Finding 12: `resolveRefs` Returns `artifactId: ""` for Unresolved References -- Empty String ID Flows Through Pipeline

- Severity: MINOR
- File(s): `src/artifacts/resolver.ts:23-24`, `src/compiler/pipeline.ts:52-54`
- Description: When an `@reference` does not resolve to an artifact, `resolveRefs` returns `{ raw, artifactId: "", artifactName: "", resolved: false }`. In the pipeline (line 52-54), `resolvedArtifactIds` filters for `ref.resolved === true`, so unresolved refs are excluded from fetching. This is correct. However, the `ArtifactRef` with `artifactId: ""` is still included in `spec.artifactRefs` and appears in the final `PromptSpec`. Downstream consumers who iterate over `spec.artifactRefs` without checking `resolved` could attempt operations with an empty string ID. The `ArtifactChips` component checks `ref.resolved` before calling `onClickArtifact`, so the UI is safe. But the `PromptSpec` schema (`ArtifactRefSchema`) accepts `artifactId: z.string()` which allows empty strings. If the spec is exported (via the Export JSON button) and consumed by another system, empty IDs could cause issues.
- Impact: Mild data quality issue in exported specs. Empty string IDs in artifact references could confuse external consumers of the spec JSON.
- Suggested fix: Either use `null` / `undefined` for unresolved artifact IDs (updating the type), or set `artifactId` to a sentinel like `"unresolved"`, or add `.min(1)` to the schema when `resolved` is true.

---

## Finding 13: Constraint Pattern 0 and 3 Can Both Match, But Only Pattern 0 Wins Due to Order -- Pattern 3 (Standalone Tone) Is Effectively Dead for Inputs With "for"

- Severity: MINOR
- File(s): `src/compiler/intent-parser.ts:20-24, 66-77`
- Description: Pattern 0 matches `for <words> <comma/period>` and pattern 3 matches standalone tone words. If the input is `"Write a formal report for executives."`, pattern 0 matches `for executives` -> `Audience: executives`. Pattern 3 matches `formal` -> `Tone: formal`. Both fire, different prefixes, no dedup issue -- this is actually fine. But if the input is `"for formal audience"`, pattern 0 matches `for formal` -> `Audience: formal`, and pattern 1 matches `in formal tone` -- wait, that requires `in ... tone`. Pattern 3 matches `formal` -> `Tone: formal`. Both get added since prefixes differ. The subtle issue: pattern 0's greedy behavior means `"for senior formal audience"` produces `Audience: senior formal` (swallowing "formal" into the audience). Pattern 3 also fires with `Tone: formal`. The constraints contain both `Audience: senior formal` and `Tone: formal`. The word "formal" ends up in both constraints which is redundant but not incorrect. This is more of a documentation/design issue than a bug.
- Impact: Minor confusion in constraint output. Not a correctness issue.
- Suggested fix: Document the interaction. Consider stripping matched constraint text from subsequent pattern evaluation.

---

## Finding 14: `LintPanel` Exported as Both Named and Default Export

- Severity: MINOR
- File(s): `src/app/components/LintPanel.tsx:23, 117`
- Description: The file exports `LintPanel` as a named export (line 23: `export function LintPanel`) and as a default export (line 117: `export default LintPanel`). Similarly, `InjectionPanel.tsx` has the same pattern. The dynamic import in `page.tsx` uses default import (`dynamic(() => import(...))`), while other files could import the named export. This dual-export pattern is not a bug but creates inconsistency and can cause tree-shaking issues in some bundlers, potentially including both the named and default in the bundle.
- Impact: No functional bug. Minor bundle size concern and code hygiene issue.
- Suggested fix: Use only default exports for dynamically-imported components, or only named exports with `dynamic(() => import(...).then(m => m.LintPanel))`.

---

## Reassessment of REVIEW.md Minor Issues (m1-m5)

### m1: Dead Code `extractArtifactRefs` (resolver.ts:4-14) -- Still Present, Severity Confirmed MINOR
The function is still exported and unused. The different regex is confusing but causes no runtime issue since it is never called.

### m2: @Reference Regex Mismatch -- Still Present, Severity Confirmed MINOR
`intent-parser.ts` uses `/@(\w+)/g` (matches `@123`), resolver uses `/@([A-Za-z][A-Za-z0-9_]*)/g`. Since the resolver's function is dead code, no actual mismatch occurs at runtime. If the dead code is ever revived, this becomes a bug.

### m3: API Route Stub -- Still Present, Severity Confirmed MINOR
No change. Returns 501 as documented.

### m4: `useCommands` Hook Unused -- Still Present, Severity Confirmed MINOR
No change. Dead code that should be removed.

### m5: BlockEditor useEffect Triggers onChange on Mount -- UPGRADED to MAJOR (see Finding 10)
The original assessment missed the stale closure problem with `onChange` and `block` being excluded from deps. This is not just an unnecessary re-render on mount; it is a data corruption risk when blocks are reordered. See Finding 10 for full analysis.

---

## Summary

| # | Finding | Severity | Category |
|---|---------|----------|----------|
| 1 | Race condition: overlapping async compilations, stale output | MAJOR | Race Condition |
| 2 | Token budget double-spending, duplicate block injection | MAJOR | Silent Wrong Output |
| 3 | updateArtifact accepts full artifact, misleading contract | MINOR* | Type Narrowing |
| 4 | Constraint extraction greedy regex swallows text | MAJOR | Silent Wrong Output |
| 5 | initSeedArtifacts race condition in multi-tab/concurrent mount | MAJOR | Race Condition |
| 6 | Section-to-tag matching is too strict, artifact injection rarely works | MAJOR | Silent Wrong Output |
| 7 | DialControl casts without validation | MINOR | Type Narrowing |
| 8 | Negative token budget treated as unlimited | MINOR | Silent Wrong Output |
| 9 | insertMention may use stale value prop | MINOR | Race Condition |
| 10 | BlockEditor stale onChange/block from suppressed deps (m5 upgrade) | MAJOR | Race Condition |
| 11 | ArtifactManager and useArtifacts have independent duplicate state | MAJOR | Race Condition |
| 12 | Empty string artifactId for unresolved refs in exported spec | MINOR | Type Narrowing |
| 13 | Overlapping constraint patterns produce redundant output | MINOR | Silent Wrong Output |
| 14 | Dual named/default exports on LintPanel and InjectionPanel | MINOR | Code Quality |

**Total: 7 MAJOR, 7 MINOR (0 CRITICAL)**

The most severe new finding is **Finding 6**: the artifact injection system is largely non-functional because section headings and block tags use different vocabularies. This means the core feature of the app -- injecting contextual artifact blocks into compiled prompts -- silently produces empty results for most template sections. This was not caught by the previous review because the review verified that the code paths work correctly in isolation (tag matching, budget enforcement, doNotSend filtering all work) without checking whether the actual data (seed tags vs. template headings) would ever produce matches.
