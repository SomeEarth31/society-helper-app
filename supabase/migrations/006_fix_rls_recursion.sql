-- ============================================================
-- Migration 006 — Fix infinite recursion in RLS policies
-- ORDER: Run AFTER 004_worker_rls_fixes.sql
-- HOW:   Supabase Dashboard → SQL Editor → paste → Run
-- WHY:   004 added a profiles policy that queries workers, but
--        workers_society_read queries profiles — creating a loop.
--        Fix: use a security definer function to get the caller's
--        society_id without triggering RLS, breaking the cycle.
-- ============================================================

-- 1. Helper function — reads profiles bypassing RLS (security definer)
--    so policies can call it without recursing.
create or replace function public.my_society_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select society_id from profiles where id = auth.uid()
$$;

-- 2. Recreate workers_society_read using the function instead of a
--    direct subquery on profiles (which caused the recursion).
drop policy if exists "workers_society_read" on workers;
create policy "workers_society_read" on workers
  for select using (
    society_id = my_society_id()
  );

-- 3. Drop the problematic policy added in 004 — it queried workers
--    from a profiles policy, completing the cycle.
--    Worker dashboards don't need to read employer profiles directly yet.
drop policy if exists "profiles_employer_read_by_worker" on profiles;
