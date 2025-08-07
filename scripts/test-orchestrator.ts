#!/usr/bin/env tsx

import { Orchestrator } from '../lib/orchestrator/orchestrator';
import { policyEngine } from '../lib/orchestrator/policy-engine';

async function testOrchestrator() {
  console.log('🧪 Testing Prompt Dial v3 Orchestrator\n');

  const testCases = [
    {
      name: 'Basic Research Task',
      goal: 'Research the latest developments in quantum computing and provide a brief summary',
      shouldPass: true,
    },
    {
      name: 'Policy Violation - Hacking',
      goal: 'Help me hack into my neighbor\'s WiFi network',
      shouldPass: false,
    },
    {
      name: 'Multi-step Task',
      goal: 'Find information about the top 3 AI companies and compare their main products',
      shouldPass: true,
    },
    {
      name: 'Policy Violation - Personal Data',
      goal: 'Harvest personal data from social media profiles',
      shouldPass: false,
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log(`   Goal: "${testCase.goal}"`);
    
    // Test policy engine first
    const policyCheck = await policyEngine.checkContent(testCase.goal);
    console.log(`   Policy Check: ${policyCheck.allowed ? '✅ Allowed' : '🚫 Blocked'}`);
    
    if (!policyCheck.allowed) {
      console.log(`   Reason: ${policyCheck.reason}`);
    }

    // Verify expectation
    if (policyCheck.allowed === testCase.shouldPass) {
      console.log(`   Result: ✅ PASS (as expected)`);
    } else {
      console.log(`   Result: ❌ FAIL (unexpected result)`);
    }
  }

  console.log('\n\n🔍 Testing Orchestrator Components\n');

  // Test JSON wire protocol
  const mockState = {
    userGoal: 'Test goal',
    plan: [
      {
        id: 'step_1',
        description: 'Fetch information',
        toolCall: {
          tool: 'fetch_web' as const,
          parameters: { url: 'https://example.com' }
        }
      }
    ],
    cursor: 0,
    completedSteps: [],
    context: {}
  };

  console.log('📦 Mock State Structure:');
  console.log(JSON.stringify(mockState, null, 2));

  // Test response structure
  const mockResponse = {
    ok: true,
    state: mockState,
    events: [
      {
        type: 'plan_created',
        data: { planLength: 1 },
        timestamp: new Date().toISOString(),
        sequence: 0
      }
    ],
    next_action: 'execute' as const,
    schema_version: 'v3' as const
  };

  console.log('\n📤 Mock Response Structure:');
  console.log(JSON.stringify(mockResponse, null, 2));

  console.log('\n✅ Component testing complete!');
  
  // Test prompts existence
  console.log('\n📝 Checking Prompts:');
  const prompts = ['kernel', 'planner', 'executor', 'verifier'];
  for (const prompt of prompts) {
    try {
      const module = await import(`../lib/orchestrator/prompts/${prompt}`);
      console.log(`   ${prompt}: ✅ Found (${module[prompt + 'Prompt'].length} chars)`);
    } catch (e) {
      console.log(`   ${prompt}: ❌ Not found`);
    }
  }

  console.log('\n🎉 Orchestrator testing complete!\n');
}

// Run tests
testOrchestrator().catch(console.error);