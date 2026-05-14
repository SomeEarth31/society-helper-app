-- ============================================================
-- SOCIETY HELPER — DEMO DATA SEED  (v3: two worker test accounts)
-- ============================================================
-- Populates your account with realistic test data.
--
-- ╔══════════════════════════════════════════════════════════╗
-- ║  HOW TO RUN                                              ║
-- ║  1. Supabase Dashboard → SQL Editor → New query          ║
-- ║  2. Paste this whole file and click "Run"                ║
-- ║                                                          ║
-- ║  HOW TO REMOVE                                           ║
-- ║  Run cleanup_demo_data.sql                               ║
-- ╚══════════════════════════════════════════════════════════╝
--
-- TEST ACCOUNTS (created by this seed):
--   Resident (your account): samarth.2kumar@gmail.com
--   Worker 1 (demo):         worker@test.com       / password123
--   Worker 2 (your iitk):   samarthk21@iitk.ac.in / password123
--
-- Worker 2 (samarthk21@iitk.ac.in) is:
--   • Specialty: cook
--   • Hired by samarth.2kumar@gmail.com
--   • Has attendance for current month (mostly present)
--   • Has a completed payment this month → earnings show up on worker dashboard
--
-- Idempotent: re-running upserts by fixed UUIDs.
-- ============================================================

DO $$
DECLARE
  v_user_email   text := 'samarth.2kumar@gmail.com';
  v_user_id      uuid;
  v_society_id   uuid;
  v_month_start  date := date_trunc('month', now())::date;

  -- Worker 1: worker@test.com (linked to Lakshmi Devi)
  v_worker1_auth_id uuid := '33333333-3333-3333-3333-000000000001';
  v_worker1_email   text := 'worker@test.com';

  -- Worker 2: samarthk21@iitk.ac.in (cook, hired by resident)
  v_worker2_auth_id uuid := '33333333-3333-3333-3333-000000000002';
  v_worker2_email   text := 'samarthk21@iitk.ac.in';

  -- Worker UUIDs
  w_lakshmi  uuid := '11111111-1111-1111-1111-000000000001';
  w_ramesh   uuid := '11111111-1111-1111-1111-000000000002';
  w_priya    uuid := '11111111-1111-1111-1111-000000000003';
  w_arjun    uuid := '11111111-1111-1111-1111-000000000004';
  w_meera    uuid := '11111111-1111-1111-1111-000000000005';
  w_suresh   uuid := '11111111-1111-1111-1111-000000000006';
  w_anita    uuid := '11111111-1111-1111-1111-000000000007';
  w_imran    uuid := '11111111-1111-1111-1111-000000000008';
  w_geeta    uuid := '11111111-1111-1111-1111-000000000009';
  w_vikram   uuid := '11111111-1111-1111-1111-000000000010';
  w_sunita   uuid := '11111111-1111-1111-1111-000000000011';
  w_arif     uuid := '11111111-1111-1111-1111-000000000012';
  w_kavita   uuid := '11111111-1111-1111-1111-000000000013';
  w_manoj    uuid := '11111111-1111-1111-1111-000000000014';
  w_pooja    uuid := '11111111-1111-1111-1111-000000000015';
  -- Worker 2's directory row
  w_samarth_iitk uuid := '11111111-1111-1111-1111-000000000020';

  -- Engagement UUIDs
  e_lakshmi      uuid := '22222222-2222-2222-2222-000000000001';
  e_ramesh       uuid := '22222222-2222-2222-2222-000000000002';
  e_samarth_iitk uuid := '22222222-2222-2222-2222-000000000003';

  -- Payment UUIDs
  p_old         uuid := '33333333-3333-3333-3333-000000000010';
  p_recent      uuid := '33333333-3333-3333-3333-000000000011';
  p_iitk_month  uuid := '33333333-3333-3333-3333-000000000013';
  p_completed   uuid := '33333333-3333-3333-3333-000000000012';

  -- Job posting UUIDs
  j_maid   uuid := '44444444-4444-4444-4444-000000000001';
  j_cook   uuid := '44444444-4444-4444-4444-000000000002';
  j_car    uuid := '44444444-4444-4444-4444-000000000003';
  j_garden uuid := '44444444-4444-4444-4444-000000000004';
