-- ============================================================
-- Society Helper — Complete Schema v6 (consolidated)
-- ONE FILE. Run this once on a fresh Supabase project.
-- Supabase Dashboard → SQL Editor → New query → Run
-- All prior migrations (002–007) and the profiles↔workers
-- recursion fix are folded into this file.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
create type worker_specialty    as enum ('cook','cleaner','car_washer','caretaker','gardener','maid','other');
create type user_role           as enum ('resident','admin','worker');
create type engagement_status   as enum ('active','paused','terminated');
create type attendance_status   as enum ('present','absent','half_day','leave');
create type payment_status      as enum ('initiated','completed','failed','disputed');
create type job_status          as enum ('open','filled','expired','cancelled');
create type application_status  as enum ('pending','accepted','rejected','withdrawn');
create type hire_request_status as enum ('pending','accepted','declined','cancelled');
create type notification_type   as enum (
  'job_application','application_accepted','application_rejected',
  'hire_request','hire_accepted','hire_declined',
  'new_message','review_received'
);

-- ============================================================
-- CORE TABLES
-- ============================================================

create table societies (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  city       text,
  created_at timestamptz default now()
);

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  phone       text unique,
  full_name   text,
  flat_number text,
  society_id  uuid references societies(id),
  role        user_role default 'resident',
  upi_id      text,
  created_at  timestamptz default now()
);

create table workers (
  id               uuid primary key default uuid_generate_v4(),
  auth_id          uuid unique references auth.users(id) on delete set null,
  phone            text unique not null,
  full_name        text not null,
  specialty        worker_specialty not null,
  bio              text,
  experience_years int default 0,
  monthly_rate     numeric(10,2),
  daily_rate       numeric(10,2),
  trust_score      numeric(3,2) default 3.0 check (trust_score between 0 and 5),
  photo_url        text,
  upi_id           text,
  society_id       uuid references societies(id),
  is_active        boolean default true,
  is_available     boolean default true,
  created_at       timestamptz default now()
);
create index idx_workers_society   on workers(society_id);
create index idx_workers_specialty on workers(specialty);
create index idx_workers_auth      on workers(auth_id);

create table engagements (
  id             uuid primary key default uuid_generate_v4(),
  employer_id    uuid not null references profiles(id) on delete cascade,
  worker_id      uuid not null references workers(id) on delete restrict,
  service_type   text,
  monthly_salary numeric(10,2) not null,
  start_date     date default current_date,
  end_date       date,
  status         engagement_status default 'active',
  hire_request_id    uuid,
  job_application_id uuid,
  created_at     timestamptz default now(),
  unique (employer_id, worker_id, start_date)
);
create index idx_eng_employer on engagements(employer_id);
create index idx_eng_worker   on engagements(worker_id);

create table attendance (
  id            uuid primary key default uuid_generate_v4(),
  engagement_id uuid not null references engagements(id) on delete cascade,
  date          date not null,
  status        attendance_status not null,
  notes         text,
  marked_by     uuid references profiles(id),
  created_at    timestamptz default now(),
  unique (engagement_id, date)
);
create index idx_att_eng_date on attendance(engagement_id, date desc);

create table payments (
  id            uuid primary key default uuid_generate_v4(),
  engagement_id uuid not null references engagements(id),
  amount        numeric(10,2) not null,
  period_start  date not null,
  period_end    date not null,
  days_worked   numeric(5,1) not null,
  nodal_vpa     text not null,
  upi_txn_ref   text,
  utr           text,
  status        payment_status default 'initiated',
  initiated_by  uuid references profiles(id),
  created_at    timestamptz default now()
);
create index idx_pay_eng on payments(engagement_id);

-- ============================================================
-- JOB MARKETPLACE
-- ============================================================

create table job_postings (
  id             uuid primary key default uuid_generate_v4(),
  society_id     uuid references societies(id),
  employer_id    uuid not null references profiles(id) on delete cascade,
  specialty      worker_specialty not null,
  title          text not null,
  description    text not null,
  schedule       text,
  offered_salary numeric(10,2),
  status         job_status default 'open',
  expires_at     timestamptz default (now() + interval '7 days'),
  filled_at      timestamptz,
  created_at     timestamptz default now()
);
create index idx_jobpost_society  on job_postings(society_id);
create index idx_jobpost_employer on job_postings(employer_id);
create index idx_jobpost_status   on job_postings(status);

