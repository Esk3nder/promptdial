import { db } from '@/lib/db';
import { messages } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

/**
 * Chat utility functions for LLM integration
 */

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
 * ~4 chars per token is a reasonable approximation for English text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate history to fit within token budget
 * Keeps most recent messages, drops oldest if over limit
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
