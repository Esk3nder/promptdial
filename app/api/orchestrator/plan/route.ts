import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { kernelPrompt } from '@/lib/orchestrator/prompts/kernel';
import { plannerPrompt } from '@/lib/orchestrator/prompts/planner';
import { policyEngine } from '@/lib/orchestrator/policy-engine';
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { userGoal, state = {} } = body;

    if (!userGoal) {
      return NextResponse.json(
        { error: 'userGoal is required' },
        { status: 400 }
      );
    }

    // Check policy violations
    const policyCheck = await policyEngine.checkContent(userGoal, session.user.id);
    if (!policyCheck.allowed) {
      return NextResponse.json({
        ok: false,
        state: {
          userGoal,
          plan: [],
          cursor: 0,
          completedSteps: [],
          context: {}
        },
        events: [{
          type: 'policy_violation',
          data: { reason: policyCheck.reason },
          timestamp: new Date().toISOString(),
          sequence: 0
        }],
        next_action: 'safe_refuse',
        refusal_reason: policyCheck.reason,
        schema_version: 'v3'
      });
    }

    // Generate plan
    const systemPrompt = kernelPrompt + '\n\n' + plannerPrompt;
    
    const { text, usage } = await generateText({
      model: openai('gpt-4o'),
      system: systemPrompt,
      prompt: JSON.stringify({
        user_goal: userGoal,
        state
      }),
      maxTokens: 1800,
      temperature: 0.7,
    });

    const response = JSON.parse(text);
    
    // Add metadata
    response.metadata = {
      tokensUsed: usage?.totalTokens,
      model: 'gpt-4o',
      stage: 'planner'
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Planning error:', error);
    return NextResponse.json(
      { 
        error: 'Planning failed',
        message: error.message 
      },
      { status: 500 }
    );
  }
}