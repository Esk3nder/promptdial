import { pgTable, text, timestamp, uuid, jsonb, integer, pgEnum, boolean, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { userProfile } from './schema';

// Enums for orchestration
export const orchestrationStatusEnum = pgEnum('orchestration_status', [
  'planning',
  'executing',
  'verifying',
  'completed',
  'failed'
]);

export const nextActionEnum = pgEnum('next_action', [
  'execute',
  'done',
  'clarify'
]);

export const eventTypeEnum = pgEnum('event_type', [
  'plan_created',
  'step_started',
  'step_completed',
  'tool_called',
  'tool_response',
  'verification_started',
  'verification_passed',
  'verification_failed',
  'error',
  'warning'
]);

// Main orchestration runs table
export const orchestrationRuns = pgTable('orchestration_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  userGoal: text('user_goal').notNull(),
  status: orchestrationStatusEnum('status').notNull().default('planning'),
  
  // Token tracking
  totalTokensUsed: integer('total_tokens_used').default(0),
  plannerTokens: integer('planner_tokens').default(0),
  executorTokens: integer('executor_tokens').default(0),
  verifierTokens: integer('verifier_tokens').default(0),
  
  // Timing
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  
  // Results
  finalAnswer: text('final_answer'),
  
  // Metrics
  llmCallCount: integer('llm_call_count').default(0),
  clarificationCount: integer('clarification_count').default(0),
  retryCount: integer('retry_count').default(0),
  
  // Credits/billing
  creditsUsed: integer('credits_used').default(0),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

// Orchestration state persistence
export const orchestrationState = pgTable('orchestration_state', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id').notNull().references(() => orchestrationRuns.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1),
  state: jsonb('state').notNull(), // The complete state object
  schemaVersion: text('schema_version').notNull().default('v3'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Event log for orchestration
export const orchestrationEvents = pgTable('orchestration_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id').notNull().references(() => orchestrationRuns.id, { onDelete: 'cascade' }),
  eventType: eventTypeEnum('event_type').notNull(),
  eventData: jsonb('event_data').notNull(),
  sequence: integer('sequence').notNull(), // Order of events
  timestamp: timestamp('timestamp').defaultNow(),
});

// Versioned prompts storage
export const orchestrationPrompts = pgTable('orchestration_prompts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(), // 'kernel', 'planner', 'executor', 'verifier'
  version: text('version').notNull(),
  content: text('content').notNull(),
  isActive: boolean('is_active').default(false),
  metadata: jsonb('metadata'), // Additional configuration
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

// Orchestration metrics for monitoring
export const orchestrationMetrics = pgTable('orchestration_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id').notNull().references(() => orchestrationRuns.id, { onDelete: 'cascade' }),
  
  // P0-P4 metrics from PRD
  taskCompletionSuccess: boolean('task_completion_success'),
  totalTokens: integer('total_tokens'),
  clarificationLoops: integer('clarification_loops'),
  policyViolationEscaped: boolean('policy_violation_escaped').default(false),
  userSatisfactionRating: real('user_satisfaction_rating'), // 1-5 scale
  
  // Additional performance metrics
  executionTimeMs: integer('execution_time_ms'),
  llmLatencyMs: jsonb('llm_latency_ms'), // Array of latencies per call
  
  createdAt: timestamp('created_at').defaultNow(),
});

// Tool executions log
export const toolExecutions = pgTable('tool_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id').notNull().references(() => orchestrationRuns.id, { onDelete: 'cascade' }),
  toolName: text('tool_name').notNull(), // 'fetch_web'
  input: jsonb('input').notNull(),
  output: jsonb('output'),
  success: boolean('success').notNull(),
  errorMessage: text('error_message'),
  executionTimeMs: integer('execution_time_ms'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Domain allow-list for fetch_web
export const domainAllowList = pgTable('domain_allow_list', {
  id: uuid('id').primaryKey().defaultRandom(),
  domain: text('domain').notNull().unique(),
  isActive: boolean('is_active').default(true),
  addedBy: text('added_by'),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

// Relations
export const orchestrationRunsRelations = relations(orchestrationRuns, ({ one, many }) => ({
  userProfile: one(userProfile, {
    fields: [orchestrationRuns.userId],
    references: [userProfile.userId],
  }),
  states: many(orchestrationState),
  events: many(orchestrationEvents),
  metrics: one(orchestrationMetrics),
  toolExecutions: many(toolExecutions),
}));

export const orchestrationStateRelations = relations(orchestrationState, ({ one }) => ({
  run: one(orchestrationRuns, {
    fields: [orchestrationState.runId],
    references: [orchestrationRuns.id],
  }),
}));

export const orchestrationEventsRelations = relations(orchestrationEvents, ({ one }) => ({
  run: one(orchestrationRuns, {
    fields: [orchestrationEvents.runId],
    references: [orchestrationRuns.id],
  }),
}));

export const orchestrationMetricsRelations = relations(orchestrationMetrics, ({ one }) => ({
  run: one(orchestrationRuns, {
    fields: [orchestrationMetrics.runId],
    references: [orchestrationRuns.id],
  }),
}));

export const toolExecutionsRelations = relations(toolExecutions, ({ one }) => ({
  run: one(orchestrationRuns, {
    fields: [toolExecutions.runId],
    references: [orchestrationRuns.id],
  }),
}));

// Type exports
export type OrchestrationRun = typeof orchestrationRuns.$inferSelect;
export type NewOrchestrationRun = typeof orchestrationRuns.$inferInsert;
export type OrchestrationState = typeof orchestrationState.$inferSelect;
export type NewOrchestrationState = typeof orchestrationState.$inferInsert;
export type OrchestrationEvent = typeof orchestrationEvents.$inferSelect;
export type NewOrchestrationEvent = typeof orchestrationEvents.$inferInsert;
export type OrchestrationPrompt = typeof orchestrationPrompts.$inferSelect;
export type NewOrchestrationPrompt = typeof orchestrationPrompts.$inferInsert;
export type OrchestrationMetric = typeof orchestrationMetrics.$inferSelect;
export type NewOrchestrationMetric = typeof orchestrationMetrics.$inferInsert;
export type ToolExecution = typeof toolExecutions.$inferSelect;
export type NewToolExecution = typeof toolExecutions.$inferInsert;
export type DomainAllowListEntry = typeof domainAllowList.$inferSelect;
export type NewDomainAllowListEntry = typeof domainAllowList.$inferInsert;