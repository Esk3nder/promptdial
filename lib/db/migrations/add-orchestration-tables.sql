-- Create enums for orchestration
CREATE TYPE orchestration_status AS ENUM ('planning', 'executing', 'verifying', 'completed', 'failed', 'refused');
CREATE TYPE next_action AS ENUM ('execute', 'done', 'safe_refuse', 'clarify');
CREATE TYPE event_type AS ENUM (
  'plan_created', 'step_started', 'step_completed', 
  'tool_called', 'tool_response', 'verification_started',
  'verification_passed', 'verification_failed', 'policy_violation',
  'error', 'warning'
);

-- Main orchestration runs table
CREATE TABLE orchestration_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_goal TEXT NOT NULL,
  status orchestration_status NOT NULL DEFAULT 'planning',
  
  -- Token tracking
  total_tokens_used INTEGER DEFAULT 0,
  planner_tokens INTEGER DEFAULT 0,
  executor_tokens INTEGER DEFAULT 0,
  verifier_tokens INTEGER DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  -- Results
  final_answer TEXT,
  refusal_reason TEXT,
  
  -- Metrics
  llm_call_count INTEGER DEFAULT 0,
  clarification_count INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  
  -- Credits/billing
  credits_used INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Orchestration state persistence
CREATE TABLE orchestration_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES orchestration_runs(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  state JSONB NOT NULL,
  schema_version TEXT NOT NULL DEFAULT 'v3',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Event log for orchestration
CREATE TABLE orchestration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES orchestration_runs(id) ON DELETE CASCADE,
  event_type event_type NOT NULL,
  event_data JSONB NOT NULL,
  sequence INTEGER NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Versioned prompts storage
CREATE TABLE orchestration_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Policy violations tracking
CREATE TABLE policy_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES orchestration_runs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  content TEXT,
  context JSONB,
  was_blocked BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orchestration metrics for monitoring
CREATE TABLE orchestration_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES orchestration_runs(id) ON DELETE CASCADE,
  
  -- P0-P4 metrics from PRD
  task_completion_success BOOLEAN,
  total_tokens INTEGER,
  clarification_loops INTEGER,
  policy_violation_escaped BOOLEAN DEFAULT false,
  user_satisfaction_rating REAL,
  
  -- Additional performance metrics
  execution_time_ms INTEGER,
  llm_latency_ms JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tool executions log
CREATE TABLE tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES orchestration_runs(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  input JSONB NOT NULL,
  output JSONB,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Domain allow-list for fetch_web
CREATE TABLE domain_allow_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  added_by TEXT,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_orchestration_runs_user_id ON orchestration_runs(user_id);
CREATE INDEX idx_orchestration_runs_status ON orchestration_runs(status);
CREATE INDEX idx_orchestration_state_run_id ON orchestration_state(run_id);
CREATE INDEX idx_orchestration_events_run_id ON orchestration_events(run_id);
CREATE INDEX idx_policy_violations_user_id ON policy_violations(user_id);
CREATE INDEX idx_orchestration_metrics_run_id ON orchestration_metrics(run_id);
CREATE INDEX idx_tool_executions_run_id ON tool_executions(run_id);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orchestration_runs_updated_at 
  BEFORE UPDATE ON orchestration_runs 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_orchestration_prompts_updated_at 
  BEFORE UPDATE ON orchestration_prompts 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_domain_allow_list_updated_at 
  BEFORE UPDATE ON domain_allow_list 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert default prompts
INSERT INTO orchestration_prompts (name, version, content, is_active) VALUES
('kernel', 'v3', 'Kernel prompt content here...', true),
('planner', 'v3', 'Planner prompt content here...', true),
('executor', 'v3', 'Executor prompt content here...', true),
('verifier', 'v3', 'Verifier prompt content here...', true);

-- Insert default allowed domains
INSERT INTO domain_allow_list (domain, reason, added_by) VALUES
('wikipedia.org', 'Educational content', 'system'),
('github.com', 'Code repositories', 'system'),
('stackoverflow.com', 'Technical Q&A', 'system'),
('news.ycombinator.com', 'Tech news', 'system'),
('arxiv.org', 'Research papers', 'system');