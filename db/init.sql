-- YellowKode Agent — Database schema
-- Sessions, messages, screenshots, tasks

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table
CREATE TABLE sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT,
  agent       TEXT DEFAULT 'main',
  model       TEXT,
  status      TEXT DEFAULT 'active',  -- active | completed | error
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  summary     TEXT,
  tags        TEXT[]
);

-- Messages table (full chat history per session)
CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
  role        TEXT NOT NULL,  -- user | assistant | system | tool
  content     TEXT NOT NULL,
  tool_name   TEXT,           -- which tool was called (browser, exec, etc)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Screenshots table (linked to messages/sessions)
CREATE TABLE screenshots (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
  message_id  UUID REFERENCES messages(id) ON DELETE SET NULL,
  filename    TEXT NOT NULL,
  url         TEXT,           -- URL that was captured
  description TEXT,           -- vision analysis
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table (named reusable tasks)
CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  prompt      TEXT NOT NULL,
  agent       TEXT DEFAULT 'main',
  schedule    TEXT,           -- cron expression if scheduled
  last_run_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Task runs log
CREATE TABLE task_runs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID REFERENCES tasks(id) ON DELETE CASCADE,
  session_id  UUID REFERENCES sessions(id) ON DELETE SET NULL,
  status      TEXT DEFAULT 'running',  -- running | success | error
  started_at  TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  result      TEXT
);

-- Indexes
CREATE INDEX idx_messages_session ON messages(session_id, created_at);
CREATE INDEX idx_screenshots_session ON screenshots(session_id, created_at);
CREATE INDEX idx_sessions_created ON sessions(created_at DESC);
CREATE INDEX idx_task_runs_task ON task_runs(task_id, started_at DESC);

-- Auto-update updated_at on sessions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