create table job_applications (
  id             uuid primary key default uuid_generate_v4(),
  job_posting_id uuid not null references job_postings(id) on delete cascade,
  worker_id      uuid not null references workers(id) on delete cascade,
  cover_note     text,
  status         application_status default 'pending',
  applied_at     timestamptz default now(),
  resolved_at    timestamptz,
  unique (job_posting_id, worker_id)
);
create index idx_jobapp_posting on job_applications(job_posting_id);
create index idx_jobapp_worker  on job_applications(worker_id);

create table hire_requests (
  id             uuid primary key default uuid_generate_v4(),
  resident_id    uuid not null references profiles(id) on delete cascade,
  worker_id      uuid not null references workers(id) on delete cascade,
  message        text,
  offered_salary numeric(10,2),
  status         hire_request_status default 'pending',
  created_at     timestamptz default now(),
  resolved_at    timestamptz
);
create index idx_hirereq_resident on hire_requests(resident_id);
create index idx_hirereq_worker   on hire_requests(worker_id);

-- Back-references from engagements
alter table engagements
  add constraint fk_eng_hire_request
    foreign key (hire_request_id) references hire_requests(id) on delete set null;
alter table engagements
  add constraint fk_eng_job_application
    foreign key (job_application_id) references job_applications(id) on delete set null;

-- ============================================================
-- CHAT
-- ============================================================

create table conversations (
  id                 uuid primary key default uuid_generate_v4(),
  resident_id        uuid not null references profiles(id) on delete cascade,
  worker_id          uuid not null references workers(id) on delete cascade,
  hire_request_id    uuid references hire_requests(id) on delete set null,
  job_application_id uuid references job_applications(id) on delete set null,
  last_message_at    timestamptz default now(),
  created_at         timestamptz default now(),
  unique (resident_id, worker_id)
);
create index idx_conv_resident on conversations(resident_id);
create index idx_conv_worker   on conversations(worker_id);

create table messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references auth.users(id) on delete cascade,
  content         text not null,
  is_read         boolean default false,
  created_at      timestamptz default now()
);
create index idx_msg_conv   on messages(conversation_id, created_at desc);
create index idx_msg_unread on messages(conversation_id, is_read) where not is_read;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

create table notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       notification_type not null,
  title      text not null,
  body       text,
  payload    jsonb default '{}',
  is_read    boolean default false,
  created_at timestamptz default now()
);
create index idx_notif_user   on notifications(user_id, created_at desc);
create index idx_notif_unread on notifications(user_id, is_read) where not is_read;

-- ============================================================
-- REVIEWS
-- ============================================================

create table reviews (
  id            uuid primary key default uuid_generate_v4(),
  engagement_id uuid not null references engagements(id) on delete cascade,
  reviewer_id   uuid not null references profiles(id) on delete cascade,
  worker_id     uuid not null references workers(id) on delete cascade,
  rating        int not null check (rating between 1 and 5),
  comment       text,
  created_at    timestamptz default now(),
  unique (engagement_id, reviewer_id)
);
create index idx_review_worker on reviews(worker_id);

-- ============================================================
-- HELPER VIEW: current-month dues
-- ============================================================
create or replace view v_current_dues as
select
  e.id                                                                      as engagement_id,
  e.employer_id,
  e.worker_id,
  e.monthly_salary,
  date_trunc('month', current_date)::date                                   as period_start,
  (date_trunc('month', current_date) + interval '1 month - 1 day')::date   as period_end,
  coalesce(sum(case a.status
    when 'present'  then 1
    when 'half_day' then 0.5
    else 0 end), 0)                                                         as days_worked,
  extract(day from
    (date_trunc('month', current_date) + interval '1 month - 1 day'))::int as days_in_month
from engagements e
left join attendance a
       on a.engagement_id = e.id
      and a.date >= date_trunc('month', current_date)
where e.status = 'active'
group by e.id;

-- ============================================================
-- HELPER FUNCTIONS (defined BEFORE policies that use them)
-- ============================================================

