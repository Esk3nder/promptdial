#!/usr/bin/env tsx

// Test script for self-consistency planning (P-1)

import { selfConsistencyPlanner } from '../lib/orchestrator/self-consistency-planner';
import { OrchestrationState, PlanStep } from '../lib/orchestrator/types';

console.log('🧪 Testing Self-Consistency Planning (P-1)\n');

// Mock candidate plans for testing convergence logic
const mockCandidates: PlanStep[][] = [
  // Candidate 1
  [
    { id: 'step_1', description: 'Fetch AI news from arxiv', toolCall: { tool: 'fetch_web', parameters: { url: 'https://arxiv.org/list/cs.AI/recent' } } },
    { id: 'step_2', description: 'Extract key findings from papers' },
    { id: 'step_3', description: 'Summarize latest trends' },
    { id: 'step_4', description: 'Format as bullet points' },
  ],
  // Candidate 2
  [
    { id: 'step_1', description: 'Fetch AI news from arxiv', toolCall: { tool: 'fetch_web', parameters: { url: 'https://arxiv.org/list/cs.AI/recent' } } },
    { id: 'step_2', description: 'Analyze research papers' },
    { id: 'step_3', description: 'Extract key findings from papers' },
    { id: 'step_4', description: 'Create summary of trends' },
    { id: 'step_5', description: 'Format as readable output' },
  ],
  // Candidate 3
  [
    { id: 'step_1', description: 'Fetch recent AI papers', toolCall: { tool: 'fetch_web', parameters: { url: 'https://arxiv.org/list/cs.AI/recent' } } },
    { id: 'step_2', description: 'Extract key findings from papers' },
    { id: 'step_3', description: 'Identify major themes' },
    { id: 'step_4', description: 'Summarize latest trends' },
  ]
];

console.log('📋 Testing Convergence Logic:\n');

// Test convergence with mock data
const planner = new (selfConsistencyPlanner as any).constructor();
const convergedPlan = planner.convergePlans(mockCandidates);

if (convergedPlan) {
  console.log('✅ Plans converged successfully!\n');
  console.log('Converged Plan:');
  convergedPlan.forEach((step, index) => {
    console.log(`  ${index + 1}. ${step.description}`);
    if (step.toolCall) {
      console.log(`     Tool: ${step.toolCall.tool}`);
    }
  });
  console.log('');
  
  // Validate the converged plan
  const isValid = planner.validateConvergedPlan(convergedPlan);
  console.log(`Plan Validation: ${isValid ? '✅ Valid' : '❌ Invalid'}\n`);
} else {
  console.log('❌ Failed to converge plans\n');
}

// Test step signature generation
console.log('🔑 Testing Step Signature Generation:\n');

const testSteps = [
  { id: 'step_1', description: 'Fetch AI news from arxiv' },
  { id: 'step_2', description: 'fetch ai news from arxiv' },
  { id: 'step_3', description: 'Fetch AI News from ArXiv!' },
];

testSteps.forEach(step => {
  const signature = planner.getStepSignature(step);
  console.log(`  "${step.description}" -> "${signature}"`);
});

console.log('\n📊 Convergence Statistics:\n');

// Calculate convergence stats
const stepFrequency = new Map<string, number>();
mockCandidates.forEach(plan => {
  plan.forEach(step => {
    const key = step.description.toLowerCase();
    stepFrequency.set(key, (stepFrequency.get(key) || 0) + 1);
  });
});

const threshold = Math.ceil(mockCandidates.length * 0.5);
let commonSteps = 0;
stepFrequency.forEach((count, step) => {
  if (count >= threshold) {
    commonSteps++;
    console.log(`  "${step}" appears in ${count}/3 plans ✅`);
  }
});

console.log(`\n  Total common steps: ${commonSteps}`);
console.log(`  Convergence threshold: ${threshold}/3 plans`);

// Test validation logic
console.log('\n🔍 Testing Plan Validation:\n');

const validPlan: PlanStep[] = [
  { id: 'step_1', description: 'Fetch data', toolCall: { tool: 'fetch_web', parameters: { url: 'https://example.com' } } },
  { id: 'step_2', description: 'Analyze results', dependencies: ['step_1'] },
  { id: 'step_3', description: 'Generate summary' },
];

const invalidPlan1: PlanStep[] = [
  { id: 'step_1', description: 'Single step only' },
];

const invalidPlan2: PlanStep[] = [
  { id: 'step_1', description: 'First step' },
  { id: 'step_2', description: 'Second step', dependencies: ['step_3'] }, // Invalid dep
  { id: 'step_3', description: 'Third step' },
];

console.log(`  Valid plan: ${planner.validateConvergedPlan(validPlan) ? '✅ Pass' : '❌ Fail'}`);
console.log(`  Too short plan: ${planner.validateConvergedPlan(invalidPlan1) ? '❌ Fail' : '✅ Pass (correctly rejected)'}`);
console.log(`  Invalid dependencies: ${planner.validateConvergedPlan(invalidPlan2) ? '❌ Fail' : '✅ Pass (correctly rejected)'}`);

console.log('\n✅ Self-consistency planning tests complete!\n');