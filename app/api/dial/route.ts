import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { kernelPrompt } from '@/lib/dial/kernel';
import { ResponseValidator } from '@/lib/dial/response-validator';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { dialResults } from '@/lib/db/schema';

// Prevent static generation - API routes should be dynamic
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Authentication is optional for testing
    const session = await auth.api.getSession({
      headers: await headers(),
    }).catch(() => null);

    // For testing purposes, allow unauthenticated requests
    const userId = session?.user?.id || 'test-user';

    const body = await req.json();
    const { userGoal, state = {}, apiKey } = body;

    if (!userGoal) {
      return NextResponse.json(
        { error: 'userGoal is required' },
        { status: 400 }
      );
    }

    // Use provided API key in dev mode, otherwise use env var
    const effectiveApiKey = process.env.NODE_ENV === 'development' && apiKey
      ? apiKey
      : process.env.ANTHROPIC_API_KEY;

    if (!effectiveApiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured. In dev mode, paste your key in the input field.' },
        { status: 500 }
      );
    }

    // Policy checks disabled - relying on model provider safety
    // All safety constraints handled by the underlying models (Anthropic, OpenAI, etc.)

    // Generate plan using only the kernel prompt (which includes all necessary instructions)
    const systemPrompt = kernelPrompt;

    console.log('\n=== DIAL DEBUG ===');
    console.log('User Goal:', userGoal);
    console.log('System Prompt Length:', systemPrompt.length, 'chars');
    console.log('System Prompt Preview:', systemPrompt.substring(0, 200) + '...');

    const userPrompt = JSON.stringify({
      user_goal: userGoal,
      state
    });
    console.log('User Prompt:', userPrompt);

    // Create Anthropic client with the effective API key
    const anthropic = createAnthropic({ apiKey: effectiveApiKey });

    // Use claude-sonnet-4 (latest) - more reliable than dated versions
    const { text, usage } = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: 1800,
      temperature: 0.7,
    });
    
    console.log('\n=== LLM RESPONSE ===');
    console.log('Response Length:', text.length, 'chars');
    console.log('Response Preview:', text.substring(0, 500));
    console.log('Tokens Used:', usage?.totalTokens);

    let response;
    
    // First attempt: Direct JSON parse
    try {
      response = JSON.parse(text);
      console.log('\n=== DIRECT JSON PARSE SUCCESS ===');
    } catch (parseError) {
      console.log('\n=== DIRECT JSON PARSE FAILED ===');
      console.log('Attempting to extract JSON from text...');
      
      // Second attempt: Extract JSON from text
      response = ResponseValidator.extractJSON(text);
      
      if (!response) {
        console.error('Could not extract JSON. Using fallback response.');
        response = ResponseValidator.createFallbackResponse(userGoal, text);
      } else {
        console.log('Successfully extracted JSON from text');
      }
    }
    
    // Validate schema
    const validation = ResponseValidator.validateSchema(response);
    if (!validation.valid) {
      console.log('\n=== SCHEMA VALIDATION FAILED ===');
      console.log('Missing fields:', validation.missing);
      console.log('Attempting auto-fix...');
      response = ResponseValidator.attemptAutoFix(response, userGoal);
      
      // Re-validate after fix
      const revalidation = ResponseValidator.validateSchema(response);
      if (revalidation.valid) {
        console.log('Auto-fix successful');
      } else {
        console.log('Auto-fix incomplete, missing:', revalidation.missing);
      }
    } else {
      console.log('\n=== SCHEMA VALIDATION PASSED ===');
    }
    
    console.log('Final response structure:');
    console.log('  - ok:', response.ok);
    console.log('  - next_action:', response.next_action);
    console.log('  - confidence:', response.confidence);
    console.log('  - has final_answer:', !!response.final_answer);
    
    // Add metadata
    response.metadata = {
      tokensUsed: usage?.totalTokens,
      model: 'claude-sonnet-4-20250514',
      stage: 'dial'
    };

    // Save to history if user is authenticated and response is successful
    if (session?.user?.id && response.ok) {
      try {
        // Generate title from first 50 chars of original prompt
        const title = userGoal.length > 50
          ? userGoal.substring(0, 50) + '...'
          : userGoal;

        const [savedResult] = await db.insert(dialResults).values({
          userId: session.user.id,
          title,
          originalPrompt: userGoal,
          synthesizedPrompt: response.synthesized_prompt || null,
          finalAnswer: response.final_answer || null,
          model: 'claude-sonnet-4-20250514',
          isDeepDial: false,
          creditsUsed: 1,
        }).returning();

        // Add history ID to response
        response.historyId = savedResult.id;
        console.log('Saved dial result to history:', savedResult.id);
      } catch (saveError) {
        console.error('Failed to save dial result to history:', saveError);
        // Don't fail the request if save fails
      }
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Dial error:', error);
    return NextResponse.json(
      {
        error: 'Dial optimization failed',
        message: error.message 
      },
      { status: 500 }
    );
  }
}