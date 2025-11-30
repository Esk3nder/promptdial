/**
 * Task classifier for dynamically selecting the best exemplar based on user input.
 * Uses regex pattern matching to categorize lazy prompts into task types.
 */

import { TaskType } from './exemplars';

/**
 * Pattern definitions for each task type.
 * Patterns are checked in order of specificity (most specific first).
 */
const TASK_PATTERNS: Record<TaskType, RegExp[]> = {
  // Code-related tasks: implementing, building, fixing
  code: [
    /\b(write|create|implement|build|make|develop)\b.*\b(function|method|class|module|api|endpoint|script|code|program|app|application|component|service|utility|library|package)\b/i,
    /\b(function|method|class|module|api|endpoint|script|code|program)\b.*\b(to|that|for|which)\b/i,
    /\b(fix|debug|refactor|optimize|improve)\b.*\b(bug|error|issue|code|function|performance)\b/i,
    /\b(unit test|test case|integration test|e2e test)\b/i,
    /\bvalidat(e|or|ion)\b.*\b(email|input|form|data|password|url)\b/i,
    /\b(parse|serialize|deserialize|encode|decode)\b/i,
    /\b(algorithm|data structure|sort|search|filter|map|reduce)\b/i,
  ],

  // Analysis/comparison tasks: evaluating, comparing, reviewing
  analysis: [
    /\b(compare|comparison|versus|vs\.?)\b/i,
    /\b(analyze|analyse|analysis|evaluate|evaluation|assess|assessment)\b/i,
    /\b(pros?\s*(and|&|\/)\s*cons?)\b/i,
    /\b(difference|differences|differ)\b.*\b(between|from)\b/i,
    /\b(review|critique|audit)\b.*\b(code|architecture|design|system|approach|strategy)\b/i,
    /\b(trade-?off|tradeoff)\b/i,
    /\b(benchmark|performance comparison)\b/i,
    /\b(which|what)\b.*\b(better|best|prefer|choose|recommend)\b/i,
  ],

  // Planning tasks: strategies, roadmaps, launches
  planning: [
    /\b(plan|planning|roadmap|strategy|strategize)\b/i,
    /\b(launch|release|rollout|deployment)\b.*\b(plan|strategy|checklist)\b/i,
    /\b(project|product|feature)\b.*\b(plan|planning|timeline|schedule|milestone)\b/i,
    /\b(how\s+to|steps\s+to|process\s+for)\b.*\b(implement|build|create|develop|ship|launch|release)\b/i,
    /\b(initiative|proposal|pitch|business\s+case)\b/i,
    /\b(timeline|schedule|gantt|milestone|deadline)\b/i,
    /\b(goal|objective|okr|kpi)\b.*\b(set|define|create)\b/i,
  ],

  // Extraction tasks: summarizing, extracting key points
  extraction: [
    /\b(summarize|summarise|summary|tldr|tl;dr)\b/i,
    /\b(extract|extraction|pull\s+out|identify)\b.*\b(key|main|important|critical)\b/i,
    /\b(meeting|call|interview|conversation)\b.*\b(notes|summary|recap|minutes)\b/i,
    /\b(key\s+(points?|takeaways?|findings?|insights?|themes?))\b/i,
    /\b(main\s+(ideas?|points?|themes?|arguments?))\b/i,
    /\b(bullet\s*points?|highlights?|overview)\b/i,
    /\b(distill|condense|boil\s+down)\b/i,
  ],

  // Content creation tasks: writing, drafting, creating documents
  content: [
    /\b(write|draft|compose|create)\b.*\b(blog|article|post|email|letter|copy|essay|document|report|whitepaper|guide|tutorial)\b/i,
    /\b(blog|article|post|email|letter|copy|essay|document|report)\b.*\b(about|on|regarding|for)\b/i,
    /\b(content|copy|text)\b.*\b(for|about)\b/i,
    /\b(help\s+me\s+write|write\s+me|draft\s+a|compose\s+a)\b/i,
    /\b(marketing|sales|landing\s+page)\b.*\b(copy|content|text)\b/i,
    /\b(social\s+media|twitter|linkedin|facebook|instagram)\b.*\b(post|content)\b/i,
    /\b(newsletter|announcement|press\s+release)\b/i,
  ],
};

/**
 * Scores for pattern matches - earlier patterns in each array are more specific
 */
const BASE_SCORE = 10;
const SPECIFICITY_BONUS = 2;

interface ClassificationResult {
  taskType: TaskType;
  confidence: 'high' | 'medium' | 'low';
  scores: Record<TaskType, number>;
}

/**
 * Classify the user's lazy input into a task type.
 * Uses pattern matching with confidence scoring.
 */
export function classifyTask(input: string): ClassificationResult {
  const normalizedInput = input.toLowerCase().trim();
  const scores: Record<TaskType, number> = {
    content: 0,
    analysis: 0,
    code: 0,
    planning: 0,
    extraction: 0,
  };

  // Score each task type based on pattern matches
  for (const [taskType, patterns] of Object.entries(TASK_PATTERNS) as [TaskType, RegExp[]][]) {
    patterns.forEach((pattern, index) => {
      if (pattern.test(normalizedInput)) {
        // Earlier patterns get higher scores (more specific)
        scores[taskType] += BASE_SCORE + (patterns.length - index) * SPECIFICITY_BONUS;
      }
    });
  }

  // Find the task type with the highest score
  const sortedTypes = (Object.entries(scores) as [TaskType, number][])
    .sort(([, a], [, b]) => b - a);

  const [topType, topScore] = sortedTypes[0];
  const [, secondScore] = sortedTypes[1] || [null, 0];

  // Determine confidence based on score magnitude and gap to second place
  let confidence: 'high' | 'medium' | 'low';
  if (topScore === 0) {
    // No matches - default to content with low confidence
    confidence = 'low';
  } else if (topScore >= 20 && topScore - secondScore >= 10) {
    confidence = 'high';
  } else if (topScore >= 10) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    taskType: topScore > 0 ? topType : 'content', // Default to content if no matches
    confidence,
    scores,
  };
}

/**
 * Get the best matching task type (simple interface).
 */
export function getTaskType(input: string): TaskType {
  return classifyTask(input).taskType;
}

/**
 * Get classification with debug info (useful for testing/logging).
 */
export function classifyTaskWithDebug(input: string): ClassificationResult & { input: string } {
  return {
    input,
    ...classifyTask(input),
  };
}
