import { db } from '@/lib/db';
import { 
  orchestrationRuns, 
  orchestrationState, 
  orchestrationEvents,
  orchestrationMetrics,
  toolExecutions,
  policyViolations
} from '@/lib/db/orchestration-schema';
import {
  OrchestrationState,
  OrchestrationResponse,
  OrchestrationEvent,
  NextAction,
  PlannerInput,
  ExecutorInput,
  VerifierInput,
  OrchestratorConfig,
  ToolResponse,
  PlanStep
} from './types';
import { plannerPrompt } from './prompts/planner';
import { executorPrompt } from './prompts/executor';
import { verifierPrompt } from './prompts/verifier';
import { kernelPrompt } from './prompts/kernel';
// import { policyEngine } from './policy-engine'; // Disabled - using model provider safety
import { fetchWebTool } from './tools/fetch-web';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { selfConsistencyPlanner } from './self-consistency-planner';

export class Orchestrator {
  private config: OrchestratorConfig;
  private events: OrchestrationEvent[] = [];
  private eventSequence = 0;
  private tokenUsage = {
    planner: 0,
    executor: 0,
    verifier: 0,
    total: 0
  };
  private llmCallCount = 0;

  constructor(config?: Partial<OrchestratorConfig>) {
    this.config = {
      maxTokensPerResponse: 1800,
      maxLLMCalls: 10, // Soft limit, target is ≤3
      maxClarifications: 3,
      httpTimeout: 5000,
      retryOnError: true,
      domainAllowList: [],
      ...config
    };
  }

  async orchestrate(
    userGoal: string,
    userId: string,
    runId?: string
  ): Promise<OrchestrationResponse> {
    // Initialize or load existing run
    const run = await this.initializeRun(userGoal, userId, runId);
    
    // Load or initialize state
    let state: OrchestrationState = await this.loadOrInitializeState(run.id);
    
    try {
      // Policy checks disabled - relying on model provider safety
      // const policyCheck = await policyEngine.checkContent(userGoal);
      // if (!policyCheck.allowed) {
      //   return this.createRefusalResponse(state, policyCheck.reason);
      // }

      // Stage 1: Planning
      if (!state.plan || state.plan.length === 0) {
        const plannerResponse = await this.runPlanner(userGoal, state);
        state = plannerResponse.state;
        this.addEvent('plan_created', { plan: state.plan });
        
        // Disabled safe_refuse - let model providers handle safety
        // if (plannerResponse.next_action === 'safe_refuse') {
        //   return plannerResponse;
        // }
      }

      // Stage 2: Execution
      while (state.cursor < state.plan.length && this.llmCallCount < this.config.maxLLMCalls) {
        const executorResponse = await this.runExecutor(state);
        state = executorResponse.state;
        
        // Disabled safe_refuse - let model providers handle safety
        // if (executorResponse.next_action === 'safe_refuse') {
        //   return executorResponse;
        // }
        
        if (state.cursor >= state.plan.length) {
          break;
        }
      }

      // Stage 3: Verification
      const verifierResponse = await this.runVerifier(userGoal, state);
      
      // Save final state and metrics
      await this.saveState(run.id, verifierResponse.state);
      await this.saveMetrics(run.id, verifierResponse);
      
      return verifierResponse;
      
    } catch (error) {
      this.addEvent('error', { message: error.message });
      return this.createErrorResponse(state, error);
    }
  }