BEGIN

  -- ──────────────────────────────────────────────────────────
  -- 1. Resolve the resident auth user.
  -- ──────────────────────────────────────────────────────────
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_user_email LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION
      'No auth.users row found for %. Log in once via the app first, then re-run this seed.',
      v_user_email;
  END IF;

  -- ──────────────────────────────────────────────────────────
  -- 2. Resident profile + society
  -- ──────────────────────────────────────────────────────────
  INSERT INTO profiles (id, full_name, flat_number, phone, role)
  VALUES (v_user_id, 'Samarth Kumar', 'A-204', '+919812345678', 'resident')
  ON CONFLICT (id) DO UPDATE SET
    full_name   = COALESCE(profiles.full_name,   EXCLUDED.full_name),
    flat_number = COALESCE(profiles.flat_number, EXCLUDED.flat_number),
    phone       = COALESCE(profiles.phone,       EXCLUDED.phone),
    role        = COALESCE(profiles.role,        EXCLUDED.role);

  SELECT society_id INTO v_society_id FROM profiles WHERE id = v_user_id;

  IF v_society_id IS NULL THEN
    v_society_id := '99999999-9999-9999-9999-000000000001';
    INSERT INTO societies (id, name, city)
    VALUES (v_society_id, '[DEMO] Sunrise Apartments', 'Bengaluru')
    ON CONFLICT (id) DO NOTHING;
    UPDATE profiles SET society_id = v_society_id WHERE id = v_user_id;
  END IF;

  -- ──────────────────────────────────────────────────────────
  -- 3. Worker 1 auth: worker@test.com / password123
  -- ──────────────────────────────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    v_worker1_auth_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    v_worker1_email,
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}', '{}',
    now(), now(), '', '', '', ''
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
    updated_at         = now();

  INSERT INTO profiles (id, full_name, phone, society_id, role)
  VALUES (v_worker1_auth_id, '[DEMO] Lakshmi Devi', '+919900000001', v_society_id, 'worker')
  ON CONFLICT (id) DO UPDATE SET
    full_name  = EXCLUDED.full_name,
    society_id = EXCLUDED.society_id,
    role       = EXCLUDED.role;

  -- ──────────────────────────────────────────────────────────
  -- 4. Worker 2 auth: samarthk21@iitk.ac.in / password123
  --    If the email already exists (real account), reuse that UUID.
  --    Only INSERT if the email is truly new.
  -- ──────────────────────────────────────────────────────────
  SELECT id INTO v_worker2_auth_id FROM auth.users WHERE email = v_worker2_email LIMIT 1;

  IF v_worker2_auth_id IS NULL THEN
    -- Brand-new email: insert with fixed UUID
    v_worker2_auth_id := '33333333-3333-3333-3333-000000000002';
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      v_worker2_auth_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      v_worker2_email,
      crypt('password123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}', '{}',
      now(), now(), '', '', '', ''
    );
  ELSE
    -- Email already exists — just update password to known value for testing
    UPDATE auth.users SET
      encrypted_password = crypt('password123', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at         = now()
    WHERE id = v_worker2_auth_id;
  END IF;

  INSERT INTO profiles (id, full_name, phone, society_id, role)
  VALUES (v_worker2_auth_id, 'Samarth K (Cook)', '+919900000020', v_society_id, 'worker')
  ON CONFLICT (id) DO UPDATE SET
    full_name  = EXCLUDED.full_name,
    society_id = EXCLUDED.society_id,
    role       = EXCLUDED.role;

  -- ──────────────────────────────────────────────────────────
  -- 5. Workers directory — 15 demo + Worker 2 row
  -- ──────────────────────────────────────────────────────────
  INSERT INTO workers
    (id, society_id, auth_id, full_name, phone, specialty,
     bio, experience_years, monthly_rate, daily_rate, trust_score, photo_url, upi_id)
  VALUES
    (w_lakshmi, v_society_id, v_worker1_auth_id,
       '[DEMO] Lakshmi Devi',  '+919900000001', 'maid',
       'Honest and punctual. 10+ years cleaning homes.', 12, 7000, 300, 4.8,
       'https://i.pravatar.cc/300?img=47', 'lakshmi@okhdfc'),

    (w_ramesh, v_society_id, null,
       '[DEMO] Ramesh Kumar',  '+919900000002', 'cook',
       'North & South Indian veg. Comfortable with Jain meals.', 8, 12000, 500, 4.6,
       'https://i.pravatar.cc/300?img=68', 'ramesh@okicici'),

    (w_priya, v_society_id, null,
       '[DEMO] Priya Sharma',  '+919900000003', 'caretaker',
       'Elder care + medication reminders.', 7, 15000, 600, 4.9,
       'https://i.pravatar.cc/300?img=44', 'priya@okaxis'),

    (w_arjun, v_society_id, null,
       '[DEMO] Arjun Singh',   '+919900000004', 'other',
       'Plumbing, electrical and minor repairs.', 10, 18000, 750, 4.4,
       'https://i.pravatar.cc/300?img=12', 'arjun@oksbi'),

    (w_meera, v_society_id, null,
       '[DEMO] Meera Patel',   '+919900000005', 'maid',
       'Quick and reliable, double-shift available.', 4, 6500, 280, 4.2,
       'https://i.pravatar.cc/300?img=23', 'meera@okhdfc'),

    (w_suresh, v_society_id, null,
       '[DEMO] Suresh Yadav',  '+919900000006', 'gardener',
       'Lawn, balcony plants, weekly pruning.', 9, 5500, 240, 4.0,
       'https://i.pravatar.cc/300?img=15', 'suresh@okicici'),

    (w_anita, v_society_id, null,
       '[DEMO] Anita Reddy',   '+919900000007', 'caretaker',
       'Live-in caretaker for elderly couples.', 15, 28000, 1100, 4.8,
       'https://i.pravatar.cc/300?img=32', 'anita@okaxis'),

    (w_imran, v_society_id, null,
       '[DEMO] Imran Khan',    '+919900000008', 'cook',
       'Mughlai, biryani, kebabs. Non-veg specialist.', 10, 18000, 750, 4.8,
       'https://i.pravatar.cc/300?img=51', 'imran@oksbi'),

    (w_geeta, v_society_id, null,
       '[DEMO] Geeta Kulkarni','+919900000009', 'cook',
       'Maharashtrian veg, tiffin-style lunchboxes.', 6, 13000, 550, 4.5,
       'https://i.pravatar.cc/300?img=10', 'geeta@okhdfc'),

    (w_vikram, v_society_id, null,
       '[DEMO] Vikram Das',    '+919900000010', 'car_washer',
       'Premium polish + interior detailing.', 5, 5500, 220, 4.6,
       'https://i.pravatar.cc/300?img=8',  'vikram@okicici'),

    (w_sunita, v_society_id, null,
       '[DEMO] Sunita Rao',    '+919900000011', 'gardener',
       'Indoor plants & terrace garden setup.', 4, 7000, 320, 4.4,
       'https://i.pravatar.cc/300?img=20', 'sunita@okaxis'),

    (w_arif, v_society_id, null,
       '[DEMO] Arif Sheikh',   '+919900000012', 'cleaner',
       'Move-in / move-out deep cleaning, crew of two.', 8, 11000, 480, 4.5,
       'https://i.pravatar.cc/300?img=33', 'arif@oksbi'),

    (w_kavita, v_society_id, null,
       '[DEMO] Kavita Joshi',  '+919900000013', 'maid',
       'Sweeping, mopping, dishes. Available mornings.', 3, 9500, 400, 4.3,
       'https://i.pravatar.cc/300?img=49', 'kavita@okhdfc'),

    (w_manoj, v_society_id, null,
       '[DEMO] Manoj Patel',   '+919900000014', 'car_washer',
       'Daily wash, weekly wax. Brings own supplies.', 4, 4500, 180, 4.4,
       'https://i.pravatar.cc/300?img=11', 'manoj@okicici'),

    (w_pooja, v_society_id, null,
       '[DEMO] Pooja Mishra',  '+919900000015', 'cleaner',
       'Deep cleaning — kitchen, bathrooms, sofas.', 5, 9000, 380, 4.6,
       'https://i.pravatar.cc/300?img=25', 'pooja@okaxis'),

    -- Worker 2: samarthk21@iitk.ac.in → cook, hired by the resident
    (w_samarth_iitk, v_society_id, v_worker2_auth_id,
       'Samarth K (Cook)',      '+919900000020', 'cook',
       'North Indian veg & non-veg. IIT trained — yes really.', 2, 14000, 580, 4.7,
       'https://i.pravatar.cc/300?img=57', 'samarthk@okhdfc')

  ON CONFLICT (id) DO UPDATE SET
    society_id       = EXCLUDED.society_id,
    auth_id          = EXCLUDED.auth_id,
    full_name        = EXCLUDED.full_name,
    phone            = EXCLUDED.phone,
    specialty        = EXCLUDED.specialty,
    bio              = EXCLUDED.bio,
    experience_years = EXCLUDED.experience_years,
    monthly_rate     = EXCLUDED.monthly_rate,
    daily_rate       = EXCLUDED.daily_rate,
    trust_score      = EXCLUDED.trust_score,
    photo_url        = EXCLUDED.photo_url,
    upi_id           = EXCLUDED.upi_id;

  -- ──────────────────────────────────────────────────────────
  -- 6. Active engagements
  --    Lakshmi + iitk cook are hired by the resident.
  --    Ramesh is also hired (for variety on dashboard).
  -- ──────────────────────────────────────────────────────────
  INSERT INTO engagements (id, employer_id, worker_id, monthly_salary, service_type, status) VALUES
    (e_lakshmi,      v_user_id, w_lakshmi,      8000,  'maid', 'active'),
    (e_ramesh,       v_user_id, w_ramesh,        12000, 'cook', 'active'),
    (e_samarth_iitk, v_user_id, w_samarth_iitk, 14000, 'cook', 'active')
  ON CONFLICT (id) DO UPDATE SET
    employer_id    = EXCLUDED.employer_id,
    worker_id      = EXCLUDED.worker_id,
    monthly_salary = EXCLUDED.monthly_salary,
    service_type   = EXCLUDED.service_type,
    status         = EXCLUDED.status;

  -- ──────────────────────────────────────────────────────────
  -- 7. Attendance (current month)
  -- ──────────────────────────────────────────────────────────
  DELETE FROM attendance
   WHERE engagement_id IN (e_lakshmi, e_ramesh, e_samarth_iitk)
     AND date >= v_month_start
     AND date <  (v_month_start + interval '1 month');

  -- Lakshmi: 12 days (day 8 = half day)
  INSERT INTO attendance (engagement_id, date, status)
  SELECT e_lakshmi, v_month_start + (d - 1),
         (CASE WHEN d = 8 THEN 'half_day' ELSE 'present' END)::attendance_status
    FROM generate_series(1, 12) AS d;

  -- Ramesh: 10 days (day 5 = absent)
  INSERT INTO attendance (engagement_id, date, status)
  SELECT e_ramesh, v_month_start + (d - 1),
         (CASE WHEN d = 5 THEN 'absent' ELSE 'present' END)::attendance_status
    FROM generate_series(1, 10) AS d;

  -- Samarth iitk (cook): 9 days, all present
  INSERT INTO attendance (engagement_id, date, status)
  SELECT e_samarth_iitk, v_month_start + (d - 1), 'present'::attendance_status
    FROM generate_series(1, 9) AS d;

  -- ──────────────────────────────────────────────────────────
  -- 8. Payments
  -- ──────────────────────────────────────────────────────────
  INSERT INTO payments
    (id, engagement_id, amount, period_start, period_end,
     days_worked, nodal_vpa, upi_txn_ref, utr, status, created_at)
  VALUES
    -- Last month completed payment (Lakshmi)
    (p_old, e_lakshmi, 7500,
       (v_month_start - interval '1 month')::date,
       (v_month_start - interval '1 day')::date,
       26, 'samarth@upi', 'SHDEMO0001AAAA', 'SHDEMO0001AAAA', 'completed',
       (v_month_start - interval '2 days')::timestamptz),

    -- This month initiated (Ramesh)
    (p_recent, e_ramesh, 4000,
       v_month_start,
       (v_month_start + interval '1 month - 1 day')::date,
       10, 'samarth@upi', 'SHDEMO0002BBBB', null, 'initiated',
       now()),

    -- This month completed (Lakshmi) — so worker 1 shows earnings
    (p_completed, e_lakshmi, 3500,
       v_month_start,
       (v_month_start + interval '1 month - 1 day')::date,
       11.5, 'samarth@upi', 'SHDEMO0003CCCC', 'SHDEMO0003CCCC', 'completed',
       now()),

    -- This month completed (iitk cook) — so worker 2 shows earnings
    (p_iitk_month, e_samarth_iitk, 4846,
       v_month_start,
       (v_month_start + interval '1 month - 1 day')::date,
       9, 'samarth@upi', 'SHDEMO0004DDDD', 'SHDEMO0004DDDD', 'completed',
       now())

  ON CONFLICT (id) DO UPDATE SET
    engagement_id = EXCLUDED.engagement_id,
    amount        = EXCLUDED.amount,
    period_start  = EXCLUDED.period_start,
    period_end    = EXCLUDED.period_end,
    days_worked   = EXCLUDED.days_worked,
    nodal_vpa     = EXCLUDED.nodal_vpa,
    upi_txn_ref   = EXCLUDED.upi_txn_ref,
    utr           = EXCLUDED.utr,
    status        = EXCLUDED.status,
    created_at    = EXCLUDED.created_at;

  -- ──────────────────────────────────────────────────────────
  -- 9. Job postings
  -- ──────────────────────────────────────────────────────────
  INSERT INTO job_postings
    (id, society_id, employer_id, specialty, description, offered_salary, status)
  VALUES
    (j_maid,   v_society_id, v_user_id, 'maid',
      '[DEMO] Need a maid for sweeping, mopping & dishes. Mornings, 1.5 hrs.',
      8000, 'open'),
    (j_cook,   v_society_id, v_user_id, 'cook',
      '[DEMO] Part-time cook for veg dinner, 6 days/week.',
      14000, 'open'),
    (j_car,    v_society_id, v_user_id, 'car_washer',
      '[DEMO] Daily car wash (1 sedan), Monday–Saturday.',
      3500, 'open'),
    (j_garden, v_society_id, v_user_id, 'gardener',
      '[DEMO] Weekly maintenance for balcony plants & a small terrace lawn.',
      5000, 'open')
  ON CONFLICT (id) DO UPDATE SET
    society_id     = EXCLUDED.society_id,
    employer_id    = EXCLUDED.employer_id,
    specialty      = EXCLUDED.specialty,
    description    = EXCLUDED.description,
    offered_salary = EXCLUDED.offered_salary,
    status         = EXCLUDED.status;

  -- ──────────────────────────────────────────────────────────
  RAISE NOTICE 'Seed complete.';
  RAISE NOTICE '  Resident: % (society=%)', v_user_email, v_society_id;
  RAISE NOTICE '  Worker 1: % / password123  (Lakshmi Devi, maid)', v_worker1_email;
  RAISE NOTICE '  Worker 2: % / password123  (Samarth K, cook, hired by resident)', v_worker2_email;
  RAISE NOTICE '  Workers directory: 16 rows  |  Engagements: 3 active  |  Job postings: 4 open';
END $$;
