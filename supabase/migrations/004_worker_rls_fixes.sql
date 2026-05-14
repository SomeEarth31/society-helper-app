-- ============================================================
-- Migration 004 — Fix worker RLS gaps
-- ORDER: Run AFTER 002_workers_auth_and_jobs.sql
-- HOW:   Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================

-- 1. Allow a worker to INSERT their own row during onboarding.
--    (Previously only admins could insert into workers.)
drop policy if exists "workers_self_insert" on workers;
create policy "workers_self_insert" on workers
  for insert
  with check (auth_id = auth.uid());

-- 2. Allow workers to read profiles of employers who hired them.
--    Needed so worker dashboards can show employer name/flat info.
drop policy if exists "profiles_employer_read_by_worker" on profiles;
create policy "profiles_employer_read_by_worker" on profiles
  for select using (
    id in (
      select employer_id from engagements e
      join workers w on w.id = e.worker_id
      where w.auth_id = auth.uid()
    )
  );

-- 3. Allow workers to read society info for their own society.
drop policy if exists "societies_member_read" on societies;
create policy "societies_member_read" on societies
  for select using (
    id in (select society_id from profiles where id = auth.uid())
  );
