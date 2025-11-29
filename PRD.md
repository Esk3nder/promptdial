# PromptDial Product Requirements Document (PRD)

**Version:** 1.0
**Last Updated:** November 29, 2025
**Status:** Active Development

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [Target Users](#4-target-users)
5. [Core Features](#5-core-features)
6. [User Stories](#6-user-stories)
7. [Product Architecture](#7-product-architecture)
8. [Technical Requirements](#8-technical-requirements)
9. [User Experience](#9-user-experience)
10. [Monetization](#10-monetization)
11. [Success Metrics](#11-success-metrics)
12. [Competitive Analysis](#12-competitive-analysis)
13. [Roadmap](#13-roadmap)
14. [Risks & Mitigations](#14-risks--mitigations)
15. [Appendix](#15-appendix)

---

## 1. Executive Summary

### 1.1 Product Vision

PromptDial is a meta-prompting SaaS platform that transforms "lazy" prompts into academically rigorous, optimized versions for AI interaction. It serves as an intelligent prompt engineering assistant that not only improves prompts but executes them, delivering dual value in a single interaction.

### 1.2 Value Proposition

**"Turn any prompt into a 10x better prompt—instantly."**

PromptDial addresses the fundamental gap between what users *want* to ask AI and what they *should* ask to get optimal results. Most users lack prompt engineering expertise, resulting in subpar AI outputs. PromptDial bridges this gap automatically.

### 1.3 Key Differentiators

| Feature | PromptDial | Competitors |
|---------|------------|-------------|
| Dual Output (prompt + answer) | ✅ | ❌ |
| Context-aware enrichment | ✅ (Deep Dial) | Limited |
| Controllable optimization dials | ✅ (12+ parameters) | ❌ |
| Reusable context profiles | ✅ (Artifacts) | ❌ |
| Multi-provider support | ✅ | Varies |
| Academic rigor framework | ✅ | ❌ |

---

## 2. Problem Statement

### 2.1 The Prompt Quality Gap

**Problem:** 90% of AI users write suboptimal prompts, resulting in:
- Vague, unfocused AI responses
- Multiple retry attempts to get desired output
- Missed context that would improve relevance
- Inconsistent results across sessions
- Wasted time and AI credits

**Evidence:**
- Average user prompt: 15-30 words
- Optimal engineered prompt: 100-500 words with structure
- Users rarely include: persona definitions, output formats, constraints, examples

### 2.2 User Pain Points

1. **Knowledge Gap:** Users don't know prompt engineering best practices
2. **Time Investment:** Learning prompt engineering takes significant effort
3. **Context Loss:** Users forget to include relevant business/personal context
4. **Inconsistency:** Ad-hoc prompting yields inconsistent quality
5. **Tool Fatigue:** Switching between AI tools without optimized prompts

### 2.3 Market Opportunity

- 180M+ ChatGPT users (2024)
- Rapid enterprise AI adoption
- Growing frustration with AI output quality
- Limited solutions for prompt optimization
- No dominant player in meta-prompting space

---

## 3. Solution Overview

### 3.1 Core Concept

PromptDial acts as an intelligent intermediary between users and AI models. Users input their natural, "lazy" prompts, and PromptDial:

1. **Analyzes** the user's intent and goals
2. **Synthesizes** an optimized, structured prompt
3. **Executes** the optimized prompt against the AI
4. **Returns** both the enhanced prompt and the AI's response

### 3.2 The Dial Metaphor

Like a mixing board in a recording studio, PromptDial provides "dials" that control optimization parameters:

```
┌─────────────────────────────────────────────────┐
│  DEPTH      ●───────────○  Deep analysis        │
│  BREADTH    ○───────●───○  Moderate scope       │
│  VERBOSITY  ○───●───────○  Concise output       │
│  CREATIVITY ○───────●───○  Balanced novelty     │
│  EVIDENCE   ●───────────○  Strict verification  │
└─────────────────────────────────────────────────┘
```

### 3.3 Product Tiers

| Tier | Features | Credits | Price |
|------|----------|---------|-------|
| **Free** | Standard Dial | 100/month | $0 |
| **Pro** | Standard + Deep Dial + Artifacts | Unlimited | $19/month |
| **Enterprise** | API access + Custom models | Custom | Contact |

---

## 4. Target Users

### 4.1 Primary Personas

#### Persona 1: The Knowledge Worker
- **Profile:** Marketing manager, consultant, analyst
- **AI Usage:** Daily for content, analysis, research
- **Pain Point:** Inconsistent AI outputs affecting work quality
- **Value Sought:** Reliable, professional-grade AI results

#### Persona 2: The Entrepreneur
- **Profile:** Startup founder, solo business owner
- **AI Usage:** Heavy reliance on AI for multiple tasks
- **Pain Point:** Time wasted on prompt iteration
- **Value Sought:** Efficiency and time savings

#### Persona 3: The AI Enthusiast
- **Profile:** Early adopter, power user
- **AI Usage:** Experiments with multiple AI tools
- **Pain Point:** Complexity of optimal prompting
- **Value Sought:** Advanced control and optimization

#### Persona 4: The Enterprise User
- **Profile:** Team lead, department head
- **AI Usage:** Standardizing AI usage across team
- **Pain Point:** Inconsistent prompt quality across team members
- **Value Sought:** Standardization and quality assurance

### 4.2 User Segments by Priority

| Priority | Segment | Size | Acquisition Cost | LTV Potential |
|----------|---------|------|------------------|---------------|
| P0 | Knowledge Workers | Large | Medium | High |
| P1 | Entrepreneurs | Medium | Low | Medium |
| P2 | AI Enthusiasts | Small | Low | Medium |
| P3 | Enterprise | Small | High | Very High |

---

## 5. Core Features

### 5.1 Standard Dial (MVP Feature)

**Description:** Transform any prompt into an optimized version with one click.

**Functionality:**
- Input: User's natural language prompt
- Processing: Meta-prompting via Claude Sonnet
- Output: Synthesized prompt + Executed answer

**Technical Details:**
- Model: Claude Sonnet 4 (claude-sonnet-4-20250514)
- Token Budget: 1,800 tokens default
- Response Time: 3-8 seconds typical
- Cost: 1 credit per optimization

**Example:**

```
INPUT (User's Lazy Prompt):
"Write me a marketing email"

OUTPUT (Synthesized Prompt):
"You are an expert email copywriter specializing in B2B SaaS marketing.
Write a compelling marketing email with the following specifications:

CONTEXT:
- Purpose: Product launch announcement
- Audience: Existing customers and warm leads
- Tone: Professional yet conversational

STRUCTURE:
1. Subject line (A/B testing variants)
2. Preview text
3. Opening hook
4. Value proposition
5. Call-to-action
6. P.S. line

CONSTRAINTS:
- Word count: 150-200 words for body
- Mobile-optimized formatting
- Clear single CTA

OUTPUT FORMAT:
Provide the complete email with annotations explaining strategic choices."
```

### 5.2 Deep Dial (Premium Feature)

**Description:** Context-aware prompt optimization using real-world company/website data.

**Functionality:**
- Input: User prompt + Context URL (website)
- Processing:
  1. Scrape website via Firecrawl
  2. Extract company intelligence (name, industry, products, competitors)
  3. Enrich prompt with contextual data
  4. Generate enhanced system prompt
  5. Optimize with full context
- Output: Context-enriched optimized prompt + Answer

**Technical Details:**
- Web Scraping: Firecrawl API
- Extraction: AI-powered entity extraction
- Cost: 5 credits per optimization
- Quality Score: 0-100 enrichment rating

**Example:**

```
INPUT:
Prompt: "Help me write a sales pitch"
URL: https://acme-software.com

EXTRACTED CONTEXT:
- Company: Acme Software
- Industry: Project Management SaaS
- Products: TaskFlow Pro, TeamSync
- Competitors: Asana, Monday.com
- Keywords: productivity, collaboration, remote teams

OUTPUT (Deep Dial Enhanced):
"You are a B2B sales strategist specializing in the project management
software space. Create a compelling sales pitch for Acme Software's
TaskFlow Pro product.

COMPANY CONTEXT:
- Acme Software operates in the competitive project management SaaS market
- Primary competitors: Asana, Monday.com
- Key differentiators to emphasize: [analyzed from website]

TARGET AUDIENCE: Remote teams seeking productivity solutions

PITCH STRUCTURE:
1. Pain point acknowledgment
2. Competitive positioning vs. Asana/Monday.com
3. TaskFlow Pro unique value
4. Social proof / case studies
5. Clear next steps

..."
```

### 5.3 Artifacts (Context Profiles)

**Description:** Reusable context profiles that can be referenced in prompts via @mentions.

**Functionality:**
- Create persona profiles (e.g., @assistant, @brand-voice, @technical-writer)
- Reference in prompts: "Write this @brand-voice"
- Auto-substitution during optimization
- Markdown-supported content

**Use Cases:**
- Brand voice guidelines
- Target audience definitions
- Writing style guides
- Persona instructions
- Recurring context (e.g., company info)

**Technical Details:**
- Handle format: @lowercase-alphanumeric (2-30 chars)
- Storage: PostgreSQL artifacts table
- Resolution: Pre-processing before kernel execution

### 5.4 Optimization Dials (Control System)

**Description:** Fine-grained control over optimization behavior.

**Available Dials:**

| Dial | Range | Description |
|------|-------|-------------|
| **Preset** | laser, scholar, builder, strategist, socratic, brainstorm, pm, analyst | Pre-configured dial combinations |
| **Depth** | 0-5 | Analysis depth (surface → comprehensive) |
| **Breadth** | 0-5 | Scope of coverage (narrow → expansive) |
| **Verbosity** | 0-5 | Output detail level (terse → elaborate) |
| **Creativity** | 0-5 | Novelty in approach (conventional → innovative) |
| **Risk Tolerance** | 0-5 | Boldness in assumptions (conservative → speculative) |
| **Evidence Strictness** | 0-5 | Verification requirements (relaxed → rigorous) |
| **Browse Aggressiveness** | 0-5 | Web search tendency (minimal → comprehensive) |
| **Token Budget** | 500-8000 | Maximum response length |
| **Output Format** | markdown, json, hybrid | Response structure |

### 5.5 Prompt History

**Description:** Access and manage all past optimizations.

**Functionality:**
- View all previous dial results
- Search and filter history
- Re-run past prompts
- Copy synthesized prompts
- Track credits used

**Technical Details:**
- Storage: dial_results table
- Pagination: 50 results per page
- Retention: Unlimited for Pro users

---

## 6. User Stories

### 6.1 Epic: Prompt Optimization

```
US-001: Basic Dial
AS A user
I WANT TO enter a simple prompt and get an optimized version
SO THAT I can get better results from AI without learning prompt engineering

Acceptance Criteria:
- [ ] Can enter any text prompt
- [ ] Receive optimized prompt within 10 seconds
- [ ] Receive executed answer alongside prompt
- [ ] Can copy optimized prompt with one click
- [ ] Result saved to history automatically
```

```
US-002: Deep Dial Enrichment
AS A Pro user
I WANT TO provide a website URL for context
SO THAT my prompts are enriched with relevant business information

Acceptance Criteria:
- [ ] Can toggle Deep Dial mode
- [ ] Can enter context URL
- [ ] Website scraped and analyzed
- [ ] Company info extracted and displayed
- [ ] Enrichment quality score shown
- [ ] 5 credits deducted on success
```

```
US-003: Model Selection
AS A user
I WANT TO choose which AI model optimizes my prompt
SO THAT I can use my preferred provider

Acceptance Criteria:
- [ ] Model dropdown with available options
- [ ] Shows model capabilities/strengths
- [ ] Selection persists across sessions
- [ ] Graceful handling of unavailable models
```

### 6.2 Epic: Context Management

```
US-004: Create Artifact
AS A user
I WANT TO create reusable context profiles
SO THAT I don't have to repeat common context

Acceptance Criteria:
- [ ] Can create artifact with unique handle
- [ ] Can add markdown content
- [ ] Handle validated for format
- [ ] Saved and retrievable
```

```
US-005: Use Artifact in Prompt
AS A user
I WANT TO reference artifacts with @mentions
SO THAT context is automatically included

Acceptance Criteria:
- [ ] Typing @ shows artifact suggestions
- [ ] Selection inserts @handle
- [ ] On dial, artifact content substituted
- [ ] Invalid mentions show error
```

### 6.3 Epic: History & Management

```
US-006: View History
AS A user
I WANT TO see my past prompt optimizations
SO THAT I can reuse and reference them

Acceptance Criteria:
- [ ] Paginated list of past dials
- [ ] Shows original prompt, synthesized prompt, answer
- [ ] Shows date, model, credits used
- [ ] Can expand to see full details
```

```
US-007: Re-run Prompt
AS A user
I WANT TO re-run a past prompt
SO THAT I can get fresh results with the same input

Acceptance Criteria:
- [ ] "Re-run" button on history items
- [ ] Pre-fills dial interface
- [ ] Executes as new dial (uses credits)
- [ ] New result saved to history
```

### 6.4 Epic: Account & Billing

```
US-008: Credit Balance
AS A user
I WANT TO see my remaining credits
SO THAT I know my usage status

Acceptance Criteria:
- [ ] Credit count displayed in header
- [ ] Updates after each dial
- [ ] Warning when credits low
- [ ] Clear upgrade CTA when exhausted
```

```
US-009: Upgrade to Pro
AS A Free user
I WANT TO upgrade my account
SO THAT I can access Deep Dial and unlimited credits

Acceptance Criteria:
- [ ] Clear upgrade path in UI
- [ ] Stripe checkout integration
- [ ] Immediate access upon payment
- [ ] Confirmation email sent
```

---

## 7. Product Architecture

### 7.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Dial UI     │  │ History UI  │  │ Artifacts UI            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NEXT.JS API ROUTES                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ /api/dial   │  │ /api/deep   │  │ /api/artifacts          │  │
│  └──────┬──────┘  └──────┬──────┘  └─────────────────────────┘  │
│         │                │                                       │
│  ┌──────▼────────────────▼──────┐                               │
│  │         KERNEL ENGINE         │                               │
│  │  • Meta-prompting logic       │                               │
│  │  • Response validation        │                               │
│  │  • Schema enforcement         │                               │
│  └──────────────┬───────────────┘                               │
└─────────────────┼───────────────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┬─────────────────┐
    ▼             ▼             ▼                 ▼
┌────────┐  ┌──────────┐  ┌──────────┐      ┌──────────┐
│Anthropic│  │ OpenAI   │  │ Google   │      │ Firecrawl│
│   API   │  │   API    │  │   API    │      │   API    │
└────────┘  └──────────┘  └──────────┘      └──────────┘

    │             │             │                 │
    └─────────────┴─────────────┴─────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │    PostgreSQL DB    │
              │  • dial_results     │
              │  • artifacts        │
              │  • user_profile     │
              │  • user_settings    │
              └─────────────────────┘
```

### 7.2 Data Flow: Standard Dial

```
User Input                    API Processing                    Output
    │                              │                               │
    ▼                              ▼                               ▼
┌──────────┐    POST         ┌──────────────┐              ┌────────────┐
│ "Write   │ ──────────────> │ 1. Auth      │              │ Synthesized│
│  email"  │  /api/dial      │ 2. Resolve @ │              │   Prompt   │
└──────────┘                 │ 3. Build msg │              ├────────────┤
                             │ 4. Call AI   │ ───────────> │   Final    │
                             │ 5. Validate  │              │   Answer   │
                             │ 6. Save DB   │              ├────────────┤
                             └──────────────┘              │  Metadata  │
                                                          └────────────┘
```

### 7.3 Data Flow: Deep Dial

```
User Input                         Processing Pipeline                      Output
    │                                      │                                   │
    ▼                                      ▼                                   ▼
┌──────────┐                    ┌─────────────────────┐                ┌────────────┐
│ Prompt + │     POST           │ 1. Scrape URL       │                │ Enriched   │
│   URL    │ ──────────────>    │    (Firecrawl)      │                │   Prompt   │
└──────────┘   /api/dial/deep   │                     │                ├────────────┤
                                │ 2. Extract Entities │                │   Final    │
                                │    - Company name   │ ─────────────> │   Answer   │
                                │    - Industry       │                ├────────────┤
                                │    - Products       │                │  Context   │
                                │    - Competitors    │                │   Data     │
                                │                     │                ├────────────┤
                                │ 3. Enrich Prompt    │                │  Quality   │
                                │ 4. Enhanced System  │                │   Score    │
                                │ 5. Call AI          │                └────────────┘
                                │ 6. Validate & Save  │
                                └─────────────────────┘
```

### 7.4 Kernel Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        KERNEL SYSTEM PROMPT                          │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ IDENTITY: Academic-Grade Prompt Synthesizer                    │ │
│  │ MISSION: Transform lazy prompts into optimized versions        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ DIAL CONFIG  │  │ STATE MGMT   │  │ OUTPUT SCHEMA            │  │
│  │ • Presets    │  │ • User goal  │  │ • ok: boolean            │  │
│  │ • Depth      │  │ • Certainty  │  │ • dials: {}              │  │
│  │ • Breadth    │  │ • Plan       │  │ • state: {}              │  │
│  │ • Verbosity  │  │ • Cursor     │  │ • prompt_blueprint: {}   │  │
│  │ • Creativity │  │ • Steps      │  │ • synthesized_prompt: "" │  │
│  │ • Evidence   │  │              │  │ • final_answer: ""       │  │
│  │ • Browse     │  │              │  │ • events: []             │  │
│  │ • Tokens     │  │              │  │ • confidence: 0-1        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ EXECUTION FLOW                                                 │ │
│  │ 1. Parse user goal → Extract intent                            │ │
│  │ 2. Analyze requirements → Determine optimal dials              │ │
│  │ 3. Synthesize prompt → Build structured, optimized version     │ │
│  │ 4. Execute prompt → Generate answer using synthesized prompt   │ │
│  │ 5. Return dual output → Both prompt and answer                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. Technical Requirements

### 8.1 Tech Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Frontend | Next.js | 15.x | React framework |
| Frontend | React | 19.x | UI library |
| Frontend | TypeScript | 5.7.x | Type safety |
| Frontend | Tailwind CSS | 4.x | Styling |
| UI Components | shadcn/ui | Latest | Component library |
| Backend | Next.js API Routes | 15.x | API layer |
| Database | PostgreSQL | 15+ | Data storage |
| ORM | Drizzle | Latest | Database access |
| Auth | Better Auth | Latest | Authentication |
| Billing | Autumn.js | Latest | Stripe integration |
| AI (Primary) | Anthropic SDK | Latest | Claude models |
| AI (Alt) | Vercel AI SDK | Latest | Multi-provider |
| Scraping | Firecrawl | Latest | Web scraping |
| Email | Resend | Latest | Transactional email |

### 8.2 Performance Requirements

| Metric | Target | Current |
|--------|--------|---------|
| Standard Dial latency | < 10s | 3-8s |
| Deep Dial latency | < 20s | 10-15s |
| History load time | < 2s | ~1s |
| API error rate | < 1% | TBD |
| Uptime | 99.9% | TBD |

### 8.3 Security Requirements

- **Authentication:** Session-based via Better Auth
- **Sessions:** 7-day expiration, httpOnly cookies
- **API Keys:** Server-side only, never exposed to client
- **Database:** Encrypted at rest, SSL in transit
- **User Data:** GDPR-compliant data handling
- **Audit Logging:** All dial operations logged

### 8.4 Scalability Considerations

- **Database:** Connection pooling via Drizzle
- **API:** Serverless-ready (Vercel deployment)
- **AI Calls:** Rate limiting per user
- **Caching:** Response caching for static content
- **CDN:** Static assets via Vercel Edge

### 8.5 API Rate Limits

| Tier | Dials/minute | Dials/day |
|------|--------------|-----------|
| Free | 10 | 100 |
| Pro | 30 | Unlimited |
| Enterprise | Custom | Custom |

---

## 9. User Experience

### 9.1 Information Architecture

```
PromptDial
├── Landing (/)
│   ├── Hero + Value Prop
│   ├── Feature Highlights
│   ├── Pricing
│   └── CTA → Sign Up
│
├── Dial (/dial) [Main Product]
│   ├── Prompt Input
│   ├── Deep Dial Toggle
│   ├── Model Selector
│   ├── Dial Button
│   └── Results Display
│       ├── Synthesized Prompt
│       ├── Final Answer
│       └── Copy/Execute Actions
│
├── History (/history)
│   ├── Search/Filter
│   ├── Paginated List
│   └── Detail Modal
│
├── Artifacts (/dial → side panel)
│   ├── Artifact List
│   ├── Create/Edit Form
│   └── Delete Confirmation
│
├── Dashboard (/dashboard)
│   ├── Usage Stats
│   ├── Credit Balance
│   └── Quick Actions
│
├── Account (/settings)
│   ├── Profile
│   ├── Preferences
│   └── Billing
│
└── Auth
    ├── Login (/login)
    ├── Register (/register)
    └── Reset Password (/reset-password)
```

### 9.2 Key User Flows

#### Flow 1: First-Time User Optimization

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Landing │───>│ Sign Up │───>│  Dial   │───>│ Enter   │───>│ View    │
│  Page   │    │  Form   │    │  Page   │    │ Prompt  │    │ Results │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
                                                  │
                                                  ▼
                                            ┌─────────┐
                                            │  Copy   │
                                            │ Prompt  │
                                            └─────────┘
```

#### Flow 2: Deep Dial Optimization

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Dial   │───>│ Toggle  │───>│ Enter   │───>│ Enter   │───>│  Click  │
│  Page   │    │Deep Dial│    │ Prompt  │    │  URL    │    │  Dial   │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
                                                                 │
                    ┌────────────────────────────────────────────┘
                    ▼
              ┌─────────────┐    ┌─────────────┐
              │   Loading   │───>│   Results   │
              │ (Scraping)  │    │ + Context   │
              └─────────────┘    └─────────────┘
```

### 9.3 UI/UX Principles

1. **Simplicity First:** One primary action per screen
2. **Progressive Disclosure:** Advanced features hidden until needed
3. **Instant Feedback:** Loading states, progress indicators
4. **Copy-Friendly:** One-click copy for all outputs
5. **Mobile Responsive:** Full functionality on all devices
6. **Dark Mode:** Theme preference respected

### 9.4 Key UI Components

| Component | Purpose | Location |
|-----------|---------|----------|
| PromptInput | Main text input with @ support | Dial page |
| DeepDialToggle | Enable/disable premium feature | Dial page |
| ModelSelector | Choose AI provider/model | Dial page |
| ResultsPanel | Display synthesized prompt + answer | Dial page |
| HistoryList | Paginated list of past dials | History page |
| ArtifactEditor | Create/edit context profiles | Dial sidebar |
| CreditBadge | Display remaining credits | Header |

---

## 10. Monetization

### 10.1 Pricing Strategy

**Model:** Credit-based with subscription tiers

| Tier | Monthly Price | Credits | Features |
|------|---------------|---------|----------|
| **Free** | $0 | 100 | Standard Dial, Basic History |
| **Pro** | $19 | Unlimited | + Deep Dial, Artifacts, Full History |
| **Team** | $49 | Unlimited × 5 | + Team Management, Shared Artifacts |
| **Enterprise** | Custom | Custom | + API Access, SSO, Custom Models |

### 10.2 Credit Economics

| Action | Credit Cost | Rationale |
|--------|-------------|-----------|
| Standard Dial | 1 | Base optimization |
| Deep Dial | 5 | Includes web scraping + enhanced processing |
| Artifact Resolution | 0 | Included in dial cost |
| History Access | 0 | Retention feature |

### 10.3 Revenue Projections

| Phase | Users | Pro Conversion | MRR |
|-------|-------|----------------|-----|
| Launch (M1-3) | 1,000 | 3% | $570 |
| Growth (M4-6) | 5,000 | 5% | $4,750 |
| Scale (M7-12) | 20,000 | 7% | $26,600 |

### 10.4 Billing Integration

- **Provider:** Autumn.js (Stripe backend)
- **Webhooks:** Auto-handled by Autumn
- **Portal:** Stripe Customer Portal for self-service
- **Invoicing:** Monthly billing cycle
- **Trials:** 7-day Pro trial for new users (planned)

---

## 11. Success Metrics

### 11.1 North Star Metric

**Prompts Optimized Per Week (Active Usage)**

This metric captures:
- User engagement
- Product value delivery
- Monetization potential

### 11.2 Key Performance Indicators (KPIs)

| Category | Metric | Target |
|----------|--------|--------|
| **Acquisition** | Weekly sign-ups | 500+ |
| **Activation** | First dial within 24h | > 60% |
| **Engagement** | Dials per active user/week | > 5 |
| **Retention** | Week 4 retention | > 40% |
| **Revenue** | Free → Pro conversion | > 5% |
| **Revenue** | Monthly churn | < 5% |

### 11.3 Product Health Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Dial success rate | > 99% | < 95% |
| Average dial latency | < 8s | > 15s |
| Deep Dial enrichment quality | > 70% | < 50% |
| API error rate | < 1% | > 3% |
| User satisfaction (NPS) | > 50 | < 30 |

### 11.4 Instrumentation Plan

**Events to Track:**
- `dial_started` - User initiated dial
- `dial_completed` - Dial successfully returned
- `dial_failed` - Dial encountered error
- `deep_dial_enabled` - User toggled Deep Dial
- `prompt_copied` - User copied synthesized prompt
- `answer_copied` - User copied final answer
- `artifact_created` - User created artifact
- `artifact_used` - Artifact referenced in prompt
- `history_viewed` - User viewed history
- `upgrade_initiated` - User started upgrade flow
- `upgrade_completed` - User upgraded to Pro

---

## 12. Competitive Analysis

### 12.1 Competitive Landscape

```
                    Simple ◄─────────────────────► Complex
                         │                          │
        ┌────────────────┼──────────────────────────┤
        │                │                          │
        │   Prompt       │          PromptDial      │
    Low │   Libraries    │          (HERE)          │ High
 Value  │                │                          │ Value
        │   ─────────────┼────────────────────────  │
        │                │                          │
        │   ChatGPT      │         Custom           │
        │   Prompt Tips  │         Solutions        │
        │                │                          │
        └────────────────┴──────────────────────────┘
```

### 12.2 Competitor Comparison

| Feature | PromptDial | PromptPerfect | AIPRM | Jasper |
|---------|------------|---------------|-------|--------|
| Prompt optimization | ✅ | ✅ | ❌ | ❌ |
| Dual output (prompt + answer) | ✅ | ❌ | ❌ | ❌ |
| Context enrichment | ✅ | ❌ | ❌ | ❌ |
| Controllable dials | ✅ | ❌ | ❌ | ❌ |
| Reusable artifacts | ✅ | ❌ | ❌ | ❌ |
| Multi-provider | ✅ | ❌ | ✅ | ✅ |
| Free tier | ✅ | ✅ | ✅ | ❌ |
| Prompt history | ✅ | ❌ | ❌ | ✅ |

### 12.3 Competitive Advantages

1. **Dual Output:** Only platform returning both optimized prompt AND executed answer
2. **Deep Dial:** Unique context-aware enrichment via web scraping
3. **Academic Rigor:** Kernel designed for structured, evidence-based optimization
4. **Artifacts:** Reusable context profiles for consistent prompting
5. **Control:** 12+ dials for fine-grained optimization control

### 12.4 Competitive Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| ChatGPT adds native optimization | Medium | High | Deeper specialization, enterprise features |
| New entrants copy approach | High | Medium | Speed to market, brand building |
| AI models improve enough to not need | Low | High | Focus on context enrichment, workflows |

---

## 13. Roadmap

### 13.1 Phase 1: Foundation (Current)

**Status:** In Progress

| Feature | Status | Priority |
|---------|--------|----------|
| Standard Dial | ✅ Complete | P0 |
| Deep Dial | ✅ Complete | P0 |
| Artifacts | ✅ Complete | P1 |
| History | ✅ Complete | P1 |
| Auth (Better Auth) | ✅ Complete | P0 |
| Billing (Autumn) | ✅ Complete | P0 |
| Landing Page | ✅ Complete | P0 |

### 13.2 Phase 2: Growth

**Focus:** User acquisition & engagement

| Feature | Description | Priority |
|---------|-------------|----------|
| Prompt Templates | Pre-built prompts for common tasks | P1 |
| Sharing | Share optimized prompts publicly | P1 |
| Browser Extension | Chrome extension for quick dial | P2 |
| API Access | Developer API for integrations | P2 |
| Enhanced Analytics | User dashboard with insights | P2 |

### 13.3 Phase 3: Scale

**Focus:** Enterprise & monetization

| Feature | Description | Priority |
|---------|-------------|----------|
| Team Workspaces | Shared artifacts, team billing | P1 |
| SSO Integration | Enterprise auth (SAML, OIDC) | P1 |
| Custom Models | Bring-your-own-model support | P2 |
| Workflow Automation | Multi-step prompt chains | P2 |
| White-label | Enterprise customization | P3 |

### 13.4 Technical Debt & Improvements

| Item | Description | Priority |
|------|-------------|----------|
| Streaming responses | Real-time token streaming | P2 |
| Response caching | Cache common optimizations | P2 |
| A/B testing infra | Feature flag system | P3 |
| Performance monitoring | APM integration | P2 |

---

## 14. Risks & Mitigations

### 14.1 Product Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low conversion to Pro | High | High | Improve free tier value, A/B test pricing |
| Feature complexity overwhelms users | Medium | Medium | Progressive disclosure, onboarding flow |
| Deep Dial scraping blocked | Medium | Medium | Fallback to user-provided context |
| AI API costs exceed revenue | Medium | High | Usage limits, cost monitoring, caching |

### 14.2 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Anthropic API outage | Low | High | Multi-provider fallback |
| Firecrawl rate limits | Medium | Medium | Caching, queuing system |
| Database scaling issues | Low | High | Connection pooling, read replicas |
| Response validation failures | Medium | Low | Robust 3-layer fallback system |

### 14.3 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Competitor replication | High | Medium | Speed, brand building, patents |
| AI model improvements reduce need | Low | High | Focus on context, workflows |
| Regulatory changes (AI) | Medium | Medium | Compliance monitoring |

---

## 15. Appendix

### 15.1 Glossary

| Term | Definition |
|------|------------|
| **Dial** | The act of optimizing a prompt through PromptDial |
| **Lazy Prompt** | User's initial, unoptimized prompt input |
| **Synthesized Prompt** | The optimized version of the lazy prompt |
| **Final Answer** | The AI response using the synthesized prompt |
| **Deep Dial** | Premium feature with context enrichment |
| **Artifact** | Reusable context profile (@mention) |
| **Kernel** | Core meta-prompting system prompt |
| **Dials** | Controllable optimization parameters |

### 15.2 API Reference Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/dial` | POST | Optional | Standard prompt optimization |
| `/api/dial/deep` | POST | Required | Context-enriched optimization |
| `/api/dial/history` | GET | Required | Fetch dial history |
| `/api/dial/history/[id]` | GET | Required | Get specific dial |
| `/api/artifacts` | GET/POST | Required | List/create artifacts |
| `/api/artifacts/[id]` | PATCH/DELETE | Required | Update/delete artifact |
| `/api/artifacts/resolve` | POST | Required | Resolve @mentions |
| `/api/credits` | GET | Required | Check credit balance |
| `/api/user/profile` | GET/POST/PATCH | Required | User profile |
| `/api/user/settings` | GET/PATCH | Required | User preferences |

### 15.3 Database Schema Summary

```sql
-- Core Tables
dial_results (id, userId, title, originalPrompt, synthesizedPrompt,
              finalAnswer, model, isDeepDial, contextUrl, creditsUsed,
              createdAt, updatedAt)

artifacts (id, userId, handle, displayName, content, createdAt, updatedAt)

user_profile (id, userId, displayName, avatarUrl, bio, phone, createdAt)

user_settings (id, userId, theme, emailNotifications, marketingEmails,
               defaultModel)

-- Better Auth (auto-managed)
user, session, account, verification
```

### 15.4 Environment Variables

```bash
# Required
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=<secret>
BETTER_AUTH_URL=<app-url>
NEXT_PUBLIC_APP_URL=<public-url>
AUTUMN_SECRET_KEY=<autumn-key>
ANTHROPIC_API_KEY=sk-ant-...

# Optional (enable additional providers)
OPENAI_API_KEY=sk-...
GOOGLE_GENERATIVE_AI_API_KEY=...
FIRECRAWL_API_KEY=<key>  # Required for Deep Dial
RESEND_API_KEY=<key>
EMAIL_FROM=noreply@...
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-29 | Claude | Initial PRD |

---

*This PRD is a living document and will be updated as the product evolves.*
