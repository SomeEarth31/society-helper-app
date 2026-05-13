-- ============================================================
-- SOCIETY HELPER — DEMO DATA SEED
-- ============================================================
-- Populates your account with realistic test data so you can
-- exercise the full app: dashboard, directory, engagement
-- detail, attendance calendar, and payments history.
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
-- Idempotent: re-running this updates existing rows rather
-- than duplicating, because all demo rows use fixed UUIDs.
-- ============================================================

DO $$
DECLARE
  v_user_email   text := 'samarth.2kumar@gmail.com';
  v_user_id      uuid;
  v_society_id   uuid;
  v_month_start  date := date_trunc('month', now())::date;

  -- Fixed UUIDs so re-runs upsert instead of duplicating.
  w_lakshmi  uuid := '11111111-1111-1111-1111-000000000001';
  w_ramesh   uuid := '11111111-1111-1111-1111-000000000002';
  w_priya    uuid := '11111111-1111-1111-1111-000000000003';
  w_arjun    uuid := '11111111-1111-1111-1111-000000000004';
  w_meera    uuid := '11111111-1111-1111-1111-000000000005';
  w_suresh   uuid := '11111111-1111-1111-1111-000000000006';

  e_lakshmi  uuid := '22222222-2222-2222-2222-000000000001';
  e_ramesh   uuid := '22222222-2222-2222-2222-000000000002';

  p_old      uuid := '33333333-3333-3333-3333-000000000001';
  p_recent   uuid := '33333333-3333-3333-3333-000000000002';
