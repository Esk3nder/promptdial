import { OrchestrationResponse } from './types';

/**
 * Validates and potentially fixes orchestrator responses
 */
export class ResponseValidator {
  /**
   * Check if response has all required fields
   */
  static validateSchema(response: any): { valid: boolean; missing: string[] } {
    const required = [
      'ok',
      'dials',
      'state',
      'prompt_blueprint',
      'events',
      'next_action',
      'confidence',
      'schema_version'
    ];

    const missing = required.filter(field => !(field in response));
    
    // Also check nested required fields
    if (response.dials && typeof response.dials === 'object') {
      const dialFields = ['preset', 'depth', 'breadth', 'verbosity'];
      dialFields.forEach(field => {
        if (!(field in response.dials)) {
          missing.push(`dials.${field}`);
        }
      });
    }

    if (response.state && typeof response.state === 'object') {
      const stateFields = ['userGoal', 'certainty', 'plan', 'cursor'];
      stateFields.forEach(field => {
        if (!(field in response.state)) {
          missing.push(`state.${field}`);
        }
      });
    }

    return { valid: missing.length === 0, missing };
  }

  /**
   * Attempt to extract JSON from a text response
   */
  static extractJSON(text: string): any | null {
    // Try to find JSON in the text
    const patterns = [
      /```json\n?([\s\S]*?)\n?```/,  // Markdown code block
      /```\n?([\s\S]*?)\n?```/,       // Generic code block
      /(\{[\s\S]*\})/                  // Raw JSON object
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          return JSON.parse(match[1]);
        } catch (e) {
          continue;
        }
      }
    }

    // Last attempt: try parsing the whole text
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  /**
   * Create a fallback response when parsing fails
   */
  static createFallbackResponse(
    userGoal: string,
    rawResponse: string
  ): OrchestrationResponse {
    return {
      ok: true,
      dials: {
        preset: 'scholar',
        depth: 3,
        breadth: 2,
        verbosity: 3,
        creativity: 2,
        risk_tolerance: 1,
        evidence_strictness: 3,
        browse_aggressiveness: 2,
        clarifying_threshold: 0.95,
        reasoning_exposure: 'brief',
        self_consistency_n: 1,
        token_budget: 1800,
        output_format: 'json'
      },
      state: {
        userGoal,
        certainty: 0.5,
        plan: [
          {
            id: 'fallback_1',
            description: 'Process user request',
            toolCall: undefined,
            dependencies: undefined
          }
        ],
        cursor: 1,
        completedSteps: [],
        context: { fallback: true, reason: 'Failed to parse LLM response' },
        clarifications: undefined
      },
      prompt_blueprint: {
        purpose: 'Fallback response due to parsing error',
        instructions: ['Original response could not be parsed'],
        reference: [],
        output: { raw: rawResponse.substring(0, 500) }
      },
      synthesized_prompt: `Process the following request: "${userGoal}"`,
      events: [
        {
          type: 'error',
          data: { message: 'Response parsing failed, using fallback' },
          timestamp: new Date().toISOString(),
          sequence: 0
        }
      ],
      next_action: 'done',
      final_answer: rawResponse,
      public_rationale: 'Direct response provided (parsing failed)',
      assumptions: ['LLM did not return valid JSON'],
      limitations: ['Response structure not fully analyzed'],
      confidence: 0.3,
      refusal_reason: undefined,
      clarification_needed: undefined,
      schema_version: '1.0'
    };
  }

  /**
   * Attempt to fix common issues in responses
   */
  static attemptAutoFix(response: any, userGoal: string): any {
    // Start with a base structure
    const fixed = { ...response };

    // Ensure all required top-level fields
    if (fixed.ok === undefined) fixed.ok = true;
    if (!fixed.dials) {
      fixed.dials = {
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
      };
    }

    if (!fixed.state) {
      fixed.state = {
        userGoal,
        certainty: 0.8,
        plan: [],
        cursor: 0,
        completedSteps: [],
        context: {}
      };
    } else {
      if (!fixed.state.userGoal) fixed.state.userGoal = userGoal;
      if (fixed.state.certainty === undefined) fixed.state.certainty = 0.8;
      if (!fixed.state.plan) fixed.state.plan = [];
      if (fixed.state.cursor === undefined) fixed.state.cursor = 0;
      if (!fixed.state.completedSteps) fixed.state.completedSteps = [];
      if (!fixed.state.context) fixed.state.context = {};
    }

    if (!fixed.prompt_blueprint) {
      fixed.prompt_blueprint = {
        purpose: 'Process user request',
        instructions: [],
        reference: [],
        output: {}
      };
    }

    if (!fixed.events) fixed.events = [];
    if (!fixed.next_action) fixed.next_action = 'done';
    if (fixed.confidence === undefined) fixed.confidence = 0.7;
    if (!fixed.schema_version) fixed.schema_version = '1.0';

    return fixed;
  }
}