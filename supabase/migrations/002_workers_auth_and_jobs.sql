-- ============================================================
-- Migration 002 — Worker auth, job postings, RLS updates
-- ORDER: Run AFTER schema.sql
-- HOW:   Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================

-- ---------- 1. Worker identity: link workers to auth.users ----------
alter table workers
  add column if not exists auth_id uuid references auth.users(id) on delete set null,
  add column if not exists daily_rate numeric(10,2);

create unique index if not exists idx_workers_auth_id on workers(auth_id) where auth_id is not null;

-- ---------- 1b. Backfill: derive daily_rate from monthly_rate when null ----------
update workers
   set daily_rate = round(monthly_rate / 26.0, 2)
 where daily_rate is null and monthly_rate is not null;

-- ---------- 1c. Payments: add `utr` alias column the app already reads ----------
alter table payments
  add column if not exists utr text;

-- ---------- 2. Job Postings ----------
do $$ begin
  create type job_status as enum ('open','filled','closed');
exception when duplicate_object then null;
end $$;

create table if not exists job_postings (
  id              uuid primary key default uuid_generate_v4(),
  society_id      uuid not null references societies(id) on delete cascade,
  employer_id     uuid not null references profiles(id) on delete cascade,
  specialty       worker_specialty not null,
  description     text,
  offered_salary  numeric(10,2),
  status          job_status default 'open',
  created_at      timestamptz default now()
);
create index if not exists idx_jobs_society   on job_postings(society_id);
create index if not exists idx_jobs_specialty on job_postings(specialty);
create index if not exists idx_jobs_status    on job_postings(status);

alter table job_postings enable row level security;

-- ---------- 3. RLS — extend so workers can read what they need ----------

-- Job postings: any signed-in member of the same society can read open jobs.
drop policy if exists "jobs_society_read" on job_postings;
create policy "jobs_society_read" on job_postings
  for select using (
    society_id in (select society_id from profiles where id = auth.uid())
  );

-- Employer owns their own postings.
drop policy if exists "jobs_employer_all" on job_postings;
create policy "jobs_employer_all" on job_postings
  for all
  using       (auth.uid() = employer_id)
  with check  (auth.uid() = employer_id);

-- Workers can read their own engagements (in addition to existing employer policy).
drop policy if exists "engagements_worker_read" on engagements;
create policy "engagements_worker_read" on engagements
  for select using (
    worker_id in (select id from workers where auth_id = auth.uid())
  );

-- Workers can read their own attendance.
drop policy if exists "attendance_worker_read" on attendance;
create policy "attendance_worker_read" on attendance
  for select using (
    engagement_id in (
      select e.id from engagements e
      join workers w on w.id = e.worker_id
      where w.auth_id = auth.uid()
    )
  );

-- Workers can read payments made to them.
drop policy if exists "payments_worker_read" on payments;
create policy "payments_worker_read" on payments
  for select using (
    engagement_id in (
      select e.id from engagements e
      join workers w on w.id = e.worker_id
      where w.auth_id = auth.uid()
    )
  );

-- Workers can update their own worker row (bio, daily_rate, upi_id, photo_url).
drop policy if exists "workers_self_update" on workers;
create policy "workers_self_update" on workers
  for update
  using      (auth_id = auth.uid())
  with check (auth_id = auth.uid());
