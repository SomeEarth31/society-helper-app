-- ============================================================
-- Migration 003 — delete_own_account helper function
-- ORDER: Run AFTER 002_workers_auth_and_jobs.sql
-- HOW:   Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================

-- Allows a signed-in user to permanently delete their own account.
-- security definer so the function can touch auth.users on behalf of the caller.
-- Cascades: auth.users → profiles (on delete cascade) → engagements, etc.
-- For workers: sets is_active = false first so the directory listing disappears
-- immediately (the workers row itself gets auth_id nulled by on delete set null).

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Deactivate worker listing so they vanish from the directory instantly
  update workers
     set is_active = false
   where auth_id = auth.uid();

  -- Delete the auth user — cascades to profiles row
  delete from auth.users where id = auth.uid();
end;
$$;

-- Only the authenticated user can call this (not anon)
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
