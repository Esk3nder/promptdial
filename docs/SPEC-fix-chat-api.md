# Specification: Fix Chat API to Use Real LLM Responses

**Author:** Claude Code Diagnostic
**Date:** 2024-11-28
**Status:** Ready for Implementation

---

## 1. Executive Summary

The chat API (`/api/chat/route.ts`) currently returns **hardcoded mock responses** instead of actual LLM-generated content. This spec defines the changes required to integrate real LLM providers (OpenAI, Anthropic) using the existing provider infrastructure.

---

## 2. Problem Statement

### Current Behavior (Broken)
```typescript
// app/api/chat/route.ts:139-148
const responses = [
  "I understand you're asking about " + message.substring(0, 20) + "...",
  "That's an interesting question!...",
  // ... more canned strings
];
const randomResponse = responses[Math.floor(Math.random() * responses.length)];
```

**Impact:**
- Users pay credits for fake responses
- Chat feature is non-functional
- Damages product credibility

### Desired Behavior
- Use configured AI providers (OpenAI/Anthropic) to generate responses
- Support conversation history for context
- Stream responses for better UX
- Handle provider fallbacks gracefully

---

## 3. Objectives

| ID | Objective | Acceptance Criteria |
|----|-----------|---------------------|
| O1 | Real LLM integration | Chat returns actual AI-generated responses |
| O2 | Conversation context | Messages include prior conversation history |
| O3 | Provider flexibility | Uses centralized provider config |
| O4 | Error handling | Graceful degradation on provider failures |
| O5 | Streaming support | Optional streaming for real-time responses |

---

## 4. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Latency** | First token < 2s, full response < 30s |
| **Reliability** | Automatic fallback if primary provider fails |
| **Cost** | Track token usage for billing visibility |
| **Security** | No PII logging, API keys server-side only |

---

## 5. Technical Design

### 5.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     POST /api/chat                          │
├─────────────────────────────────────────────────────────────┤
│  1. Auth check (existing)                                   │
│  2. Credit check via Autumn (existing)                      │
│  3. Load conversation history from DB (NEW)                 │
│  4. Call LLM provider via provider-config.ts (NEW)          │
│  5. Save messages to DB (existing)                          │
│  6. Return response (modify to use LLM response)            │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Dependencies (Already Exist)

| Component | Location | Status |
|-----------|----------|--------|
| Provider Config | `lib/provider-config.ts` | ✅ Ready |
| AI SDK | `@ai-sdk/openai`, `@ai-sdk/anthropic` | ✅ Installed |
| DB Schema | `lib/db/schema.ts` | ✅ Has messages table |
| Auth | `lib/auth.ts` | ✅ Working |
| Credits | Autumn integration | ✅ Working |

### 5.3 Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `app/api/chat/route.ts` | **MODIFY** | Replace mock with real LLM call |
| `lib/chat-utils.ts` | **CREATE** | Helper functions for chat |
| `config/constants.ts` | **MODIFY** | Add chat-specific constants |

---

## 6. Functional Requirements

### 6.1 Request Format (No Change)

```typescript
// POST /api/chat
interface ChatRequest {
  message: string;           // User's message
  conversationId?: string;   // Optional, for continuing conversation
}
```

### 6.2 Response Format (No Change to Shape)

```typescript
interface ChatResponse {
  response: string;          // AI-generated response (was mock, now real)
  remainingCredits: number;
  creditsUsed: number;
  conversationId: string;
  messageId: string;
}
```

### 6.3 New: Conversation Context

When `conversationId` is provided:
1. Fetch last N messages from conversation
2. Format as chat history for LLM
3. Include in prompt context

**Context Window Strategy:**
- Default: Last 10 messages (5 user + 5 assistant)
- Max tokens: 4000 for context (leaving room for response)
- Truncate oldest messages if over limit

### 6.4 Provider Selection

Use existing `lib/provider-config.ts`:

```typescript
// Priority order for chat:
1. anthropic (claude-4-sonnet-20250514) - if configured
2. openai (gpt-4o) - fallback
3. Error if neither available
```

### 6.5 System Prompt

```typescript
const CHAT_SYSTEM_PROMPT = `You are a helpful AI assistant for PromptDial.
Be concise but thorough. If you don't know something, say so.
Format responses with markdown when helpful.`;
```

---

## 7. Implementation Plan

### Phase 1: Core Integration (MUST CHANGE)

**File: `app/api/chat/route.ts`**

Replace lines 139-148:

