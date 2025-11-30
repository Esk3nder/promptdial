import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';

// Prevent static generation - API routes should be dynamic
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, model, apiKey } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 }
      );
    }

    // Use provided model or default to Claude Sonnet 4
    const effectiveModel = model || 'claude-sonnet-4-20250514';

    // Use provided API key in dev mode, otherwise use env var
    const effectiveApiKey = process.env.NODE_ENV === 'development' && apiKey
      ? apiKey
      : process.env.ANTHROPIC_API_KEY;

    if (!effectiveApiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    const anthropic = createAnthropic({ apiKey: effectiveApiKey });

    const { text, usage } = await generateText({
      model: anthropic(effectiveModel),
      prompt: prompt,
      maxTokens: 4000,
      temperature: 0.7,
    });

    return NextResponse.json({
      ok: true,
      result: text,
      metadata: {
        tokensUsed: usage?.totalTokens,
        model: effectiveModel,
      }
    });

  } catch (error: any) {
    console.error('Execute error:', error);
    return NextResponse.json(
      {
        error: 'Prompt execution failed',
        message: error.message
      },
      { status: 500 }
    );
  }
}
