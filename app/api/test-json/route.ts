import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

// Minimal test prompt for JSON output
const minimalTestPrompt = `You MUST respond with ONLY valid JSON, no other text.

For any user input, respond with this exact JSON structure:
{
  "ok": true,
  "test": "success",
  "received": "<what the user asked>",
  "response": "<your answer>"
}

Example:
User: "tell me a joke"
You: {"ok": true, "test": "success", "received": "tell me a joke", "response": "Why don't scientists trust atoms? Because they make up everything!"}

IMPORTANT: Output ONLY the JSON object. No markdown, no explanation, just the raw JSON.`;

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    console.log('\n=== MINIMAL JSON TEST ===');
    console.log('Testing with prompt:', prompt);

    const { text } = await generateText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      system: minimalTestPrompt,
      prompt: prompt,
      maxTokens: 500,
      temperature: 0.3,
    });

    console.log('Raw response:', text);

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(text);
      console.log('✅ Successfully parsed as JSON:', parsed);
      return NextResponse.json({
        success: true,
        parsed,
        raw: text
      });
    } catch (e) {
      console.error('❌ Failed to parse as JSON');
      return NextResponse.json({
        success: false,
        error: 'Not valid JSON',
        raw: text
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}