```typescript
// BEFORE (mock):
const responses = [...];
const randomResponse = responses[Math.floor(Math.random() * responses.length)];

// AFTER (real):
import { generateText } from 'ai';
import { getProviderModel, getConfiguredProviders } from '@/lib/provider-config';

// Get conversation history for context
const conversationHistory = await getConversationHistory(
  currentConversation.id,
  sessionResponse.user.id,
  { maxMessages: 10 }
);

// Build messages array for LLM
const messages = formatMessagesForLLM(conversationHistory, message);

// Get provider (prefer Anthropic, fallback to OpenAI)
const model = getProviderModel('anthropic') || getProviderModel('openai');
if (!model) {
  throw new ExternalServiceError('No AI provider configured', 'llm');
}

// Generate response
const { text: aiResponse, usage } = await generateText({
  model,
  system: CHAT_SYSTEM_PROMPT,
  messages,
  maxTokens: 1024,
  temperature: 0.7,
});
```

### Phase 2: Helper Functions (NEW FILE)

**File: `lib/chat-utils.ts`**

```typescript
import { db } from '@/lib/db';
import { messages } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export const CHAT_SYSTEM_PROMPT = `You are a helpful AI assistant for PromptDial.
Be concise but thorough. If you don't know something, say so.
Format responses with markdown when helpful.`;

export const CHAT_CONFIG = {
  maxContextMessages: 10,
  maxContextTokens: 4000,
  defaultMaxTokens: 1024,
  defaultTemperature: 0.7,
} as const;

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Fetch conversation history for context
 */
export async function getConversationHistory(
  conversationId: string,
  userId: string,
  options: { maxMessages?: number } = {}
): Promise<ConversationMessage[]> {
  const { maxMessages = CHAT_CONFIG.maxContextMessages } = options;

  const history = await db
    .select({
      role: messages.role,
      content: messages.content,
    })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        eq(messages.userId, userId)
      )
    )
    .orderBy(desc(messages.createdAt))
    .limit(maxMessages);

  // Reverse to get chronological order
  return history.reverse() as ConversationMessage[];
}

/**
 * Format conversation history + new message for LLM
 */
export function formatMessagesForLLM(
  history: ConversationMessage[],
  newMessage: string
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const formatted = history.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  // Add new user message
  formatted.push({
    role: 'user',
    content: newMessage,
  });

  return formatted;
}

/**
 * Estimate token count (rough approximation)
 */
export function estimateTokens(text: string): number {
  // ~4 chars per token is a reasonable approximation
  return Math.ceil(text.length / 4);
}

/**
 * Truncate history to fit within token budget
 */
export function truncateHistory(
  history: ConversationMessage[],
  maxTokens: number
): ConversationMessage[] {
  let totalTokens = 0;
  const result: ConversationMessage[] = [];

  // Start from most recent and work backwards
  for (let i = history.length - 1; i >= 0; i--) {
    const tokens = estimateTokens(history[i].content);
    if (totalTokens + tokens > maxTokens) break;
    totalTokens += tokens;
    result.unshift(history[i]);
  }

  return result;
}
```

### Phase 3: Constants Update

**File: `config/constants.ts`** (add to existing)

```typescript
// ============================================
// Chat Configuration
// ============================================
export const CHAT_MAX_CONTEXT_MESSAGES = 10;
export const CHAT_MAX_CONTEXT_TOKENS = 4000;
export const CHAT_DEFAULT_MAX_TOKENS = 1024;
export const CHAT_DEFAULT_TEMPERATURE = 0.7;
```

---

## 8. Error Handling

| Error Case | Handling |
|------------|----------|
| No providers configured | Return 503 with "AI service unavailable" |
| Provider API error | Try fallback provider, then return 500 |
| Rate limited | Return 429 with retry-after header |
| Context too long | Truncate oldest messages |
| Empty response | Retry once, then return generic error |

---

## 9. Testing Plan

### Manual Tests

1. **Basic chat**: Send message, verify real AI response
2. **Conversation context**: Multi-turn conversation, verify context awareness
3. **No credits**: Verify existing credit check still works
4. **Provider fallback**: Disable primary provider, verify fallback works

### Verification Commands

```bash
# Test with curl
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_cookie>" \
  -d '{"message": "What is 2+2?"}'

# Expected: Real AI response, not canned text
```

---

## 10. Rollback Plan

If issues arise:
1. Revert `app/api/chat/route.ts` to previous version
2. Delete `lib/chat-utils.ts`
3. Revert `config/constants.ts` changes

Git commands:
```bash
git checkout HEAD~1 -- app/api/chat/route.ts
git checkout HEAD~1 -- config/constants.ts
rm lib/chat-utils.ts
```

---

## 11. Open Questions

| Question | Proposed Answer |
|----------|-----------------|
| Should we support streaming? | Phase 2 - add later for better UX |
| Token tracking for billing? | Store in `messages.tokenCount` (field exists) |
| Model selection by user? | Phase 2 - use default for now |

---

## 12. Checklist

- [ ] Create `lib/chat-utils.ts`
- [ ] Modify `app/api/chat/route.ts` to use real LLM
- [ ] Add constants to `config/constants.ts`
- [ ] Test basic chat functionality
- [ ] Test conversation context
- [ ] Test error handling
- [ ] Verify credits still work
- [ ] Update any related documentation

---

