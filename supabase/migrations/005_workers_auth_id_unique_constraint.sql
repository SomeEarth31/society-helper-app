-- ============================================================
-- Migration 005 — Fix workers.auth_id to use a real unique constraint
-- ORDER: Run AFTER 002_workers_auth_and_jobs.sql
-- WHY:   002 created a partial unique index (WHERE auth_id IS NOT NULL).
--        Postgres requires a full unique constraint (not a partial index)
--        for ON CONFLICT upserts to work. This replaces it.
-- ============================================================

-- Drop the partial index created in migration 002
drop index if exists idx_workers_auth_id;

-- Add a proper unique constraint
alter table workers
  add constraint workers_auth_id_key unique (auth_id);
