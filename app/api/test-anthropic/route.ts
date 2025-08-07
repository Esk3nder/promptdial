import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
  try {
    const { prompt, model } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    const message = await anthropic.messages.create({
      model: model || 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : 'No text response';

    return NextResponse.json({
      response: responseText,
      model: model || 'claude-3-haiku-20240307',
      usage: message.usage
    });

  } catch (error: any) {
    console.error('Anthropic API error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to call Anthropic API',
        details: error.response?.data || error.toString()
      },
      { status: 500 }
    );
  }
}