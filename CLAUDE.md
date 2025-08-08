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

This is a Next.js 15 SaaS application with the following core architecture:

### Tech Stack
- **Frontend**: Next.js 15 with React 19, TypeScript, Tailwind CSS v4
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth with email/password
- **Payments**: Autumn.js (Stripe integration)
- **AI Providers**: OpenAI, Anthropic, Google Gemini, Perplexity
- **Web Scraping**: Firecrawl
- **Email**: Resend

### Key Directory Structure
```
promptdial/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Better Auth endpoints
│   │   ├── autumn/        # Billing webhooks (auto-handled by Autumn)
│   │   ├── chat/          # AI chat API
│   │   └── brand-monitor/ # Brand analysis API
│   ├── (pages)/           # App pages (auth, dashboard, chat, etc.)
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   ├── autumn/            # Billing components
│   └── brand-monitor/     # Brand analysis UI
├── lib/                   # Core utilities
│   ├── db/                # Database schema and client
│   ├── providers/         # AI provider configs
│   └── auth.ts            # Better Auth config
├── config/                # Application constants
└── hooks/                 # React hooks
```

### Core Features
1. **AI Chat System**: Multi-provider AI chat with conversation history
2. **Brand Monitor**: Web scraping and AI analysis of brand mentions
3. **Authentication**: Email/password auth with Better Auth
4. **Billing**: Autumn.js integration with usage-based pricing
5. **Credit System**: Usage tracking for messages and brand analyses

### Database Schema
- Uses Drizzle ORM with PostgreSQL
- Key tables: `user_profile`, `conversations`, `messages`, `message_feedback`
- Brand monitoring tables: `brand_analyses` and related analysis data
- Better Auth handles user authentication tables

### AI Provider System
- Centralized provider configuration in `lib/provider-config.ts`
- Supports multiple AI providers (OpenAI, Anthropic, Google, Perplexity)
- Provider availability determined by API keys and enabled status
- Models configurable per provider with capabilities mapping

### Credit/Billing System
- Uses Autumn.js for subscription management
- Credit-based usage: 1 credit per chat message, 10 credits per brand analysis
- Feature ID for messages: `messages`
- Products: Free (100 messages), Pro (unlimited)

### Important Configuration Files
- `better-auth.config.ts` - Authentication configuration
- `drizzle.config.ts` - Database configuration
- `config/constants.ts` - Application constants
- `lib/provider-config.ts` - AI provider configurations

### Environment Setup
Key environment variables required:
- `DATABASE_URL` - PostgreSQL connection
- `BETTER_AUTH_SECRET` - Auth secret
- `AUTUMN_SECRET_KEY` - Billing integration
- AI provider keys: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.
- `FIRECRAWL_API_KEY` - Web scraping
- `RESEND_API_KEY` - Email service

### Development Notes
- Uses TypeScript with strict settings
- ESLint and build errors are ignored in production builds (see next.config.ts)
- Database migrations handled through Drizzle
- Better Auth requires initial schema generation for new setups
- Autumn billing system handles Stripe webhooks automatically