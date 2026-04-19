CREATE TABLE IF NOT EXISTS system_monitor_events (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_monitor_events_category_created
  ON system_monitor_events(category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_monitor_events_source_created
  ON system_monitor_events(source, created_at DESC);

CREATE TABLE IF NOT EXISTS backup_run_reports (
  id BIGSERIAL PRIMARY KEY,
  backup_type TEXT NOT NULL DEFAULT 'postgres',
  status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  retention_days INTEGER,
  details_json JSONB,
  reported_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backup_run_reports_created
  ON backup_run_reports(created_at DESC);

CREATE TABLE IF NOT EXISTS api_rate_limit_events (
  id BIGSERIAL PRIMARY KEY,
  policy_name TEXT NOT NULL,
  scope_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limit_events_scope_created
  ON api_rate_limit_events(policy_name, scope_key, created_at DESC);