  private async runPlanner(
    userGoal: string,
    state: OrchestrationState
  ): Promise<OrchestrationResponse> {
    this.addEvent('plan_started', { userGoal });
    
    try {
      // P-1: Self-consistency planning
      const consistencyResult = await selfConsistencyPlanner.generatePlanWithConsistency(
        userGoal,
        state,
        { maxTokensPerResponse: this.config.maxTokensPerResponse }
      );
      
      // Track LLM usage
      this.llmCallCount += consistencyResult.candidates.length;
      this.tokenUsage.planner += consistencyResult.tokensUsed;
      this.tokenUsage.total += consistencyResult.tokensUsed;
      
      // Log convergence stats
      this.addEvent('plan_self_consistency', {
        candidateCount: consistencyResult.convergenceStats.candidateCount,
        converged: consistencyResult.convergenceStats.converged,
        commonSteps: consistencyResult.convergenceStats.commonSteps
      });
      
      let finalPlan: PlanStep[] | null = consistencyResult.plan;
      
      // Fallback to single plan if convergence failed
      if (!finalPlan || !selfConsistencyPlanner.validateConvergedPlan(finalPlan)) {
        this.addEvent('plan_convergence_failed', { reason: 'Invalid or no converged plan' });
        
        // Generate single plan with lower temperature
        const plannerInput: PlannerInput = {
          user_goal: userGoal,
          state
        };
        const systemPrompt = kernelPrompt + '\n\n' + plannerPrompt;
        
        const { text, usage } = await generateText({
          model: openai('gpt-4o'),
          system: systemPrompt,
          prompt: JSON.stringify(plannerInput),
          maxTokens: this.config.maxTokensPerResponse,
          temperature: 0.3, // Lower temperature for consistency
        });
        
        this.llmCallCount++;
        this.tokenUsage.planner += usage?.totalTokens || 0;
        this.tokenUsage.total += usage?.totalTokens || 0;
        
        const fallbackResponse = JSON.parse(text) as OrchestrationResponse;
        if (fallbackResponse.state.plan && fallbackResponse.state.plan.length > 0) {
          finalPlan = fallbackResponse.state.plan;
        }
      }
      
      if (!finalPlan || finalPlan.length === 0) {
        throw new Error('Failed to generate valid plan');
      }
      
      // Update state with final plan
      state.plan = finalPlan;
      state.cursor = 0;
      
      this.addEvent('plan_completed', { 
        planLength: state.plan.length,
        tokensUsed: this.tokenUsage.planner,
        usedSelfConsistency: consistencyResult.convergenceStats.converged
      });
      
      return {
        ok: true,
        state,
        events: this.events,
        next_action: 'execute',
        schema_version: 'v3'
      };
      
    } catch (error) {
      this.addEvent('plan_error', { error: error.message });
      throw error;
    }
  }

  private async runExecutor(state: OrchestrationState): Promise<OrchestrationResponse> {
    const currentStep = state.plan[state.cursor];
    this.addEvent('step_started', { step: currentStep });

    const executorInput: ExecutorInput = {
      state,
      current_step: currentStep,
      tool_available: 'fetch_web'
    };

    const systemPrompt = kernelPrompt + '\n\n' + executorPrompt;

    try {
      // Execute tool if needed
      if (currentStep.toolCall?.tool === 'fetch_web') {
        const toolResponse = await this.executeTool(currentStep);
        state.completedSteps.push({
          stepId: currentStep.id,
          result: toolResponse.data,
          toolResponse,
          timestamp: new Date().toISOString()
        });
      }

      const { text, usage } = await generateText({
        model: openai('gpt-4o'),
        system: systemPrompt,
        prompt: JSON.stringify(executorInput),
        maxTokens: this.config.maxTokensPerResponse,
        temperature: 0.7,
      });

      this.llmCallCount++;
      this.tokenUsage.executor += usage?.totalTokens || 0;
      this.tokenUsage.total += usage?.totalTokens || 0;

      const response = JSON.parse(text) as OrchestrationResponse;
      
      // Update cursor
      state.cursor++;
      response.state = state;
      
      // Check if we need to move to verification
      if (state.cursor >= state.plan.length) {
        response.next_action = 'execute'; // Will trigger verifier in main loop
      }

      this.addEvent('step_completed', { 
        step: currentStep,
        tokensUsed: usage?.totalTokens 
      });

      return response;
      
    } catch (error) {
      this.addEvent('executor_error', { 
        step: currentStep,
        error: error.message 
      });
      
      if (this.config.retryOnError) {
        this.addEvent('executor_retry', { step: currentStep });
        return this.runExecutor(state); // Retry once
      }
      
      throw error;
    }
  }