## Appendix A: Full Modified chat/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { Autumn } from 'autumn-js';
import { db } from '@/lib/db';
import { conversations, messages } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateText } from 'ai';
import { getProviderModel } from '@/lib/provider-config';
import {
  getConversationHistory,
  formatMessagesForLLM,
  CHAT_SYSTEM_PROMPT,
  CHAT_CONFIG
} from '@/lib/chat-utils';
import {
  AuthenticationError,
  InsufficientCreditsError,
  ValidationError,
  DatabaseError,
  ExternalServiceError,
  handleApiError
} from '@/lib/api-errors';
import {
  FEATURE_ID_MESSAGES,
  CREDITS_PER_MESSAGE,
  ERROR_MESSAGES,
  ROLE_USER,
  ROLE_ASSISTANT,
  UI_LIMITS
} from '@/config/constants';

const autumn = new Autumn({
  secretKey: process.env.AUTUMN_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    // Get the session
    const sessionResponse = await auth.api.getSession({
      headers: request.headers,
    });

    if (!sessionResponse?.user) {
      throw new AuthenticationError('Please log in to use the chat');
    }

    const { message, conversationId } = await request.json();

    if (!message || typeof message !== 'string') {
      throw new ValidationError('Invalid message format', {
        message: 'Message must be a non-empty string'
      });
    }

    // Check credits (existing logic)
    const access = await autumn.check({
      customer_id: sessionResponse.user.id,
      feature_id: FEATURE_ID_MESSAGES,
    });

    if (!access.data?.allowed) {
      throw new InsufficientCreditsError(
        ERROR_MESSAGES.NO_CREDITS_REMAINING,
        CREDITS_PER_MESSAGE,
        access.data?.balance || 0
      );
    }

    // Track usage (existing logic)
    await autumn.track({
      customer_id: sessionResponse.user.id,
      feature_id: FEATURE_ID_MESSAGES,
      count: CREDITS_PER_MESSAGE,
    });

    // Get or create conversation (existing logic)
    let currentConversation;

    if (conversationId) {
      const existingConversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, sessionResponse.user.id)
        ),
      });

      if (existingConversation) {
        currentConversation = existingConversation;
        await db
          .update(conversations)
          .set({ lastMessageAt: new Date() })
          .where(eq(conversations.id, conversationId));
      }
    }

    if (!currentConversation) {
      const [newConversation] = await db
        .insert(conversations)
        .values({
          userId: sessionResponse.user.id,
          title: message.substring(0, UI_LIMITS.TITLE_MAX_LENGTH) +
                 (message.length > UI_LIMITS.TITLE_MAX_LENGTH ? '...' : ''),
          lastMessageAt: new Date(),
        })
        .returning();

      currentConversation = newConversation;
    }

    // Store user message
    const [userMessage] = await db
      .insert(messages)
      .values({
        conversationId: currentConversation.id,
        userId: sessionResponse.user.id,
        role: ROLE_USER,
        content: message,
      })
      .returning();

    // ============================================
    // NEW: Generate real AI response
    // ============================================

    // Get conversation history for context
    const conversationHistory = await getConversationHistory(
      currentConversation.id,
      sessionResponse.user.id,
      { maxMessages: CHAT_CONFIG.maxContextMessages }
    );

    // Format messages for LLM (excluding current message which is already in history)
    const llmMessages = formatMessagesForLLM(
      conversationHistory.slice(0, -1), // Exclude the just-inserted user message
      message
    );

    // Get provider (prefer Anthropic, fallback to OpenAI)
    const model = getProviderModel('anthropic') || getProviderModel('openai');
    if (!model) {
      throw new ExternalServiceError('No AI provider configured', 'llm');
    }

    // Generate response
    const { text: aiResponse, usage } = await generateText({
      model,
      system: CHAT_SYSTEM_PROMPT,
      messages: llmMessages,
      maxTokens: CHAT_CONFIG.defaultMaxTokens,
      temperature: CHAT_CONFIG.defaultTemperature,
    });

    // Store AI response with token count
    const [aiMessage] = await db
      .insert(messages)
      .values({
        conversationId: currentConversation.id,
        userId: sessionResponse.user.id,
        role: ROLE_ASSISTANT,
        content: aiResponse,
        tokenCount: usage?.totalTokens || null,
      })
      .returning();

    // Get remaining credits
    let remainingCredits = 0;
    try {
      const usageCheck = await autumn.check({
        customer_id: sessionResponse.user.id,
        feature_id: FEATURE_ID_MESSAGES,
      });
      remainingCredits = usageCheck.data?.balance || 0;
    } catch (err) {
      console.error('Failed to get remaining credits:', err);
    }

    return NextResponse.json({
      response: aiResponse,
      remainingCredits,
      creditsUsed: CREDITS_PER_MESSAGE,
      conversationId: currentConversation.id,
      messageId: aiMessage.id,
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return handleApiError(error);
  }
}

// GET endpoint unchanged...
```
