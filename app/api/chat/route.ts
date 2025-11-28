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
      console.error('No session found in chat API');
      throw new AuthenticationError('Please log in to use the chat');
    }

    console.log('Chat API - User:', sessionResponse.user.id);

    const { message, conversationId } = await request.json();

    if (!message || typeof message !== 'string') {
      throw new ValidationError('Invalid message format', {
        message: 'Message must be a non-empty string'
      });
    }

    // Check if user has access to use the chat
    try {
      console.log('Checking access for:', {
        userId: sessionResponse.user.id,
        featureId: 'messages',
      });
      
      const access = await autumn.check({
        customer_id: sessionResponse.user.id,
        feature_id: FEATURE_ID_MESSAGES,
      });
      
      console.log('Access check result:', access);

      if (!access.data?.allowed) {
        console.log('Access denied - no credits remaining');
        throw new InsufficientCreditsError(
          ERROR_MESSAGES.NO_CREDITS_REMAINING,
          CREDITS_PER_MESSAGE,
          access.data?.balance || 0 
        );
      }
    } catch (err) {
      console.error('Failed to check access:', err);
      if (err instanceof InsufficientCreditsError) {
        throw err; // Re-throw our custom errors
      }
      throw new ExternalServiceError('Unable to verify credits. Please try again', 'autumn');
    }

    // Track API usage with Autumn
    try {
      await autumn.track({
        customer_id: sessionResponse.user.id,
        feature_id: FEATURE_ID_MESSAGES,
        count: CREDITS_PER_MESSAGE,
      });
    } catch (err) {
      console.error('Failed to track usage:', err);
      throw new ExternalServiceError('Unable to process credit usage. Please try again', 'autumn');
    }

    // Get or create conversation
    let currentConversation;
    
    if (conversationId) {
      // Find existing conversation
      const existingConversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, sessionResponse.user.id)
        ),
      });
      
      if (existingConversation) {
        currentConversation = existingConversation;
        // Update last message timestamp
        await db
          .update(conversations)
          .set({ lastMessageAt: new Date() })
          .where(eq(conversations.id, conversationId));
      }
    }
    
    if (!currentConversation) {
      // Create new conversation
      const [newConversation] = await db
        .insert(conversations)
        .values({
          userId: sessionResponse.user.id,
          title: message.substring(0, UI_LIMITS.TITLE_MAX_LENGTH) + (message.length > UI_LIMITS.TITLE_MAX_LENGTH ? '...' : ''),
          lastMessageAt: new Date(),
        })
        .returning();
      
      currentConversation = newConversation;
    }

    // Store user message
    await db
      .insert(messages)
      .values({
        conversationId: currentConversation.id,
        userId: sessionResponse.user.id,
        role: ROLE_USER,
        content: message,
      });

    // Get conversation history for context (excluding the just-inserted message)
    const conversationHistory = await getConversationHistory(
      currentConversation.id,
      sessionResponse.user.id,
      { maxMessages: CHAT_CONFIG.maxContextMessages }
    );

    // Format messages for LLM (exclude the just-inserted user message since we'll add it fresh)
    const historyWithoutCurrent = conversationHistory.filter(
      msg => !(msg.role === 'user' && msg.content === message)
    );
    const llmMessages = formatMessagesForLLM(historyWithoutCurrent, message);

    // Get provider (prefer Anthropic, fallback to OpenAI)
    const model = getProviderModel('anthropic') || getProviderModel('openai');
    if (!model) {
      throw new ExternalServiceError('No AI provider configured. Please check API keys.', 'llm');
    }

    console.log('Chat API - Generating response with LLM...');

    // Generate real AI response
    let aiResponse: string;
    let tokenCount: number | null = null;

    try {
      const result = await generateText({
        model,
        system: CHAT_SYSTEM_PROMPT,
        messages: llmMessages,
        maxTokens: CHAT_CONFIG.defaultMaxTokens,
        temperature: CHAT_CONFIG.defaultTemperature,
      });

      aiResponse = result.text;
      tokenCount = result.usage?.totalTokens || null;

      console.log('Chat API - LLM response generated:', {
        responseLength: aiResponse.length,
        tokensUsed: tokenCount,
      });
    } catch (llmError: any) {
      console.error('Chat API - LLM generation failed:', llmError);

      // Try fallback provider if primary fails
      const fallbackModel = getProviderModel('openai') || getProviderModel('anthropic');
      if (fallbackModel && fallbackModel !== model) {
        console.log('Chat API - Trying fallback provider...');
        try {
          const fallbackResult = await generateText({
            model: fallbackModel,
            system: CHAT_SYSTEM_PROMPT,
            messages: llmMessages,
            maxTokens: CHAT_CONFIG.defaultMaxTokens,
            temperature: CHAT_CONFIG.defaultTemperature,
          });
          aiResponse = fallbackResult.text;
          tokenCount = fallbackResult.usage?.totalTokens || null;
        } catch (fallbackError) {
          console.error('Chat API - Fallback provider also failed:', fallbackError);
          throw new ExternalServiceError('AI service temporarily unavailable. Please try again.', 'llm');
        }
      } else {
        throw new ExternalServiceError('AI service temporarily unavailable. Please try again.', 'llm');
      }
    }

    // Store AI response with token count
    const [aiMessage] = await db
      .insert(messages)
      .values({
        conversationId: currentConversation.id,
        userId: sessionResponse.user.id,
        role: ROLE_ASSISTANT,
        content: aiResponse,
        tokenCount: tokenCount,
      })
      .returning();

    // Get remaining credits from Autumn
    let remainingCredits = 0;
    try {
      const usage = await autumn.check({
        customer_id: sessionResponse.user.id,
        feature_id: FEATURE_ID_MESSAGES,
      });
      remainingCredits = usage.data?.balance || 0;
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

// GET endpoint to fetch conversation history
export async function GET(request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({
      headers: request.headers,
    });

    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (conversationId) {
      // Get specific conversation with messages
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, sessionResponse.user.id)
        ),
        with: {
          messages: {
            orderBy: [messages.createdAt],
          },
        },
      });

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      return NextResponse.json(conversation);
    } else {
      // Get all conversations for the user
      const userConversations = await db.query.conversations.findMany({
        where: eq(conversations.userId, sessionResponse.user.id),
        orderBy: [desc(conversations.lastMessageAt)],
        with: {
          messages: {
            limit: 1,
            orderBy: [desc(messages.createdAt)],
          },
        },
      });

      return NextResponse.json(userConversations);
    }
  } catch (error: any) {
    console.error('Chat GET error:', error);
    return handleApiError(error);
  }
}
