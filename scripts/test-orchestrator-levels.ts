#!/usr/bin/env tsx

/**
 * Test the orchestrator with different complexity levels
 */

const TEST_CASES = [
  {
    name: 'Simple Request',
    userGoal: 'tell me a joke',
    expectedComplexity: 'low',
    expectedSteps: 1
  },
  {
    name: 'Information Query',
    userGoal: 'What is the capital of France?',
    expectedComplexity: 'low',
    expectedSteps: 1
  },
  {
    name: 'Research Task',
    userGoal: 'Find the latest news about AI developments',
    expectedComplexity: 'medium',
    expectedSteps: 2-3
  },
  {
    name: 'Complex Analysis',
    userGoal: 'Compare the pros and cons of React vs Vue for a large enterprise application',
    expectedComplexity: 'high',
    expectedSteps: 4-6
  },
  {
    name: 'Multi-step Task',
    userGoal: 'Research competitor pricing for project management tools and create a comparison table',
    expectedComplexity: 'high',
    expectedSteps: 5-7
  },
  {
    name: 'Ambiguous Request',
    userGoal: 'Help me with my project',
    expectedComplexity: 'requires_clarification',
    expectedSteps: 0
  }
];

async function testOrchestrator(testCase: typeof TEST_CASES[0]) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${testCase.name}`);
  console.log(`Goal: "${testCase.userGoal}"`);
  console.log(`Expected Complexity: ${testCase.expectedComplexity}`);
  console.log(`${'='.repeat(60)}`);

  try {
    const response = await fetch('http://localhost:3000/api/orchestrator/plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userGoal: testCase.userGoal,
        state: {}
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Request failed:', data.error);
      return false;
    }

    // Analyze response
    console.log('\n📊 Response Analysis:');
    console.log(`  ✓ Status: ${data.ok ? 'OK' : 'Failed'}`);
    console.log(`  ✓ Next Action: ${data.next_action}`);
    console.log(`  ✓ Confidence: ${data.confidence}`);
    console.log(`  ✓ Schema Version: ${data.schema_version}`);
    
    if (data.dials) {
      console.log(`  ✓ Preset: ${data.dials.preset}`);
      console.log(`  ✓ Depth: ${data.dials.depth}`);
      console.log(`  ✓ Breadth: ${data.dials.breadth}`);
    }

    if (data.state) {
      console.log(`  ✓ Certainty: ${data.state.certainty}`);
      console.log(`  ✓ Plan Steps: ${data.state.plan?.length || 0}`);
      
      if (data.state.plan && data.state.plan.length > 0) {
        console.log('\n📋 Execution Plan:');
        data.state.plan.forEach((step: any, i: number) => {
          console.log(`    ${i + 1}. ${step.description}`);
        });
      }
    }

    if (data.final_answer) {
      console.log(`\n💬 Final Answer: "${data.final_answer.substring(0, 100)}..."`);
    }

    if (data.clarification_needed) {
      console.log(`\n❓ Clarification Needed: ${data.clarification_needed}`);
    }

    // Validate expectations
    const success = data.ok && data.schema_version && data.dials && data.state;
    console.log(`\n${success ? '✅ PASSED' : '❌ FAILED'}`);
    
    return success;

  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Starting Orchestrator Tests\n');
  
  let passed = 0;
  let failed = 0;

  for (const testCase of TEST_CASES) {
    const success = await testOrchestrator(testCase);
    if (success) {
      passed++;
    } else {
      failed++;
    }
    
    // Wait a bit between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Test Summary:');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📈 Success Rate: ${((passed / TEST_CASES.length) * 100).toFixed(1)}%`);
  console.log(`${'='.repeat(60)}\n`);
}

// Run tests
runTests().catch(console.error);