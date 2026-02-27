# Prompt Dial

A prompt compiler that transforms lazy, underspecified inputs into rigorous, structured prompts with injectable context from your personal knowledge artifacts.

Type "Write a report on AI safety" and get a full structured prompt with sections, instructions, injected context blocks, quality scoring, and token budget management.

## Features

- **Lazy Input Compilation** -- Type a rough idea, get a production-grade prompt. The compiler detects intent, selects a template, and builds a full PromptSpec IR.
- **5 Templates** -- Academic Report, PRD, Decision Memo, Critique, Research Brief. Each has dial-aware sections that scale from minimal (0) to maximum depth (5).
- **Dial Control (0-5)** -- Slide from minimal to maximum. Higher dial = more sections, more depth, more structure.
- **Artifact System** -- Create knowledge artifacts with tagged, prioritized blocks. Reference them with `@ArtifactName` syntax to inject relevant context into your prompts.
- **8 Seed Artifacts** -- Ships with AI, Machine Learning, LLMs, Product Management, Startups, Security, Data Science, and UX Design.
- **Token Budget** -- Set a limit and lower-priority blocks get omitted automatically. The injection report shows exactly what was included and why.
- **Lint Scoring** -- 6 rules catch vague inputs, missing constraints, budget overruns, empty sections, and do-not-send leaks. Score 0-100 with actionable fix suggestions.
- **Local-First** -- All data stored in IndexedDB via Dexie. Nothing leaves your browser.
- **Copy & Export** -- One-click copy the rendered prompt. Download the full PromptSpec as JSON.

## Quick Start

```bash
git clone https://github.com/esk3nder/promptdial.git
cd promptdial
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

```
Lazy Input  -->  Intent Parser  -->  Template Selection
                                          |
                                     Dial Filter (sections by depth)
                                          |
@Artifact refs  -->  Resolver  -->  Block Selector (tags + priority + budget)
                                          |
                                     Spec Generator (PromptSpec IR)
                                          |
                                     Renderer (final prompt string)
                                          |
                                     Lint Engine (6 rules, score 0-100)
                                          |
                                     Output (prompt + lint + injection report)
```

### Compilation Pipeline

1. **Intent Parser** -- Classifies input to a template, extracts constraints (audience, tone, length), parses `@Artifact` references
2. **Artifact Resolver** -- Resolves `@` references to artifacts via case-insensitive alias matching
3. **Block Selector** -- Matches artifact blocks to sections by tags, sorts by priority, enforces token budget
4. **Spec Generator** -- Builds the PromptSpec IR with dial-filtered sections and injected blocks
5. **Renderer** -- Converts PromptSpec to a formatted prompt string
6. **Lint Engine** -- Validates output quality with 6 rules and calculates a 0-100 score

### Artifact System

Artifacts are collections of tagged, prioritized content blocks. Create them for any domain:

- Each block has **tags** (for section matching), **priority** (0-100, higher = included first), and a **doNotSend** flag
- Reference artifacts in your input with `@ArtifactName`
- Blocks are injected into matching sections based on tag overlap
- When a token budget is set, lower-priority blocks are omitted first

### Lint Rules

| Rule | Severity | What it catches |
|------|----------|----------------|
| `vague-input` | Warning | Input under 10 words |
| `missing-constraints` | Warning | No audience, tone, or length specified |
| `no-template-match` | Warning | Input doesn't match template keywords |
| `budget-exceeded` | Error | Rendered prompt exceeds token budget |
| `empty-sections` | Warning | Sections with no content |
| `do-not-send-leak` | Error | Protected blocks appearing in output |

## Project Structure

```
src/
  core/           # PromptSpec IR types, Zod schemas, validator
  compiler/       # Intent parser, block selector, spec generator, renderer, pipeline
  templates/      # 5 template definitions + registry
  artifacts/      # IndexedDB store, resolver, injector, 8 seed artifacts
  lint/           # 6 rules, engine, scorer
  app/
    components/   # Editor, TemplatePicker, DialControl, OutputPanel, LintPanel,
                  # InjectionPanel, ArtifactManager (full CRUD)
    hooks/        # useCompiler, useArtifacts, useCommands
    lib/          # IndexedDB wrapper (Dexie), token estimation
    api/          # /api/compile route
```

## Tech Stack

- **Next.js 16** with App Router
- **TypeScript** (strict mode)
- **Tailwind CSS** (dark theme)
- **Dexie** (IndexedDB wrapper)
- **Zod** (runtime schema validation)

## License

MIT
