-- ============================================================
-- Migration 007 — email_exists helper function
-- PURPOSE: Lets the client check if an email is already
--          registered WITHOUT any side-effects (no OTP sent).
--          Used by the login page for smart routing:
--            • login email step  → unknown email → go to signup
--            • signup email step → known email   → go to sign-in
-- ============================================================

create or replace function public.email_exists(check_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from auth.users
    where email = lower(trim(check_email))
  );
end;
$$;

-- Allow anonymous and authenticated callers
grant execute on function public.email_exists(text) to anon, authenticated;
