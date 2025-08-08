import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { kernelPrompt } from '@/lib/orchestrator/prompts/kernel';
import { policyEngine } from '@/lib/orchestrator/policy-engine';
import { ResponseValidator } from '@/lib/orchestrator/response-validator';
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    // Authentication is optional for testing
    const session = await auth.api.getSession({
      headers: await headers(),
    }).catch(() => null);

    // For testing purposes, allow unauthenticated requests
    const userId = session?.user?.id || 'test-user';

    const body = await req.json();
    const { userGoal, state = {} } = body;

    if (!userGoal) {
      return NextResponse.json(
        { error: 'userGoal is required' },
        { status: 400 }
      );
    }

    // Check policy violations
    const policyCheck = await policyEngine.checkContent(userGoal, userId);
    if (!policyCheck.allowed) {
      return NextResponse.json({
        ok: false,
        dials: {
          preset: 'scholar',
          depth: 4,
          breadth: 3,
          verbosity: 3,
          creativity: 2,
          risk_tolerance: 1,
          evidence_strictness: 4,
          browse_aggressiveness: 3,
          clarifying_threshold: 0.95,
          reasoning_exposure: 'brief',
          self_consistency_n: 3,
          token_budget: 1800,
          output_format: 'json'
        },
        state: {
          userGoal,
          certainty: 1.0,
          plan: [],
          cursor: 0,
          completedSteps: [],
          context: {}
        },
        prompt_blueprint: {
          purpose: 'Policy violation detected',
          instructions: [],
          reference: [],
          output: {}
        },
        events: [{
          type: 'policy_violation',
          data: { reason: policyCheck.reason },
          timestamp: new Date().toISOString(),
          sequence: 0
        }],
        next_action: 'safe_refuse',
        final_answer: undefined,
        public_rationale: 'Request violates safety policies',
        assumptions: [],
        limitations: [],
        confidence: 1.0,
        refusal_reason: policyCheck.reason,
        clarification_needed: undefined,
        schema_version: '1.0'
      });
    }

    // Generate plan using only the kernel prompt (which includes all necessary instructions)
    const systemPrompt = kernelPrompt;
    
    console.log('\n=== ORCHESTRATOR DEBUG ===');
    console.log('User Goal:', userGoal);
    console.log('System Prompt Length:', systemPrompt.length, 'chars');
    console.log('System Prompt Preview:', systemPrompt.substring(0, 200) + '...');
    
    const userPrompt = JSON.stringify({
      user_goal: userGoal,
      state
    });
    console.log('User Prompt:', userPrompt);
    
    const { text, usage } = await generateText({
      model: anthropic('claude-3-5-sonnet-20241022'),
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
      model: 'claude-3-5-sonnet-20241022',
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