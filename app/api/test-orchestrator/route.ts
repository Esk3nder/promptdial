import { NextRequest, NextResponse } from 'next/server';
import { OrchestrationResponse, OrchestrationState, OrchestrationEvent } from '@/lib/orchestrator/types';

// Mock orchestrator for testing without database/OpenAI dependencies
async function mockOrchestrate(userGoal: string, model: string): Promise<OrchestrationResponse> {
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Create mock events
  const events: OrchestrationEvent[] = [
    {
      id: '1',
      runId: 'test-run-' + Date.now(),
      type: 'orchestration_started',
      data: { goal: userGoal, model },
      timestamp: new Date()
    },
    {
      id: '2',
      runId: 'test-run-' + Date.now(),
      type: 'plan_generated',
      data: { steps: 2 },
      timestamp: new Date()
    },
    {
      id: '3',
      runId: 'test-run-' + Date.now(),
      type: 'step_executed',
      data: { step: 1, description: 'Processing request' },
      timestamp: new Date()
    },
    {
      id: '4',
      runId: 'test-run-' + Date.now(),
      type: 'orchestration_completed',
      data: { success: true },
      timestamp: new Date()
    }
  ];

  // Create mock state
  const state: OrchestrationState = {
    runId: 'test-run-' + Date.now(),
    userGoal: userGoal,
    plan: [
      {
        id: 'step-1',
        description: 'Analyze the request',
        toolCall: {
          tool: 'analyzer',
          params: { query: userGoal }
        }
      },
      {
        id: 'step-2',
        description: 'Generate response using ' + model,
        toolCall: {
          tool: 'generator',
          params: { model: model }
        }
      }
    ],
    cursor: 2, // All steps completed
    history: [],
    resources: {}
  };

  // Generate a mock response based on the prompt
  let finalAnswer = '';
  if (userGoal.toLowerCase().includes('joke')) {
    finalAnswer = "Why don't scientists trust atoms? Because they make up everything!";
  } else if (userGoal.toLowerCase().includes('hello')) {
    finalAnswer = `Hello! I'm a mock orchestrator using ${model}. Your goal was: "${userGoal}"`;
  } else {
    finalAnswer = `Mock response from ${model}: I received your request "${userGoal}". In a real implementation, this would process through the full orchestration pipeline with planning, execution, and safety checks.`;
  }

  return {
    ok: true,
    next_action: 'done',
    final_answer: finalAnswer,
    state: state,
    events: events
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userGoal, config } = body;

    if (!userGoal) {
      return NextResponse.json(
        { error: 'userGoal is required' },
        { status: 400 }
      );
    }

    const model = config?.model || 'claude-3-haiku-20240307';

    // Use mock orchestrator for testing
    const response = await mockOrchestrate(userGoal, model);

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Test orchestration error:', error);
    return NextResponse.json(
      { 
        error: 'Orchestration failed',
        message: error.message 
      },
      { status: 500 }
    );
  }
}