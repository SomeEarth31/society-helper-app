-- ============================================================
-- Society Helper Directory & Ledger — Supabase Schema
-- Target: Postgres 15 (Supabase free tier)
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- ENUMS ----------
create type worker_specialty   as enum ('cook','cleaner','car_washer','caretaker','gardener','maid','other');
create type user_role          as enum ('resident','admin','worker');
create type engagement_status  as enum ('active','paused','terminated');
create type attendance_status  as enum ('present','absent','half_day','leave');
create type payment_status     as enum ('initiated','completed','failed','disputed');

-- ============================================================
-- TABLES
-- ============================================================

-- Multi-tenant root. One row per residential society.
create table societies (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  city        text,
  created_at  timestamptz default now()
);

-- Extends auth.users (auto-populated by trigger below).
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  phone        text unique,
  full_name    text,
  flat_number  text,
  society_id   uuid references societies(id),
  role         user_role default 'resident',
  upi_id       text,                 -- payer VPA (informational)
  created_at   timestamptz default now()
);

-- The discoverable directory of helpers.
create table workers (
  id                uuid primary key default uuid_generate_v4(),
  phone             text unique not null,
  full_name         text not null,
  specialty         worker_specialty not null,
  bio               text,
  experience_years  int default 0,
  monthly_rate      numeric(10,2),                        -- asking rate
  trust_score       numeric(3,2) default 3.0
                    check (trust_score between 0 and 5),
  photo_url         text,
  upi_id            text,                                  -- worker's VPA
  society_id        uuid references societies(id),
  is_active         boolean default true,
  created_at        timestamptz default now()
);
create index idx_workers_society   on workers(society_id);
create index idx_workers_specialty on workers(specialty);

-- An employer-worker contract. The "Hire" action inserts here.
create table engagements (
  id              uuid primary key default uuid_generate_v4(),
  employer_id     uuid not null references profiles(id) on delete cascade,
  worker_id       uuid not null references workers(id)  on delete restrict,
  service_type    text,                                   -- e.g. 'cooking_dinner'
  monthly_salary  numeric(10,2) not null,
  start_date      date default current_date,
  end_date        date,
  status          engagement_status default 'active',
  created_at      timestamptz default now(),
  unique (employer_id, worker_id, start_date)
);
create index idx_eng_employer on engagements(employer_id);
create index idx_eng_worker   on engagements(worker_id);

-- One row per engagement per day. The ledger of truth.
create table attendance (
  id             uuid primary key default uuid_generate_v4(),
  engagement_id  uuid not null references engagements(id) on delete cascade,
  date           date not null,
  status         attendance_status not null,
  notes          text,
  marked_by      uuid references profiles(id),
  created_at     timestamptz default now(),
  unique (engagement_id, date)
);
create index idx_att_eng_date on attendance(engagement_id, date desc);

-- Salary settlement events. One row per UPI deep-link click.
create table payments (
  id             uuid primary key default uuid_generate_v4(),
  engagement_id  uuid not null references engagements(id),
  amount         numeric(10,2) not null,
  period_start   date not null,
  period_end     date not null,
  days_worked    numeric(5,1) not null,
  nodal_vpa      text not null,                            -- VPA used in deep link
  upi_txn_ref    text,                                     -- UTR pasted post-success
  status         payment_status default 'initiated',
  initiated_by   uuid references profiles(id),
  created_at     timestamptz default now()
);
create index idx_pay_eng on payments(engagement_id);

-- ============================================================
-- HELPER VIEW: current-month dues per active engagement
-- ============================================================
create or replace view v_current_dues as
select
  e.id                                                                    as engagement_id,
  e.employer_id,
  e.worker_id,
  e.monthly_salary,
  date_trunc('month', current_date)::date                                  as period_start,
  (date_trunc('month', current_date) + interval '1 month - 1 day')::date   as period_end,
  coalesce(sum(case a.status
    when 'present'  then 1
    when 'half_day' then 0.5
    else 0 end), 0)                                                        as days_worked,
  extract(day from (date_trunc('month', current_date) + interval '1 month - 1 day'))::int
                                                                           as days_in_month
from engagements e
left join attendance a
       on a.engagement_id = e.id
      and a.date >= date_trunc('month', current_date)
where e.status = 'active'
group by e.id;

-- ============================================================
-- ROW LEVEL SECURITY  (Supabase enforces these on every query)
-- ============================================================
alter table societies   enable row level security;
alter table profiles    enable row level security;
alter table workers     enable row level security;
alter table engagements enable row level security;
alter table attendance  enable row level security;
alter table payments    enable row level security;

-- societies: any signed-in user can read
create policy "societies_read" on societies
  for select using (auth.uid() is not null);

-- profiles: user owns their own row
create policy "profiles_self_select" on profiles
  for select using (auth.uid() = id);
create policy "profiles_self_update" on profiles
  for update using (auth.uid() = id);
create policy "profiles_self_insert" on profiles
  for insert with check (auth.uid() = id);

-- workers: visible to anyone in the same society
create policy "workers_society_read" on workers
  for select using (
    society_id in (select society_id from profiles where id = auth.uid())
  );
-- admin can mutate workers
create policy "workers_admin_all" on workers
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- engagements: only the employer
create policy "engagements_owner_all" on engagements
  for all
  using       (auth.uid() = employer_id)
  with check  (auth.uid() = employer_id);

-- attendance: only the engagement's employer (or the worker, future use)
create policy "attendance_owner_all" on attendance
  for all
  using       (engagement_id in (select id from engagements where employer_id = auth.uid()))
  with check  (engagement_id in (select id from engagements where employer_id = auth.uid()));

-- payments: only the engagement's employer
create policy "payments_owner_all" on payments
  for all
  using       (engagement_id in (select id from engagements where employer_id = auth.uid()))
  with check  (engagement_id in (select id from engagements where employer_id = auth.uid()));

-- ============================================================
-- TRIGGER: auto-create profile when auth.users row is inserted
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, phone) values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
