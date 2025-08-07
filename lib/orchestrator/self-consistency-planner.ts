import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { OrchestrationState, PlanStep, OrchestrationResponse, PlannerInput } from './types';
import { kernelPrompt } from './prompts/kernel';
import { plannerPrompt } from './prompts/planner';

export class SelfConsistencyPlanner {
  private maxCandidates = 3;
  private temperature = 0.7;
  private convergenceThreshold = 0.5; // 50% agreement needed
  
  async generatePlanWithConsistency(
    userGoal: string,
    state: OrchestrationState,
    config: { maxTokensPerResponse: number }
  ): Promise<{
    plan: PlanStep[] | null;
    candidates: PlanStep[][];
    convergenceStats: {
      candidateCount: number;
      converged: boolean;
      commonSteps: number;
    };
    tokensUsed: number;
  }> {
    const candidates = await this.generateCandidatePlans(userGoal, state, config);
    const convergedPlan = this.convergePlans(candidates);
    
    const tokensUsed = candidates.length * 1500; // Estimate
    
    return {
      plan: convergedPlan,
      candidates,
      convergenceStats: {
        candidateCount: candidates.length,
        converged: convergedPlan !== null,
        commonSteps: convergedPlan?.length || 0
      },
      tokensUsed
    };
  }
  
  private async generateCandidatePlans(
    userGoal: string,
    state: OrchestrationState,
    config: { maxTokensPerResponse: number }
  ): Promise<PlanStep[][]> {
    const candidates: PlanStep[][] = [];
    const plannerInput: PlannerInput = {
      user_goal: userGoal,
      state
    };
    
    // Enhanced prompt for self-consistency
    const enhancedPrompt = kernelPrompt + '\n\n' + plannerPrompt + '\n\n' + 
      'IMPORTANT: Generate a comprehensive plan that covers all aspects of the goal.';
    
    // Generate multiple candidate plans
    const promises = Array.from({ length: this.maxCandidates }, async (_, i) => {
      try {
        const { text, usage } = await generateText({
          model: openai('gpt-4o'),
          system: enhancedPrompt,
          prompt: JSON.stringify(plannerInput),
          maxTokens: config.maxTokensPerResponse,
          temperature: this.temperature,
          seed: i * 1000, // Different seed for diversity
        });
        
        const response = JSON.parse(text) as OrchestrationResponse;
        if (response.state.plan && response.state.plan.length > 0) {
          return response.state.plan;
        }
      } catch (error) {
        console.error(`Failed to generate candidate plan ${i}:`, error);
      }
      return null;
    });
    
    const results = await Promise.all(promises);
    return results.filter(plan => plan !== null) as PlanStep[][];
  }
  
  private convergePlans(candidates: PlanStep[][]): PlanStep[] | null {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];
    
    // Step 1: Extract all unique steps across all plans
    const stepSignatures = new Map<string, {
      step: PlanStep;
      frequency: number;
      positions: number[];
      planIndices: number[];
    }>();
    
    candidates.forEach((plan, planIndex) => {
      plan.forEach((step, position) => {
        const signature = this.getStepSignature(step);
        const existing = stepSignatures.get(signature);
        
        if (existing) {
          existing.frequency++;
          existing.positions.push(position);
          existing.planIndices.push(planIndex);
        } else {
          stepSignatures.set(signature, {
            step: { ...step }, // Clone to avoid mutations
            frequency: 1,
            positions: [position],
            planIndices: [planIndex]
          });
        }
      });
    });
    
    // Step 2: Select steps that appear in majority of plans
    const threshold = Math.ceil(candidates.length * this.convergenceThreshold);
    const selectedSteps: Array<{
      step: PlanStep;
      avgPosition: number;
      frequency: number;
    }> = [];
    
    for (const [signature, data] of stepSignatures) {
      if (data.frequency >= threshold) {
        const avgPosition = data.positions.reduce((a, b) => a + b, 0) / data.positions.length;
        selectedSteps.push({
          step: data.step,
          avgPosition,
          frequency: data.frequency
        });
      }
    }
    
    // Step 3: Sort by average position to maintain logical order
    selectedSteps.sort((a, b) => a.avgPosition - b.avgPosition);
    
    // Step 4: Renumber and clean up step IDs and dependencies
    const finalPlan = selectedSteps.map((item, index) => ({
      ...item.step,
      id: `step_${index + 1}`,
      dependencies: this.updateDependencies(item.step.dependencies, selectedSteps, index)
    }));
    
    return finalPlan.length > 0 ? finalPlan : null;
  }
  
  private getStepSignature(step: PlanStep): string {
    // Create a normalized signature for step comparison
    const description = step.description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_');
    
    const toolSignature = step.toolCall 
      ? `${step.toolCall.tool}_${this.normalizeUrl(step.toolCall.parameters?.url)}`
      : 'no_tool';
    
    return `${description}::${toolSignature}`;
  }
  
  private normalizeUrl(url?: string): string {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      return `${parsed.hostname}${parsed.pathname}`.replace(/[^a-z0-9]/gi, '_');
    } catch {
      return url.replace(/[^a-z0-9]/gi, '_');
    }
  }
  
  private updateDependencies(
    originalDeps: string[] | undefined,
    selectedSteps: Array<{ step: PlanStep; avgPosition: number; frequency: number }>,
    currentIndex: number
  ): string[] | undefined {
    if (!originalDeps || originalDeps.length === 0) return undefined;
    
    // Only keep dependencies that exist in the converged plan and come before current step
    const validDeps = selectedSteps
      .slice(0, currentIndex)
      .map((_, i) => `step_${i + 1}`);
    
    return validDeps.length > 0 ? validDeps.slice(-2) : undefined; // Keep max 2 deps
  }
  
  // Validation method to ensure plan coherence
  validateConvergedPlan(plan: PlanStep[]): boolean {
    // Check for minimum steps
    if (plan.length < 2 || plan.length > 7) {
      return false;
    }
    
    // Check that all dependencies reference existing steps
    for (let i = 0; i < plan.length; i++) {
      const step = plan[i];
      if (step.dependencies) {
        for (const dep of step.dependencies) {
          const depIndex = parseInt(dep.replace('step_', '')) - 1;
          if (depIndex < 0 || depIndex >= i) {
            return false; // Invalid dependency
          }
        }
      }
    }
    
    // Check for at least one actionable step
    const hasAction = plan.some(step => 
      step.toolCall !== undefined || 
      step.description.toLowerCase().includes('create') ||
      step.description.toLowerCase().includes('generate') ||
      step.description.toLowerCase().includes('analyze')
    );
    
    return hasAction;
  }
}

export const selfConsistencyPlanner = new SelfConsistencyPlanner();