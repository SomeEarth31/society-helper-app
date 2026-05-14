-- ============================================================
-- SOCIETY HELPER — DEMO DATA SEED  (v2: workers + job postings)
-- ============================================================
-- Populates your account with realistic test data so you can
-- exercise the full app: resident dashboard, directory, engagement
-- detail, attendance calendar, payments history, AND the new
-- worker dashboard with available openings.
--
-- ╔══════════════════════════════════════════════════════════╗
-- ║  HOW TO RUN                                              ║
-- ║  1. Open Supabase Dashboard → SQL Editor → New query     ║
-- ║  2. Paste this whole file                                ║
-- ║  3. (Optional) change v_user_email below if needed       ║
-- ║  4. Click "Run"                                          ║
-- ║                                                          ║
-- ║  HOW TO REMOVE                                           ║
-- ║  Run cleanup_demo_data.sql — it deletes everything       ║
-- ║  tagged [DEMO] in the right FK order.                    ║
-- ╚══════════════════════════════════════════════════════════╝
--
-- TEST WORKER LOGIN (created by this seed):
--   email:    worker@test.com
--   password: password123
--   role:     worker (linked to "[DEMO] Lakshmi Devi")
--
-- Idempotent: re-running upserts existing rows by fixed UUID.
-- ============================================================