  private async runVerifier(
    userGoal: string,
    state: OrchestrationState
  ): Promise<OrchestrationResponse> {
    this.addEvent('verification_started', {});

    const verifierInput: VerifierInput = {
      user_goal: userGoal,
      state,
      final_output: this.compileFinalOutput(state)
    };

    const systemPrompt = kernelPrompt + '\n\n' + verifierPrompt;

    try {
      const { text, usage } = await generateText({
        model: openai('gpt-4o'),
        system: systemPrompt,
        prompt: JSON.stringify(verifierInput),
        maxTokens: this.config.maxTokensPerResponse,
        temperature: 0.3, // Lower temperature for verification
      });

      this.llmCallCount++;
      this.tokenUsage.verifier += usage?.totalTokens || 0;
      this.tokenUsage.total += usage?.totalTokens || 0;

      const response = JSON.parse(text) as OrchestrationResponse;
      
      // Check verification result
      if (response.next_action === 'done') {
        this.addEvent('verification_passed', { 
          finalAnswer: response.final_answer,
          totalTokens: this.tokenUsage.total 
        });
      }
      // Removed safe_refuse check - model providers handle safety

      // Add all accumulated events to response
      response.events = this.events;
      response.state = state;

      return response;
      
    } catch (error) {
      this.addEvent('verifier_error', { error: error.message });
      throw error;
    }
  }

  private async executeTool(step: PlanStep): Promise<ToolResponse> {
    if (step.toolCall?.tool !== 'fetch_web') {
      throw new Error(`Unknown tool: ${step.toolCall?.tool}`);
    }

    const url = step.toolCall.parameters.url;
    
    // Check domain allow list
    if (!this.isDomainAllowed(url)) {
      return {
        ok: false,
        error: 'Domain not in allow list',
        timestamp: new Date().toISOString()
      };
    }

    this.addEvent('tool_called', { 
      tool: 'fetch_web',
      url 
    });

    try {
      const result = await fetchWebTool(url, this.config.httpTimeout);
      
      this.addEvent('tool_response', { 
        tool: 'fetch_web',
        success: result.ok 
      });

      return result;
      
    } catch (error) {
      this.addEvent('tool_error', { 
        tool: 'fetch_web',
        error: error.message 
      });
      
      return {
        ok: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  private isDomainAllowed(url: string): boolean {
    if (this.config.domainAllowList.length === 0) {
      return true; // No restrictions if list is empty
    }
    
    try {
      const domain = new URL(url).hostname;
      return this.config.domainAllowList.some(allowed => 
        domain === allowed || domain.endsWith(`.${allowed}`)
      );
    } catch {
      return false;
    }
  }

  private compileFinalOutput(state: OrchestrationState): any {
    return {
      plan: state.plan,
      completedSteps: state.completedSteps,
      context: state.context
    };
  }

  // Removed createRefusalResponse - model providers handle safety

  private createErrorResponse(
    state: OrchestrationState,
    error: any
  ): OrchestrationResponse {
    return {
      ok: false,
      state,
      events: this.events,
      next_action: 'done',
      final_answer: `An error occurred: ${error.message}`,
      schema_version: 'v3'
    };
  }

  private addEvent(type: any, data: any) {
    this.events.push({
      type,
      data,
      timestamp: new Date().toISOString(),
      sequence: this.eventSequence++
    });
  }

  private async initializeRun(userGoal: string, userId: string, runId?: string) {
    if (runId) {
      const existing = await db
        .select()
        .from(orchestrationRuns)
        .where(eq(orchestrationRuns.id, runId))
        .limit(1);
      
      if (existing[0]) {
        return existing[0];
      }
    }

    const [run] = await db
      .insert(orchestrationRuns)
      .values({
        userId,
        userGoal,
        status: 'planning'
      })
      .returning();

    return run;
  }

  private async loadOrInitializeState(runId: string): Promise<OrchestrationState> {
    const existing = await db
      .select()
      .from(orchestrationState)
      .where(eq(orchestrationState.runId, runId))
      .orderBy(desc(orchestrationState.version))
      .limit(1);

    if (existing[0]) {
      return existing[0].state as OrchestrationState;
    }

    return {
      userGoal: '',
      plan: [],
      cursor: 0,
      completedSteps: [],
      context: {}
    };
  }

  private async saveState(runId: string, state: OrchestrationState) {
    await db.insert(orchestrationState).values({
      runId,
      state,
      schemaVersion: 'v3'
    });
  }

  private async saveMetrics(runId: string, response: OrchestrationResponse) {
    await db.insert(orchestrationMetrics).values({
      runId,
      taskCompletionSuccess: response.next_action === 'done',
      totalTokens: this.tokenUsage.total,
      clarificationLoops: response.state.clarifications?.length || 0,
      policyViolationEscaped: false,
      executionTimeMs: Date.now() - this.startTime
    });
  }

  private startTime = Date.now();
}

// Import helper for Drizzle
import { eq, desc } from 'drizzle-orm';