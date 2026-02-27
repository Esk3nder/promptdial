# React Code Quality Audit -- prompt-dial

**Auditor:** Engineer Agent (Claude Opus 4.6)
**Date:** 2026-02-27
**Scope:** All React components, hooks, and client-side modules in `src/app/`
**React version:** 19.2.3 | **Next.js version:** 16.1.6

---

## Table of Contents

1. [Unnecessary useEffects](#1-unnecessary-useeffects)
2. [Error Boundaries](#2-error-boundaries)
3. [Accessibility](#3-accessibility)
4. [Stale Closure Risks](#4-stale-closure-risks)
5. [Memory Leaks](#5-memory-leaks)
6. [React 19 Opportunities](#6-react-19-opportunities)
7. [General Code Quality](#7-general-code-quality)

---

## 1. Unnecessary useEffects

### FINDING UE-1: Compilation triggered via useEffect instead of event handlers

- **Severity:** MAJOR
- **File:** `src/app/page.tsx` lines 39-50

```tsx
useEffect(() => {
  if (!rawInput.trim()) {
    clear();
    return;
  }
  compile({
    rawInput,
    dial,
    tokenBudget,
    templateOverride,
  });
}, [rawInput, dial, tokenBudget, templateOverride, compile, clear]);
```

**Problem:** This useEffect synchronizes state changes into a side effect (network/compute call). The React documentation explicitly warns against this pattern: "You don't need Effects to transform data for rendering" and "You don't need Effects to handle user events." Every state change that triggers this effect originates from a user event (typing, changing dial, changing template, changing budget). The compilation should be called directly from those event handlers.

**Why it matters:** This creates an unnecessary render cycle (state change -> render -> effect fires -> triggers async work -> state change -> re-render). It also makes the data flow harder to trace -- you must mentally connect "which state changed?" to understand why a compilation happened.

**Recommended fix:** Create a `triggerCompile` function and call it from `onChange` handlers on each input. Use the debounce inside that function (which `useCompiler` already supports). Remove this useEffect entirely.

---

### FINDING UE-2: Keyboard shortcut handler useEffect re-registers on every input change

- **Severity:** MAJOR
- **File:** `src/app/page.tsx` lines 53-69

```tsx
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (rawInput.trim()) {
        compile({ rawInput, dial, tokenBudget, templateOverride });
      }
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [rawInput, dial, tokenBudget, templateOverride, compile]);
```

**Problem:** This event listener is torn down and re-attached on every keystroke (because `rawInput` is in the dependency array). On a 500-character prompt, that is 500+ addEventListener/removeEventListener cycles. The handler closes over `rawInput`, `dial`, `tokenBudget`, and `templateOverride` and must be re-created whenever any of them change.

**Recommended fix:** Use a ref to hold the current values and register the event listener once:

```tsx
const stateRef = useRef({ rawInput, dial, tokenBudget, templateOverride });
stateRef.current = { rawInput, dial, tokenBudget, templateOverride };

useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      const s = stateRef.current;
      if (s.rawInput.trim()) {
        compile(s);
      }
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [compile]); // only re-register if compile identity changes
```

---

### FINDING UE-3: Token count derived via useEffect instead of useMemo or inline computation

- **Severity:** MAJOR
- **File:** `src/app/components/ArtifactManager/BlockEditor.tsx` lines 21-25

```tsx
const [tokenCount, setTokenCount] = useState(block.tokenCount);

useEffect(() => {
  setTokenCount(estimateTokens(content));
}, [content]);
```

**Problem:** `tokenCount` is purely derived from `content`. Storing it in state and syncing with useEffect creates an unnecessary render cycle: content changes -> render with stale tokenCount -> effect fires -> setTokenCount -> re-render with correct tokenCount. Every edit causes two renders instead of one.

**Recommended fix:** Replace with `useMemo` or direct computation:

```tsx
const tokenCount = useMemo(() => estimateTokens(content), [content]);
```

Or simply inline it since `estimateTokens` is trivially cheap:

```tsx
const tokenCount = estimateTokens(content);
```

---

### FINDING UE-4: Parent notification via useEffect creates infinite update risk

- **Severity:** CRITICAL
- **File:** `src/app/components/ArtifactManager/BlockEditor.tsx` lines 27-42

```tsx
useEffect(() => {
  const tags = tagsInput
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  onChange({
    ...block,
    label,
    content,
    tags,
    priority,
    doNotSend,
    tokenCount,
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [label, content, tagsInput, priority, doNotSend, tokenCount]);
```

**Problem:** This is the most dangerous pattern in the codebase. The component:
1. Receives `block` and `onChange` as props
2. Copies `block` fields into local state (`label`, `content`, etc.)
3. Uses a useEffect to call `onChange` (the parent's callback) whenever local state changes
4. The eslint-disable comment suppresses the warning about missing `block` and `onChange` in the dependency array

This is an "effect sandwich" anti-pattern. If the parent re-derives `block` from the `onChange` callback (which it does -- `ArtifactEditor.handleBlockChange` updates the `blocks` array state), this creates a potential cascade: child effect fires -> parent state updates -> child re-renders -> if any prop differs, effect fires again. The only thing preventing an infinite loop is the eslint suppression keeping `block` out of deps. This is a fragile arrangement.

Furthermore, the `onChange` callback fires on mount (because the effect runs on mount with the initial values), meaning the parent receives a "change" notification even when nothing actually changed.

**Recommended fix:** Remove the useEffect entirely. Call `onChange` directly from each individual input's `onChange` handler. Each handler already knows which field changed:

```tsx
function handleLabelChange(newLabel: string) {
  setLabel(newLabel);
  onChange({ ...block, label: newLabel, content, tags: parseTags(), priority, doNotSend, tokenCount });
}
```

Or even better, lift the state up: let the parent own `block` state and pass individual field setters down, eliminating the duplicated state entirely.

---

### FINDING UE-5: Textarea auto-resize via useEffect

- **Severity:** MINOR
- **File:** `src/app/components/Editor.tsx` lines 46-48

```tsx
useEffect(() => {
  autoResize();
}, [value, autoResize]);
```

**Problem:** The auto-resize is triggered in response to `value` changes. Since `value` only changes in response to `handleChange` being called, this resize could be performed directly in the `handleChange` handler or via a `requestAnimationFrame` in that handler. However, the `value` prop could also change externally (e.g., when `insertMention` fires), so the useEffect does serve a purpose -- it catches resize needs regardless of how `value` changes. This is a borderline case.

**Recommendation:** Acceptable as-is, but could be slightly improved by using `useLayoutEffect` instead of `useEffect` to avoid a visible flicker where the textarea renders at the wrong height for one frame before the effect runs.

---

### FINDING UE-6: Data fetching useEffect in ArtifactManager duplicates useArtifacts hook

- **Severity:** MINOR
- **File:** `src/app/components/ArtifactManager/index.tsx` lines 28-30

```tsx
useEffect(() => {
  loadArtifacts();
}, [loadArtifacts]);
```

**Problem:** This component manages its own artifact loading state (`artifacts`, `loading`, `loadArtifacts`) separately from the `useArtifacts` hook used in `page.tsx`. This means two independent IndexedDB loads of the same data, with no shared cache. The data fetching useEffect itself is fine (data fetching on mount is a valid useEffect use case), but the duplication is the real issue.

**Recommendation:** Consider using a shared state solution (React context, or passing the `useArtifacts` return value as props) rather than having two independent data-loading paths.

---

## 2. Error Boundaries

### FINDING EB-1: Zero error boundaries in the entire application

- **Severity:** CRITICAL
- **File:** `src/app/layout.tsx`, `src/app/page.tsx`

**Problem:** There are no React error boundaries anywhere in the codebase. If any component throws during rendering, the entire application will crash with an unrecoverable white screen.

**Components at highest crash risk:**

1. **OutputPanel** (`src/app/components/OutputPanel.tsx`) -- Renders `rendered.split("\n").map(...)` which will throw if `rendered` is somehow not a string (defensive but possible via type coercion).

2. **ArtifactManager** (`src/app/components/ArtifactManager/index.tsx`) -- Performs IndexedDB operations that could throw on corrupt data, quota exceeded, or private browsing mode.

3. **LintPanel** (`src/app/components/LintPanel.tsx`) -- Accesses `report.score`, `report.results`, `report.passed` without null-safe checks beyond the initial guard. If `report` has unexpected shape, it crashes.

4. **Compiler pipeline** (invoked from `useCompiler.ts`) -- Dynamic imports (`await import(...)`) can fail. While the hook catches errors in the async path, if the caught error is thrown synchronously during a re-render, no boundary catches it.

**Recommended fix:** Add error boundaries at three levels:

```
layout.tsx          -> Global error boundary (catch-all, "Something went wrong" + reload)
  page.tsx
    Left panel      -> Input error boundary (isolate editor crashes)
    Right panel     -> Output error boundary (isolate rendering crashes)
    ArtifactManager -> Artifact error boundary (isolate IndexedDB crashes)
```

With React 19 and Next.js 16, you can also use `error.tsx` file convention for route-level error boundaries.

---

### FINDING EB-2: No Next.js error.tsx or global-error.tsx file

- **Severity:** MAJOR
- **File:** `src/app/` (missing `error.tsx` and `global-error.tsx`)

**Problem:** Next.js App Router provides built-in error boundary support via `error.tsx` (route-level) and `global-error.tsx` (root layout level). Neither file exists. This means:
- A crash in the root layout kills the entire app with no recovery
- A crash in page.tsx gives no user-facing error UI

**Recommended fix:** Create at minimum `src/app/error.tsx` and `src/app/global-error.tsx`.

---

### FINDING EB-3: IndexedDB unavailability not handled at boundary level

- **Severity:** MAJOR
- **File:** `src/app/lib/db.ts`, `src/artifacts/store.ts`

**Problem:** The app depends on IndexedDB (via Dexie) for all artifact storage. IndexedDB can be unavailable in:
- Private/incognito browsing in some browsers
- When storage quota is exceeded
- In certain embedded WebView contexts
- When the user has disabled storage

The `db` singleton is created at module load time (`export const db = new PromptDialDB()`). If IndexedDB is unavailable, this constructor may throw synchronously at import time, crashing the entire module tree.

While `useArtifacts` has a try/catch in `loadArtifacts`, the `ArtifactManager/index.tsx` does NOT have a try/catch around its `loadArtifacts` callback. If `initSeedArtifacts()` or `getAllArtifacts()` throws, the error propagates to the useEffect, which React treats as an unhandled error.

**Recommended fix:** Wrap IndexedDB initialization in a try/catch, provide a graceful degradation path (in-memory fallback or disabled artifact panel with explanation), and wrap the ArtifactManager in an error boundary.

---

## 3. Accessibility

### FINDING A11Y-1: DialControl range input has no accessible label

- **Severity:** MAJOR
- **File:** `src/app/components/DialControl.tsx` lines 35-42

```tsx
<input
  type="range"
  min={0}
  max={5}
  step={1}
  value={value}
  onChange={(e) => onChange(Number(e.target.value))}
  className="w-full cursor-pointer accent-indigo-500"
/>
```

**Problem:** The range input has no `aria-label`, `aria-labelledby`, or associated `<label>` element via `htmlFor`/`id`. Screen readers will announce this as "slider" with no context. The visual label "Depth" exists as a `<span>` above it but is not programmatically associated.

**Recommended fix:**
```tsx
<input
  type="range"
  id="dial-depth"
  aria-label={`Depth level: ${value} - ${labels[value]}`}
  aria-valuetext={`${labels[value]}`}
  // ...
/>
```

---

### FINDING A11Y-2: TemplatePicker buttons lack aria-pressed state

- **Severity:** MAJOR
- **File:** `src/app/components/TemplatePicker.tsx` lines 28-38

```tsx
<button
  key={t.label}
  onClick={() => onChange(t.id)}
  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    active ? "bg-indigo-600 text-white" : "..."
  }`}
>
  {t.label}
</button>
```

**Problem:** These buttons form a single-select group (like radio buttons) but have no ARIA semantics to communicate this. Screen readers cannot determine which template is selected. The visual active state (bg-indigo-600) is the only indicator.

**Recommended fix:** Add `role="radiogroup"` on the container and `role="radio"` + `aria-checked` on each button, or use `aria-pressed` if treating as toggle buttons:

```tsx
<div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Template selection">
  {templates.map((t) => {
    const active = value === t.id;
    return (
      <button
        key={t.label}
        role="radio"
        aria-checked={active}
        onClick={() => onChange(t.id)}
        // ...
```

---

### FINDING A11Y-3: Token budget input has a label but not via htmlFor/id association

- **Severity:** MINOR
- **File:** `src/app/page.tsx` lines 79-93

```tsx
<label className="flex items-center gap-2 text-xs text-gray-400" title="...">
  Token budget
  <input type="number" ... />
</label>
```

**Assessment:** This is actually correctly done -- the `<input>` is nested inside the `<label>`, which creates an implicit association per HTML spec. This is valid. The `title` attribute provides additional context. No issue here.

---

### FINDING A11Y-4: Artifact Manager toggle button lacks aria-expanded

- **Severity:** MAJOR
- **File:** `src/app/page.tsx` lines 182-191

```tsx
<button
  onClick={() => setShowArtifactManager(!showArtifactManager)}
  className="flex w-full items-center justify-center gap-2 px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-900 hover:text-gray-200"
>
  <span>{showArtifactManager ? "down arrow" : "up arrow"}</span>
  Artifact Manager
  <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs">{artifacts.length}</span>
</button>
```

**Problem:** This button toggles a disclosure panel but has no `aria-expanded` attribute. Screen readers cannot determine if the panel is open or closed. The arrow characters are also not hidden from assistive technology.

**Recommended fix:**
```tsx
<button
  onClick={() => setShowArtifactManager(!showArtifactManager)}
  aria-expanded={showArtifactManager}
  aria-controls="artifact-manager-panel"
>
  <span aria-hidden="true">{showArtifactManager ? "down" : "up"}</span>
  Artifact Manager
  <span className="..." aria-label={`${artifacts.length} artifacts`}>
    {artifacts.length}
  </span>
</button>
```

---

### FINDING A11Y-5: Copy and Export JSON buttons lack descriptive labels

- **Severity:** MINOR
- **File:** `src/app/components/OutputPanel.tsx` lines 94-107

**Problem:** The "Copy" and "Export JSON" buttons have visible text which serves as their accessible name, so they are technically accessible. However, they lack context about WHAT is being copied. A more descriptive label would help.

**Recommended fix:** Add `aria-label="Copy compiled prompt to clipboard"` and `aria-label="Export prompt specification as JSON"`.

---

### FINDING A11Y-6: Dropdown autocomplete in Editor lacks ARIA combobox pattern

- **Severity:** MAJOR
- **File:** `src/app/components/Editor.tsx` lines 106-141

**Problem:** The textarea + dropdown combination implements an autocomplete/combobox pattern but lacks all required ARIA attributes:
- No `role="combobox"` on the textarea
- No `aria-expanded` indicating dropdown visibility
- No `aria-activedescendant` pointing to the selected option
- No `role="listbox"` on the dropdown container
- No `role="option"` on dropdown items
- No `aria-autocomplete="list"`

Screen reader users cannot discover, navigate, or use the @-mention autocomplete feature.

**Recommended fix:** Implement the WAI-ARIA combobox pattern (https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).

---

### FINDING A11Y-7: Lint panel "fix" buttons lack descriptive accessible names

- **Severity:** MINOR
- **File:** `src/app/components/LintPanel.tsx` lines 88-97

```tsx
<button
  onClick={() => setExpandedFix(expandedFix === i ? null : i)}
  className="ml-1.5 inline-flex items-center gap-0.5 text-indigo-400 hover:text-indigo-300"
>
  <Lightbulb className="h-3 w-3" />
  <span className="underline">fix</span>
</button>
```

**Problem:** The button text "fix" is generic and does not indicate which lint issue's fix will be shown. Also, the expanded/collapsed state is not communicated.

**Recommended fix:** Add `aria-expanded={expandedFix === i}` and `aria-label={`Show fix for ${r.ruleName}`}`.

---

### FINDING A11Y-8: Delete button in ArtifactList has no accessible state indicator

- **Severity:** MINOR
- **File:** `src/app/components/ArtifactManager/ArtifactList.tsx` lines 87-100

**Problem:** The delete button changes text from "Delete" to "Confirm" via a two-click pattern, but this state change is not communicated to screen readers. The button also uses `opacity-0 group-hover:opacity-100`, making it invisible to sighted keyboard users who tab to it without hovering.

**Recommended fix:** Remove the `opacity-0` on keyboard focus (add `focus:opacity-100`), and add `aria-label` that changes with state: `aria-label={pendingDelete === artifact.id ? "Confirm deletion of " + artifact.name : "Delete " + artifact.name}`.

---

### FINDING A11Y-9: Focus management not handled when dropdown opens/closes in Editor

- **Severity:** MINOR
- **File:** `src/app/components/Editor.tsx`

**Problem:** When the @-mention dropdown appears, focus stays in the textarea (which is correct for this pattern). However, when a mention is inserted via keyboard (Enter/Tab), focus is restored via `requestAnimationFrame` which could fail or be delayed. Using `useEffect` or a more reliable mechanism would be better.

---

### FINDING A11Y-10: Spinner in OutputPanel has no accessible announcement

- **Severity:** MINOR
- **File:** `src/app/components/OutputPanel.tsx` lines 49-73

**Problem:** The loading spinner has visual text "Compiling..." but no `aria-live` region or `role="status"` to announce the loading state to screen readers.

**Recommended fix:** Add `role="status"` and `aria-live="polite"` to the container:
```tsx
<div className="flex h-full items-center justify-center" role="status" aria-live="polite">
```

---

## 4. Stale Closure Risks

### FINDING SC-1: Debounced compile callback captures stale input state

- **Severity:** CRITICAL
- **File:** `src/app/hooks/useCompiler.ts` lines 40-46, called from `src/app/page.tsx` lines 39-50

```tsx
// useCompiler.ts
const compile = useCallback(
  (input: CompileInput) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => compileNow(input), 500);
  },
  [compileNow]
);
```

```tsx
// page.tsx
useEffect(() => {
  compile({ rawInput, dial, tokenBudget, templateOverride });
}, [rawInput, dial, tokenBudget, templateOverride, compile, clear]);
```

**Analysis:** The `input` parameter to `compile()` is captured correctly at call time -- it is passed as a function argument, not closed over. When the debounce timer fires 500ms later, the `input` object was frozen at the time `compile()` was called, not when the timeout fires. This means if the user types fast, intermediate inputs are correctly discarded (the timer is cleared), and only the last 500ms-stable input is compiled.

However, there is a subtle issue: during the 500ms debounce window, if the user changes `rawInput` rapidly, the useEffect fires for each change, each time calling `compile()` with the latest input. The previous timer is correctly cleared. BUT: the `compileNow` function inside the timeout closure captures the `compileNow` identity from the `useCallback` dependencies. Since `compileNow` has `[]` as its dependency array, its identity is stable across renders, so this is actually safe.

**Verdict:** The debounce pattern is correctly implemented. The stale closure risk is mitigated by passing the input as a parameter rather than closing over state. No action needed.

---

### FINDING SC-2: Keyboard shortcut handler closes over all form state

- **Severity:** MAJOR (duplicate of UE-2, listed here for stale-closure context)
- **File:** `src/app/page.tsx` lines 53-69

**Problem:** As noted in UE-2, the keyboard handler closes over `rawInput`, `dial`, `tokenBudget`, and `templateOverride`. Because these are in the dependency array, the handler IS always fresh. But this freshness comes at the cost of constant re-registration. If any dependency were accidentally omitted, the handler would use stale values silently.

**Risk level:** Currently safe but fragile. A ref-based approach (see UE-2 fix) is more robust.

---

### FINDING SC-3: insertMention closes over `value` and `mentionStart`

- **Severity:** MINOR
- **File:** `src/app/components/Editor.tsx` lines 69-86

```tsx
const insertMention = useCallback(
  (artifact: ArtifactOption) => {
    const before = value.slice(0, mentionStart);
    const after = value.slice(
      textareaRef.current?.selectionStart ?? mentionStart
    );
    // ...
  },
  [value, mentionStart, onChange]
);
```

**Analysis:** `value` and `mentionStart` are correctly in the dependency array, so `insertMention` is always fresh. The `textareaRef.current?.selectionStart` is accessed at call time (refs are always current), so that is also safe. No stale closure risk.

---

### FINDING SC-4: copyToClipboard and exportJson close over `rendered` and `spec`

- **Severity:** INFO
- **File:** `src/app/components/OutputPanel.tsx` lines 20-44

**Analysis:** Both `useCallback` hooks correctly list their dependencies (`[rendered]` and `[spec]`). The closures will always have fresh values. No stale closure risk.

---

## 5. Memory Leaks

### FINDING ML-1: Debounce timer cleanup is correctly implemented

- **Severity:** INFO (positive finding)
- **File:** `src/app/hooks/useCompiler.ts` lines 13-16

```tsx
useEffect(() => {
  return () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };
}, []);
```

**Assessment:** The cleanup function correctly clears the debounce timer on unmount. The `clear` function also clears the timer. This is well-implemented.

---

### FINDING ML-2: No AbortController for async compilation -- stale results can arrive after unmount

- **Severity:** MAJOR
- **File:** `src/app/hooks/useCompiler.ts` lines 19-37

```tsx
const compileNow = useCallback(async (input: CompileInput) => {
  setCompiling(true);
  setError(null);
  try {
    const { compile: runCompile } = await import("@/compiler/pipeline");
    const { resolveRefs } = await import("@/artifacts/resolver");
    const { getArtifactById } = await import("@/artifacts/store");

    const result = await runCompile(
      input,
      (refs: string[]) => resolveRefs(refs),
      (id: string) => getArtifactById(id).then((a) => a ?? null)
    );
    setOutput(result);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Compilation failed");
  } finally {
    setCompiling(false);
  }
}, []);
```

**Problem:** If the component unmounts while `compileNow` is in progress (e.g., during navigation), the `setOutput`, `setError`, and `setCompiling` calls will execute on an unmounted component. In React 18+, this does not cause a memory leak per se (React silently ignores the state updates), but it IS a logic error and can cause unexpected behavior if the component is remounted.

More critically: if two rapid calls to `compileNow` overlap (the debounce mostly prevents this, but it is not impossible if the user triggers Ctrl+Enter while a debounced compile is mid-flight), there is a race condition where the first (stale) result can overwrite the second (fresh) result.

**Recommended fix:** Use an AbortController or a request ID pattern:

```tsx
const requestIdRef = useRef(0);

const compileNow = useCallback(async (input: CompileInput) => {
  const thisRequestId = ++requestIdRef.current;
  setCompiling(true);
  setError(null);
  try {
    // ... compile ...
    if (requestIdRef.current === thisRequestId) {
      setOutput(result);
    }
  } catch (err) {
    if (requestIdRef.current === thisRequestId) {
      setError(err instanceof Error ? err.message : "Compilation failed");
    }
  } finally {
    if (requestIdRef.current === thisRequestId) {
      setCompiling(false);
    }
  }
}, []);
```

---

### FINDING ML-3: Keyboard event listener properly cleaned up

- **Severity:** INFO (positive finding)
- **File:** `src/app/page.tsx` lines 67-68

**Assessment:** The `removeEventListener` in the cleanup function correctly mirrors the `addEventListener`. No leak.

---

### FINDING ML-4: Object URL in exportJson is properly revoked

- **Severity:** INFO (positive finding)
- **File:** `src/app/components/OutputPanel.tsx` lines 34-44

```tsx
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `prompt-spec-${spec.id}.json`;
a.click();
URL.revokeObjectURL(url);
```

**Assessment:** `URL.revokeObjectURL` is called synchronously after `click()`. This is technically a race condition (the browser may not have finished reading the blob URL before it is revoked), but in practice all major browsers handle this correctly because the download is initiated synchronously. No leak.

---

### FINDING ML-5: Dynamic imports are not cached or cleaned up

- **Severity:** MINOR
- **File:** `src/app/hooks/useCompiler.ts` lines 23-25, `src/app/hooks/useArtifacts.ts` lines 12-13

```tsx
const { compile: runCompile } = await import("@/compiler/pipeline");
const { resolveRefs } = await import("@/artifacts/resolver");
const { getArtifactById } = await import("@/artifacts/store");
```

**Problem:** These dynamic imports are called on every compilation. While bundlers like webpack/turbopack cache modules after first load, the `await import()` call still creates a microtask and returns a new module namespace object each time. This is not a memory leak (the module itself is cached), but it IS unnecessary overhead after the first call.

**Recommended fix:** Import at the top of the file or cache the imported functions in a ref:

```tsx
const modulesRef = useRef<{ compile: typeof import("@/compiler/pipeline")["compile"] } | null>(null);
```

---

### FINDING ML-6: useArtifacts loads all artifacts into memory with no pagination

- **Severity:** MINOR
- **File:** `src/app/hooks/useArtifacts.ts` line 16

```tsx
const all = await getAllArtifacts();
setArtifacts(all);
```

**Problem:** `getAllArtifacts()` calls `db.artifacts.toArray()` which loads every artifact into memory. With large artifact collections, this could consume significant memory. However, for a client-side tool with a local IndexedDB, this is unlikely to be a problem in practice.

---

## 6. React 19 Opportunities

### FINDING R19-1: useCompiler could leverage use() for dynamic imports

- **Severity:** INFO
- **File:** `src/app/hooks/useCompiler.ts`

**Opportunity:** React 19's `use()` hook can unwrap promises during render, which could simplify the dynamic import pattern. However, since the compilation is an intentional side effect (not rendering data), `use()` is not directly applicable here. The current pattern is appropriate.

---

### FINDING R19-2: useActionState could replace manual compiling/error state management

- **Severity:** INFO
- **File:** `src/app/hooks/useCompiler.ts`

**Opportunity:** React 19's `useActionState` (formerly `useFormState`) provides a built-in pattern for `[state, dispatch, isPending]` that could replace the manual `compiling`/`error`/`output` state trio. This would also provide automatic `useTransition`-based pending states.

```tsx
const [state, compileAction, isPending] = useActionState(
  async (prev, input: CompileInput) => {
    const result = await runCompile(input, ...);
    return { output: result, error: null };
  },
  { output: null, error: null }
);
```

This would eliminate the `setCompiling(true)` / `setCompiling(false)` boilerplate and provide React-managed pending states.

---

### FINDING R19-3: Layout.tsx is already a proper Server Component

- **Severity:** INFO (positive finding)
- **File:** `src/app/layout.tsx`

**Assessment:** `layout.tsx` has no `"use client"` directive and uses no client-side hooks. It correctly functions as a React Server Component. Metadata is properly exported. Fonts are loaded server-side via `next/font/google`. This is well-structured.

---

### FINDING R19-4: useCommands hook does not need to be a hook

- **Severity:** MINOR
- **File:** `src/app/hooks/useCommands.ts`

```tsx
export function useCommands() {
  const parseCommands = (input: string): { command: string; args: string } | null => {
    const match = input.match(/^\/(\w+)\s*(.*)/);
    if (!match) return null;
    return { command: match[1], args: match[2].trim() };
  };
  return { parseCommands };
}
```

**Problem:** This "hook" uses no React features -- no state, no effects, no context, no refs. It is a pure function wrapped in a hook for no reason. Every call to `useCommands()` creates a new `parseCommands` function identity, which would cause unnecessary re-renders if passed as a prop or dependency.

Furthermore, this hook does not appear to be used anywhere in the codebase (it is not imported by any component).

**Recommended fix:** Export `parseCommands` as a standalone utility function, or delete the file if unused.

---

### FINDING R19-5: Server Components could handle template definitions

- **Severity:** INFO
- **File:** `src/app/components/TemplatePicker.tsx`

**Opportunity:** The template list is static (`const templates = [...]`). This component could be refactored so the template data is loaded server-side and only the interactive selection logic runs client-side. However, since the data is a small constant array, the benefit is negligible.

---

### FINDING R19-6: React 19 ref callbacks could replace autoResize useEffect

- **Severity:** INFO
- **File:** `src/app/components/Editor.tsx`

**Opportunity:** React 19's ref cleanup callbacks could replace the autoResize useEffect:

```tsx
<textarea
  ref={(node) => {
    if (node) {
      node.style.height = "auto";
      node.style.height = Math.max(200, node.scrollHeight) + "px";
    }
  }}
/>
```

However, this would not fire on `value` prop changes (only on mount/unmount), so the useEffect approach is still more appropriate here.

---

## 7. General Code Quality

### FINDING GQ-1: OutputPanel renders lines using array index as key

- **Severity:** MINOR
- **File:** `src/app/components/OutputPanel.tsx` lines 117-181

```tsx
rendered.split("\n").map((line, i) => {
  // ...
  return <div key={i} className="text-gray-300">{line}</div>;
})
```

**Problem:** Using array index as key is generally an anti-pattern when the list can be reordered or items can be inserted/removed. However, in this case the list is derived from a static string split (the rendered output), and items are never individually mutated. Index keys are acceptable here.

**Assessment:** Acceptable, but a content-based key would be more robust: `key={`${i}-${line.slice(0,20)}`}`.

---

### FINDING GQ-2: document.execCommand("copy") is deprecated

- **Severity:** MINOR
- **File:** `src/app/components/OutputPanel.tsx` lines 25-30

```tsx
// Fallback
const ta = document.createElement("textarea");
ta.value = rendered;
document.body.appendChild(ta);
ta.select();
document.execCommand("copy");
document.body.removeChild(ta);
```

**Problem:** `document.execCommand("copy")` is deprecated and removed in some browsers. However, since it serves as a fallback when `navigator.clipboard.writeText` fails, and only fires on older browsers that DO support execCommand, this is pragmatically acceptable. Consider showing a toast/feedback to the user when copy succeeds or fails.

---

### FINDING GQ-3: Duplicated artifact state management between page.tsx and ArtifactManager

- **Severity:** MAJOR
- **File:** `src/app/page.tsx` (uses `useArtifacts`), `src/app/components/ArtifactManager/index.tsx` (has its own artifact state)

**Problem:** Two independent state trees manage the same data:
1. `page.tsx` uses the `useArtifacts` hook which loads all artifacts
2. `ArtifactManager/index.tsx` has its own `useState<Artifact[]>` and its own `loadArtifacts`

When the user creates/edits/deletes an artifact in the ArtifactManager, the parent's `useArtifacts` data is NOT refreshed. This means the Editor's @-mention autocomplete will show stale artifact data until a page refresh.

**Recommended fix:** Lift artifact state management to a shared context, or pass `useArtifacts`'s return value into `ArtifactManager` as props.

---

### FINDING GQ-4: Lint panel imported with lucide-react icons but no tree-shaking verification

- **Severity:** INFO
- **File:** `src/app/components/LintPanel.tsx` line 3

```tsx
import { AlertTriangle, XCircle, Info, CheckCircle, Lightbulb } from "lucide-react";
```

**Assessment:** Named imports from lucide-react are tree-shakeable. This is correct. No issue.

---

### FINDING GQ-5: No loading states on dynamically imported components

- **Severity:** MINOR
- **File:** `src/app/page.tsx` lines 14-24

```tsx
const LintPanel = dynamic(() => import("@/app/components/LintPanel"), { ssr: false });
const InjectionPanel = dynamic(() => import("@/app/components/InjectionPanel"), { ssr: false });
const ArtifactManagerPanel = dynamic(() => import("@/app/components/ArtifactManager"), {
  ssr: false,
  loading: () => <div className="text-center text-sm text-gray-500 py-4">Loading...</div>
});
```

**Problem:** `LintPanel` and `InjectionPanel` have no `loading` fallback, while `ArtifactManagerPanel` does. If these chunks load slowly, the panels will pop in abruptly. Inconsistent loading UX.

**Recommended fix:** Add `loading` fallbacks to all three, or remove it from `ArtifactManagerPanel` for consistency if the components are small enough to load instantly.

---

### FINDING GQ-6: No user feedback on copy-to-clipboard action

- **Severity:** MINOR
- **File:** `src/app/components/OutputPanel.tsx` lines 20-31

**Problem:** The "Copy" button provides no visual feedback when clicked. Users cannot tell if the copy succeeded or failed. No toast, no button text change, no animation.

**Recommended fix:** Add a brief "Copied!" state to the button text:
```tsx
const [copied, setCopied] = useState(false);
// After successful copy:
setCopied(true);
setTimeout(() => setCopied(false), 2000);
```

---

### FINDING GQ-7: ArtifactEditor initializes local state from props without sync

- **Severity:** MAJOR
- **File:** `src/app/components/ArtifactManager/ArtifactEditor.tsx` lines 17-20

```tsx
const [name, setName] = useState(artifact.name);
const [description, setDescription] = useState(artifact.description);
const [aliasesInput, setAliasesInput] = useState(artifact.aliases.join(", "));
const [blocks, setBlocks] = useState<ArtifactBlock[]>(artifact.blocks);
```

**Problem:** `useState` initializers only run once. If the `artifact` prop changes (e.g., because the parent re-fetches data), the local state will NOT update. The component will continue showing stale data from the original render.

This is a known React pattern issue sometimes called "derived state from props." If the same `ArtifactEditor` is rendered with a different `artifact.id`, it will show the previous artifact's data.

**Mitigating factor:** The component is conditionally rendered (`if (selected)`) and the selection is controlled by `selectedId`, which changes atomically. If `selectedId` changes, the old ArtifactEditor unmounts and a new one mounts, so `useState` initializers run fresh. The risk only materializes if the `artifact` object changes while `selectedId` stays the same (e.g., during a background data refresh).

**Recommended fix:** Add a `key={artifact.id}` on the `<ArtifactEditor>` in the parent to force remounting on artifact change. This is already implicitly handled by the conditional rendering, but making it explicit is defensive.

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 3     |
| MAJOR    | 10    |
| MINOR    | 11    |
| INFO     | 7     |
| **Total** | **31** |

### Top 5 Actions (Priority Order)

1. **Add error boundaries** (EB-1, EB-2, EB-3) -- One crash in any component kills the entire app. Add `error.tsx`, `global-error.tsx`, and component-level boundaries around ArtifactManager and OutputPanel.

2. **Fix BlockEditor useEffect cascade** (UE-4) -- The eslint-disable + useEffect-calling-parent-onChange pattern is the highest-risk code in the codebase. Replace with direct event handler calls.

3. **Add race condition protection to useCompiler** (ML-2) -- Overlapping compilations can produce stale results. Add a request ID guard.

4. **Add ARIA attributes to interactive components** (A11Y-1, A11Y-2, A11Y-4, A11Y-6) -- The DialControl, TemplatePicker, ArtifactManager toggle, and Editor autocomplete all lack required accessibility semantics.

5. **Unify artifact state management** (GQ-3) -- Two independent state trees for the same data causes stale @-mention autocomplete after artifact edits.