DO $$
DECLARE
  -- The "resident" account — your real signed-up email.
  v_user_email   text := 'samarth.2kumar@gmail.com';
  v_user_id      uuid;
  v_society_id   uuid;
  v_month_start  date := date_trunc('month', now())::date;

  -- Test worker auth user (created below).
  v_worker_auth_id  uuid := '33333333-3333-3333-3333-000000000001';
  v_worker_email    text := 'worker@test.com';

  -- Worker UUIDs.
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

  e_lakshmi  uuid := '22222222-2222-2222-2222-000000000001';
  e_ramesh   uuid := '22222222-2222-2222-2222-000000000002';

  p_old      uuid := '33333333-3333-3333-3333-000000000010';
  p_recent   uuid := '33333333-3333-3333-3333-000000000011';

  j_maid     uuid := '44444444-4444-4444-4444-000000000001';
  j_cook     uuid := '44444444-4444-4444-4444-000000000002';
  j_car      uuid := '44444444-4444-4444-4444-000000000003';
  j_garden   uuid := '44444444-4444-4444-4444-000000000004';
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
  -- 2. Profile + society for the resident.
  -- ──────────────────────────────────────────────────────────
  INSERT INTO profiles (id, full_name, flat_number, phone, role)
  VALUES (v_user_id, 'Samarth Kumar', 'A-203', '+919812345678', 'resident')
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
  -- 3. Test worker auth user (worker@test.com / password123).
  --    Inserting directly into auth.users with a bcrypt-hashed
  --    password is supported on Supabase; the on_auth_user_created
  --    trigger will create the matching profiles row.
  -- ──────────────────────────────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    v_worker_auth_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    v_worker_email,
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(), now(),
    '', '', '', ''
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
    updated_at         = now();

  -- Ensure the profile row exists with the worker role.
  INSERT INTO profiles (id, full_name, phone, society_id, role)
  VALUES (v_worker_auth_id, '[DEMO] Lakshmi Devi', '+919900000001', v_society_id, 'worker')
  ON CONFLICT (id) DO UPDATE SET
    full_name  = EXCLUDED.full_name,
    society_id = EXCLUDED.society_id,
    role       = EXCLUDED.role;

  -- ──────────────────────────────────────────────────────────
  -- 4. Workers directory — 15 diverse helpers.
  --    Lakshmi is linked to the test worker auth user.
  -- ──────────────────────────────────────────────────────────
  INSERT INTO workers
    (id, society_id, auth_id, full_name, phone, specialty,
     bio, experience_years, monthly_rate, daily_rate, trust_score, photo_url, upi_id)
  VALUES
    (w_lakshmi, v_society_id, v_worker_auth_id,
       '[DEMO] Lakshmi Devi',  '+919900000001', 'maid',
       'Honest and punctual. 10+ years cleaning homes.', 12, 7000,  300, 4.8,
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
       'https://i.pravatar.cc/300?img=25', 'pooja@okaxis')
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
  -- 5. Active engagements (Lakshmi & Ramesh hired by resident).
  -- ──────────────────────────────────────────────────────────
  INSERT INTO engagements (id, employer_id, worker_id, monthly_salary, service_type, status) VALUES
    (e_lakshmi, v_user_id, w_lakshmi, 8000,  'maid', 'active'),
    (e_ramesh,  v_user_id, w_ramesh,  12000, 'cook', 'active')
  ON CONFLICT (id) DO UPDATE SET
    employer_id    = EXCLUDED.employer_id,
    worker_id      = EXCLUDED.worker_id,
    monthly_salary = EXCLUDED.monthly_salary,
    service_type   = EXCLUDED.service_type,
    status         = EXCLUDED.status;

  -- ──────────────────────────────────────────────────────────
  -- 6. Attendance for the current month (deterministic).
  -- ──────────────────────────────────────────────────────────
  DELETE FROM attendance
   WHERE engagement_id IN (e_lakshmi, e_ramesh)
     AND date >= v_month_start
     AND date <  (v_month_start + interval '1 month');

  INSERT INTO attendance (engagement_id, date, status)
  SELECT e_lakshmi, v_month_start + (d - 1),
         (CASE WHEN d = 8 THEN 'half_day' ELSE 'present' END)::attendance_status
    FROM generate_series(1, 12) AS d;

  INSERT INTO attendance (engagement_id, date, status)
  SELECT e_ramesh, v_month_start + (d - 1),
         (CASE WHEN d = 5 THEN 'absent' ELSE 'present' END)::attendance_status
    FROM generate_series(1, 10) AS d;

  -- ──────────────────────────────────────────────────────────
  -- 7. Payment history (one completed last month, one initiated this month,
  --    plus one completed this month so the worker dashboard's "Earned"
  --    card has a positive number).
  -- ──────────────────────────────────────────────────────────
  INSERT INTO payments
    (id, engagement_id, amount, period_start, period_end,
     days_worked, nodal_vpa, upi_txn_ref, utr, status, created_at)
  VALUES
    (p_old,    e_lakshmi, 7500,
       (v_month_start - interval '1 month')::date,
       (v_month_start - interval '1 day')::date,
       26, 'samarth@upi', 'SHDEMO0001AAAA', 'SHDEMO0001AAAA', 'completed',
       (v_month_start - interval '2 days')::timestamptz),

    (p_recent, e_ramesh, 4000,
       v_month_start,
       (v_month_start + interval '1 month' - interval '1 day')::date,
       10, 'samarth@upi', 'SHDEMO0002BBBB', null, 'initiated',
       now()),

    ('33333333-3333-3333-3333-000000000012',
       e_lakshmi, 3500,
       v_month_start,
       (v_month_start + interval '1 month' - interval '1 day')::date,
       11.5, 'samarth@upi', 'SHDEMO0003CCCC', 'SHDEMO0003CCCC', 'completed',
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
  -- 8. Job postings — open openings the worker dashboard surfaces.
  -- ──────────────────────────────────────────────────────────
  INSERT INTO job_postings
    (id, society_id, employer_id, specialty, description, offered_salary, status)
  VALUES
    (j_maid,   v_society_id, v_user_id, 'maid',
      '[DEMO] Need a maid for sweeping, mopping & dishes. Mornings, 1.5 hrs.',
      8000,  'open'),
    (j_cook,   v_society_id, v_user_id, 'cook',
      '[DEMO] Part-time cook for veg dinner, 6 days/week.',
      14000, 'open'),
    (j_car,    v_society_id, v_user_id, 'car_washer',
      '[DEMO] Daily car wash (1 sedan), Monday–Saturday.',
      3500,  'open'),
    (j_garden, v_society_id, v_user_id, 'gardener',
      '[DEMO] Weekly maintenance for balcony plants & a small terrace lawn.',
      5000,  'open')
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
  RAISE NOTICE '  Test worker login: % / password123', v_worker_email;
  RAISE NOTICE '  Workers: 15, Engagements: 2 active, Job postings: 4 open';
END $$;