BEGIN
  -- ──────────────────────────────────────────────────────────
  -- 1. Resolve the auth user.
  -- ──────────────────────────────────────────────────────────
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_user_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION
      'No auth.users row found for %. Log in once via the app first, then re-run this seed.',
      v_user_email;
  END IF;

  -- ──────────────────────────────────────────────────────────
  -- 2. Ensure the profile row exists and has a society_id.
  --    We need this so directory + engagements scope correctly.
  -- ──────────────────────────────────────────────────────────
  INSERT INTO profiles (id, full_name, flat_number, phone)
  VALUES (v_user_id, 'Samarth Kumar', 'A-203', '+919812345678')
  ON CONFLICT (id) DO UPDATE SET
    full_name   = COALESCE(profiles.full_name,   EXCLUDED.full_name),
    flat_number = COALESCE(profiles.flat_number, EXCLUDED.flat_number),
    phone       = COALESCE(profiles.phone,       EXCLUDED.phone);

  SELECT society_id INTO v_society_id
  FROM profiles
  WHERE id = v_user_id;

  IF v_society_id IS NULL THEN
    -- Deterministic society id so re-runs of the seed don't drift.
    v_society_id := '99999999-9999-9999-9999-000000000001';

    -- Must insert the society row first or the FK on profiles will reject the update.
    INSERT INTO societies (id, name)
    VALUES (v_society_id, '[DEMO] Sunrise Apartments')
    ON CONFLICT (id) DO NOTHING;

    UPDATE profiles SET society_id = v_society_id WHERE id = v_user_id;
  END IF;

  -- ──────────────────────────────────────────────────────────
  -- 3. Workers (all tagged [DEMO] for the cleanup script).
  --    Pravatar URLs give us free, varied headshots.
  -- ──────────────────────────────────────────────────────────
  INSERT INTO workers (id, society_id, full_name, phone, specialty, monthly_rate, trust_score, photo_url) VALUES
    (w_lakshmi, v_society_id, '[DEMO] Lakshmi Devi',    '+919900000001', 'maid',      7000,  4.8, 'https://i.pravatar.cc/300?img=47'),
    (w_ramesh,  v_society_id, '[DEMO] Ramesh Kumar',    '+919900000002', 'cook',     12000,  4.6, 'https://i.pravatar.cc/300?img=68'),
    (w_priya,   v_society_id, '[DEMO] Priya Sharma',    '+919900000003', 'caretaker', 15000, 4.9, 'https://i.pravatar.cc/300?img=44'),
    (w_arjun,   v_society_id, '[DEMO] Arjun Singh',     '+919900000004', 'other',     18000, 4.4, 'https://i.pravatar.cc/300?img=12'),
    (w_meera,   v_society_id, '[DEMO] Meera Patel',     '+919900000005', 'maid',      6500,  4.2, 'https://i.pravatar.cc/300?img=23'),
    (w_suresh,  v_society_id, '[DEMO] Suresh Yadav',    '+919900000006', 'gardener',  5500,  4.0, 'https://i.pravatar.cc/300?img=15')
  ON CONFLICT (id) DO UPDATE SET
    society_id   = EXCLUDED.society_id,
    full_name    = EXCLUDED.full_name,
    phone        = EXCLUDED.phone,
    specialty    = EXCLUDED.specialty,
    monthly_rate = EXCLUDED.monthly_rate,
    trust_score  = EXCLUDED.trust_score,
    photo_url    = EXCLUDED.photo_url;

  -- ──────────────────────────────────────────────────────────
  -- 4. Active engagements — Lakshmi (maid) and Ramesh (cook).
  --    These show up on the dashboard's helper list.
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
  -- 5. Attendance for the current month.
  --    Lakshmi: present days 1-12 (one half day on day 8).
  --    Ramesh:  present days 1-10 + absent on day 5.
  --    Tweak ranges if you want different MTD numbers.
  -- ──────────────────────────────────────────────────────────

  -- Wipe & re-insert current-month attendance for these engagements
  -- (so re-running the seed gives a deterministic state).
  DELETE FROM attendance
  WHERE engagement_id IN (e_lakshmi, e_ramesh)
    AND date >= v_month_start
    AND date <  (v_month_start + interval '1 month');

  -- Lakshmi: 11 full days + 1 half day = 11.5 days worked
  INSERT INTO attendance (engagement_id, date, status)
  SELECT e_lakshmi, v_month_start + (d - 1),
         (CASE WHEN d = 8 THEN 'half_day' ELSE 'present' END)::attendance_status
  FROM generate_series(1, 12) AS d;

  -- Ramesh: 9 present days + 1 absent
  INSERT INTO attendance (engagement_id, date, status)
  SELECT e_ramesh, v_month_start + (d - 1),
         (CASE WHEN d = 5 THEN 'absent' ELSE 'present' END)::attendance_status
  FROM generate_series(1, 10) AS d;

  -- ──────────────────────────────────────────────────────────
  -- 6. Payment history.
  --    One completed payment from last month (with UTR),
  --    one initiated-but-not-confirmed from this month.
  -- ──────────────────────────────────────────────────────────
  INSERT INTO payments
    (id, engagement_id, amount, period_start, period_end,
     days_worked, nodal_vpa, upi_txn_ref, status)
  VALUES
    (p_old, e_lakshmi, 7500,
     (v_month_start - interval '1 month')::date,
     (v_month_start - interval '1 day')::date,
     26, 'samarth@upi', 'SHDEMO0001AAAA', 'completed'),
    (p_recent, e_ramesh, 4000,
     v_month_start,
     (v_month_start + interval '1 month' - interval '1 day')::date,
     10, 'samarth@upi', 'SHDEMO0002BBBB', 'initiated')
  ON CONFLICT (id) DO UPDATE SET
    engagement_id = EXCLUDED.engagement_id,
    amount        = EXCLUDED.amount,
    period_start  = EXCLUDED.period_start,
    period_end    = EXCLUDED.period_end,
    days_worked   = EXCLUDED.days_worked,
    nodal_vpa     = EXCLUDED.nodal_vpa,
    upi_txn_ref   = EXCLUDED.upi_txn_ref,
    status        = EXCLUDED.status;

  -- ──────────────────────────────────────────────────────────
  RAISE NOTICE 'Seed complete for % (society_id=%)', v_user_email, v_society_id;
  RAISE NOTICE '  workers: 6, engagements: 2 (active), attendance: % rows, payments: 2',
    (SELECT COUNT(*) FROM attendance WHERE engagement_id IN (e_lakshmi, e_ramesh));
END $$;
