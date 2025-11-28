# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Setup and initialization
npm run setup              # One-command setup (installs deps, sets up DB, etc.)
npm run setup:autumn       # Configure Autumn billing system
npm run setup:stripe-portal # Set up Stripe portal integration

# Development
npm run dev                # Start development server (uses Turbopack)
npm run build              # Build for production
npm run start              # Start production server
npm run lint               # Run ESLint

# Database operations
npm run db:generate        # Generate Drizzle migrations
npm run db:migrate         # Run database migrations
npm run db:push            # Push schema changes to database
npm run db:studio          # Open Drizzle Studio GUI
npm run db:drop            # Drop database tables

# Authentication setup (if needed)
npx @better-auth/cli generate --config better-auth.config.ts
```

## Architecture Overview

PromptDial is a meta-prompting SaaS platform that transforms "lazy" prompts into academically rigorous, optimized versions for AI.

### Tech Stack
- **Frontend**: Next.js 15 with React 19, TypeScript, Tailwind CSS v4
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth with email/password
- **Payments**: Autumn.js (Stripe integration)
- **AI Providers**: OpenAI, Anthropic, Google Gemini
- **Web Scraping**: Firecrawl (for Deep Dial feature)
- **Email**: Resend

### Key Directory Structure
```
promptdial/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Better Auth endpoints
│   │   ├── autumn/        # Billing webhooks
│   │   ├── dial/          # Prompt optimization API
│   │   │   ├── route.ts   # Standard dial endpoint
│   │   │   └── deep/      # Deep Dial (premium) endpoint
│   │   ├── history/       # Conversation history API
│   │   ├── credits/       # Credit management
│   │   └── user/          # User profile
│   ├── dial/              # Main product page
│   ├── history/           # My Prompts history page
│   ├── dashboard/         # User dashboard
│   └── (auth)/            # Auth pages (login, register, etc.)
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   ├── dial/              # Dial interface components
│   ├── autumn/            # Billing components
│   └── navbar.tsx         # Navigation
├── lib/                   # Core utilities
│   ├── db/                # Database schema and client
│   ├── dial/              # Dial system (kernel, types, validator)
│   ├── research/          # Research module (scraping, enrichment)
│   ├── provider-config.ts # AI provider configurations
│   └── auth.ts            # Better Auth config
├── config/                # Application constants
├── hooks/                 # React hooks
└── _archive/              # Archived features (Brand Monitor)
```

### Core Features

1. **Dial (Prompt Optimization)**
   - Transform lazy prompts into optimized AI prompts
   - Uses kernel.ts for meta-prompting logic
   - Returns both optimized prompt and executed response
   - Cost: 1 credit per optimization

2. **Deep Dial (Premium Feature)**
   - Enriches prompts with real-world company data
   - Scrapes website via Firecrawl for context
   - Injects company info, products, competitors into prompts
   - Cost: 5 credits per optimization

3. **My Prompts (History)**
   - View past prompt optimizations
   - Conversation history stored in database

4. **Authentication**
   - Email/password auth with Better Auth
   - Session-based authentication

5. **Billing**
   - Autumn.js integration with Stripe
   - Credit-based usage model
   - Free tier: 100 credits, Pro: unlimited

### Key Files

**Dial System:**
- `lib/dial/kernel.ts` - Core meta-prompting system prompt
- `lib/dial/types.ts` - TypeScript types for dial responses
- `lib/dial/response-validator.ts` - Response validation and auto-fix
- `app/api/dial/route.ts` - Standard dial API endpoint
- `app/api/dial/deep/route.ts` - Deep Dial API endpoint

**Research Module (for Deep Dial):**
- `lib/research/scrape.ts` - Firecrawl website scraping
- `lib/research/enricher.ts` - Prompt enrichment with context
- `lib/research/types.ts` - Company and research types

**UI Components:**
- `components/dial/dial-interface.tsx` - Main dial UI with Deep Dial toggle

### AI Provider System
- Centralized configuration in `lib/provider-config.ts`
- Supports: OpenAI, Anthropic, Google Gemini
- Provider availability determined by API keys and enabled status
- Models configurable per provider with capabilities mapping

### Database Schema
- Uses Drizzle ORM with PostgreSQL
- Key tables: `user_profile`, `conversations`, `messages`
- Better Auth handles user authentication tables

### Credit/Billing System
- Uses Autumn.js for subscription management
- Credit costs:
  - Standard Dial: 1 credit
  - Deep Dial: 5 credits
- Products: Free (100 credits), Pro (unlimited)

### Environment Setup
Required environment variables:
```
DATABASE_URL=             # PostgreSQL connection
BETTER_AUTH_SECRET=       # Auth secret
AUTUMN_SECRET_KEY=        # Billing integration
OPENAI_API_KEY=           # OpenAI API
ANTHROPIC_API_KEY=        # Anthropic API
GOOGLE_GENERATIVE_AI_API_KEY=  # Google AI
FIRECRAWL_API_KEY=        # Web scraping (for Deep Dial)
RESEND_API_KEY=           # Email service
```

### Development Notes
- TypeScript strict mode enabled
- ESLint and build errors ignored in production (next.config.ts)
- Database migrations via Drizzle
- Better Auth requires initial schema generation
- Autumn handles Stripe webhooks automatically
- `_archive/` contains deprecated Brand Monitor feature