-- Used by RLS policies to get the current user's society_id
-- SECURITY DEFINER bypasses RLS on the profiles table inside the function,
-- which prevents infinite recursion when policies on profiles reference profiles.
create or replace function public.my_society_id()
returns uuid language sql security definer set search_path = public stable as $$
  select society_id from public.profiles where id = auth.uid()
$$;

-- Is the current user an admin? SECURITY DEFINER bypasses RLS to avoid recursion
-- when called from policies that protect the workers table.
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- Resident ids the current worker shares a conversation with. SECURITY DEFINER
-- avoids the profiles→workers→profiles recursion that arises when a profiles
-- policy queries workers directly.
create or replace function public.worker_conversation_resident_ids()
returns setof uuid language sql security definer set search_path = public stable as $$
  select c.resident_id
  from public.conversations c
  join public.workers w on w.id = c.worker_id
  where w.auth_id = auth.uid()
$$;

-- Check email existence without OTP side-effect (used by login page)
create or replace function public.email_exists(check_email text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  return exists (
    select 1 from auth.users where email = lower(trim(check_email))
  );
end;
$$;
grant execute on function public.email_exists(text) to anon, authenticated;

-- Unread counts for nav badge
create or replace function public.get_unread_counts()
returns table (notifications int, messages int)
language plpgsql security definer set search_path = public as $$
begin
  return query
  select
    (select count(*)::int from notifications
     where user_id = auth.uid() and not is_read)          as notifications,
    (select count(*)::int from messages m
     join conversations c on c.id = m.conversation_id
     where (c.resident_id = auth.uid()
            or c.worker_id in (select id from workers where auth_id = auth.uid()))
       and m.sender_id != auth.uid()
       and not m.is_read)                                  as messages;
end;
$$;
grant execute on function public.get_unread_counts() to authenticated;

-- ============================================================
-- GRANTS — required after a `drop schema public cascade` reset.
-- Supabase's default privileges are wiped when the schema is
-- recreated, so anon/authenticated end up without SQL access.
-- These grants restore that. RLS still enforces row-level rules.
-- ============================================================
grant usage on schema public to anon, authenticated, service_role;
grant all   on all tables    in schema public to anon, authenticated, service_role;
grant all   on all sequences in schema public to anon, authenticated, service_role;
grant all   on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table societies        enable row level security;
alter table profiles         enable row level security;
alter table workers          enable row level security;
alter table engagements      enable row level security;
alter table attendance       enable row level security;
alter table payments         enable row level security;
alter table job_postings     enable row level security;
alter table job_applications enable row level security;
alter table hire_requests    enable row level security;
alter table conversations    enable row level security;
alter table messages         enable row level security;
alter table notifications    enable row level security;
alter table reviews          enable row level security;

-- ── societies ──
create policy "societies_read" on societies
  for select using (auth.uid() is not null);
-- Workers (and any auth user) can read their own society via member-link.
create policy "societies_member_read" on societies
  for select using (
    id = public.my_society_id()
  );

-- ── profiles ──
-- Self: full access to own row
create policy "profiles_self_select" on profiles
  for select using (auth.uid() = id);
create policy "profiles_self_insert" on profiles
  for insert with check (auth.uid() = id);
create policy "profiles_self_update" on profiles
  for update using (auth.uid() = id);

-- Workers can read profiles of residents they share a conversation with (chat display).
-- Uses a SECURITY DEFINER helper so the workers/conversations lookup does NOT re-enter
-- the workers RLS chain (which would query profiles and recurse).
create policy "profiles_conversation_read" on profiles
  for select using (
    id in (select public.worker_conversation_resident_ids())
  );

-- ── workers ──
create policy "workers_society_read" on workers
  for select using (
    society_id = public.my_society_id()
  );
-- Workers can insert their own row during onboarding.
create policy "workers_self_insert" on workers
  for insert with check (auth_id = auth.uid());
create policy "workers_self_update" on workers
  for update using (auth_id = auth.uid());
-- Admin override via SECURITY DEFINER helper (avoids profiles↔workers recursion).
create policy "workers_admin_all" on workers
  for all using (public.is_admin());

-- ── engagements ──
create policy "engagements_employer_all" on engagements
  for all
  using      (auth.uid() = employer_id)
  with check (auth.uid() = employer_id);
create policy "engagements_worker_read" on engagements
  for select using (
    worker_id in (select id from workers where auth_id = auth.uid())
  );

-- ── attendance ──
create policy "attendance_employer_all" on attendance
  for all
  using      (engagement_id in (select id from engagements where employer_id = auth.uid()))
  with check (engagement_id in (select id from engagements where employer_id = auth.uid()));
create policy "attendance_worker_read" on attendance
  for select using (
    engagement_id in (
      select e.id from engagements e
      join workers w on w.id = e.worker_id
      where w.auth_id = auth.uid()
    )
  );

-- ── payments ──
create policy "payments_employer_all" on payments
  for all
  using      (engagement_id in (select id from engagements where employer_id = auth.uid()))
  with check (engagement_id in (select id from engagements where employer_id = auth.uid()));
create policy "payments_worker_read" on payments
  for select using (
    engagement_id in (
      select e.id from engagements e
      join workers w on w.id = e.worker_id
      where w.auth_id = auth.uid()
    )
  );

-- ── job_postings ──
create policy "jobpost_society_read" on job_postings
  for select using (society_id = public.my_society_id());
create policy "jobpost_employer_all" on job_postings
  for all
  using      (auth.uid() = employer_id)
  with check (auth.uid() = employer_id);

-- ── job_applications ──
create policy "jobapp_worker_all" on job_applications
  for all
  using      (worker_id in (select id from workers where auth_id = auth.uid()))
  with check (worker_id in (select id from workers where auth_id = auth.uid()));
create policy "jobapp_employer_read" on job_applications
  for select using (
    job_posting_id in (select id from job_postings where employer_id = auth.uid())
  );
create policy "jobapp_employer_update" on job_applications
  for update using (
    job_posting_id in (select id from job_postings where employer_id = auth.uid())
  );

-- ── hire_requests ──
create policy "hirereq_resident_all" on hire_requests
  for all
  using      (auth.uid() = resident_id)
  with check (auth.uid() = resident_id);
create policy "hirereq_worker_read" on hire_requests
  for select using (
    worker_id in (select id from workers where auth_id = auth.uid())
  );
create policy "hirereq_worker_update" on hire_requests
  for update using (
    worker_id in (select id from workers where auth_id = auth.uid())
  );

-- ── conversations ──
create policy "conv_participant_all" on conversations
  for all using (
    auth.uid() = resident_id
    or worker_id in (select id from workers where auth_id = auth.uid())
  );

-- ── messages ──
create policy "msg_participant_all" on messages
  for all using (
    conversation_id in (
      select id from conversations
      where resident_id = auth.uid()
         or worker_id in (select id from workers where auth_id = auth.uid())
    )
  );

-- ── notifications ──
create policy "notif_own_all" on notifications
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── reviews ──
create policy "reviews_society_read" on reviews
  for select using (
    worker_id in (
      select id from workers where society_id = public.my_society_id()
    )
  );
create policy "reviews_employer_insert" on reviews
  for insert with check (auth.uid() = reviewer_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile row when a new auth user is created
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Keep conversation.last_message_at up to date
create or replace function public.update_conversation_timestamp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update conversations set last_message_at = now() where id = new.conversation_id;
  return new;
end;
$$;

create trigger on_new_message_ts
  after insert on messages
  for each row execute procedure public.update_conversation_timestamp();

-- Recalculate trust_score when a review is added
create or replace function public.update_worker_trust_score()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update workers
  set trust_score = (
    select round(avg(rating)::numeric, 2)
    from reviews where worker_id = new.worker_id
  )
  where id = new.worker_id;
  return new;
end;
$$;

create trigger on_review_insert
  after insert on reviews
  for each row execute procedure public.update_worker_trust_score();

-- ============================================================
-- NOTIFICATION TRIGGERS
-- ============================================================

-- Resident notified when worker applies to their job
create or replace function public.notify_job_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_employer_id uuid;
  v_worker_name text;
  v_job_title   text;
begin
  select jp.employer_id, jp.title into v_employer_id, v_job_title
  from job_postings jp where jp.id = new.job_posting_id;
  select full_name into v_worker_name from workers where id = new.worker_id;
  insert into notifications (user_id, type, title, body, payload)
  values (v_employer_id, 'job_application',
          v_worker_name || ' applied to your job', v_job_title,
          jsonb_build_object('job_posting_id', new.job_posting_id,
                             'job_application_id', new.id,
                             'worker_id', new.worker_id));
  return new;
end;
$$;
create trigger on_job_application
  after insert on job_applications
  for each row execute procedure public.notify_job_application();

-- Worker notified when their application is accepted or rejected
create or replace function public.notify_application_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_worker_auth uuid;
  v_job_title   text;
  v_type        notification_type;
  v_title       text;
begin
  if new.status = old.status then return new; end if;
  if new.status not in ('accepted','rejected') then return new; end if;
  select w.auth_id into v_worker_auth from workers w where w.id = new.worker_id;
  select jp.title into v_job_title from job_postings jp where jp.id = new.job_posting_id;
  if new.status = 'accepted' then
    v_type  := 'application_accepted';
    v_title := 'Your application was accepted!';
  else
    v_type  := 'application_rejected';
    v_title := 'Application update for ' || v_job_title;
  end if;
  if v_worker_auth is not null then
    insert into notifications (user_id, type, title, body, payload)
    values (v_worker_auth, v_type, v_title, v_job_title,
            jsonb_build_object('job_application_id', new.id,
                               'job_posting_id', new.job_posting_id));
  end if;
  return new;
end;
$$;
create trigger on_application_status
  after update on job_applications
  for each row execute procedure public.notify_application_status();

-- Worker notified when a resident sends a hire request
create or replace function public.notify_hire_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_worker_auth uuid;
  v_res_name    text;
begin
  select w.auth_id into v_worker_auth from workers w where w.id = new.worker_id;
  select p.full_name into v_res_name from profiles p where p.id = new.resident_id;
  if v_worker_auth is not null then
    insert into notifications (user_id, type, title, body, payload)
    values (v_worker_auth, 'hire_request',
            v_res_name || ' wants to hire you', new.message,
            jsonb_build_object('hire_request_id', new.id,
                               'resident_id', new.resident_id));
  end if;
  return new;
end;
$$;
create trigger on_hire_request
  after insert on hire_requests
  for each row execute procedure public.notify_hire_request();

-- Resident notified when worker responds to hire request
create or replace function public.notify_hire_response()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_worker_name text;
  v_type        notification_type;
  v_title       text;
begin
  if new.status = old.status then return new; end if;
  if new.status not in ('accepted','declined') then return new; end if;
  select full_name into v_worker_name from workers where id = new.worker_id;
  if new.status = 'accepted' then
    v_type  := 'hire_accepted';
    v_title := v_worker_name || ' accepted your hire request!';
  else
    v_type  := 'hire_declined';
    v_title := v_worker_name || ' declined your hire request';
  end if;
  insert into notifications (user_id, type, title, body, payload)
  values (new.resident_id, v_type, v_title, null,
          jsonb_build_object('hire_request_id', new.id,
                             'worker_id', new.worker_id));
  return new;
end;
$$;
create trigger on_hire_response
  after update on hire_requests
  for each row execute procedure public.notify_hire_response();

-- Both parties notified on new chat message
create or replace function public.notify_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_conv        conversations%rowtype;
  v_sender_name text;
  v_recipient   uuid;
  v_worker_auth uuid;
begin
  select * into v_conv from conversations where id = new.conversation_id;
  select coalesce(p.full_name, 'Someone') into v_sender_name
  from profiles p where p.id = new.sender_id;
  if v_sender_name = 'Someone' then
    select coalesce(w.full_name, 'Someone') into v_sender_name
    from workers w where w.auth_id = new.sender_id;
  end if;
  select w.auth_id into v_worker_auth from workers w where w.id = v_conv.worker_id;
  if new.sender_id = v_conv.resident_id then
    v_recipient := v_worker_auth;
  else
    v_recipient := v_conv.resident_id;
  end if;
  if v_recipient is not null and v_recipient != new.sender_id then
    insert into notifications (user_id, type, title, body, payload)
    values (v_recipient, 'new_message',
            'New message from ' || v_sender_name, left(new.content, 100),
            jsonb_build_object('conversation_id', new.conversation_id));
  end if;
  return new;
end;
$$;
create trigger on_new_message_notify
  after insert on messages
  for each row execute procedure public.notify_new_message();
