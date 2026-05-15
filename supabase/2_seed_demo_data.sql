-- ============================================================
-- SOCIETY HELPER — DEMO SEED v7
-- ============================================================
-- RUN ORDER:
--   1. supabase/1_schema.sql          ← run on a fresh project
--   2. Create both accounts in the app:
--        Resident:  samarth.2kumar@gmail.com  (role = resident)
--        Worker:    samarthk21@iitk.ac.in      (role = worker)
--      Both must complete onboarding so a `profiles` row and
--      (for the worker) a `workers` row exist before this script.
--   3. THIS FILE                      ← run after both accounts exist
--
-- Re-running is safe — ON CONFLICT everywhere, idempotent UUIDs.
-- To wipe demo data without touching real data: cleanup_demo_data.sql
-- ============================================================

DO $$
DECLARE
  -- ── Onboarded users (looked up by email) ──────────────────
  v_resident_email text := 'samarth.2kumar@gmail.com';
  v_worker_email   text := 'samarthk21@iitk.ac.in';
  v_resident_id    uuid;
  v_worker2_id     uuid;

  v_society_id     uuid := '99999999-9999-9999-9999-000000000001';
  v_month_start    date := date_trunc('month', now())::date;

  -- Worker directory UUIDs
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
  w_samarth_iitk uuid; -- resolved below from the workers row created during onboarding

  -- Engagements
  e_lakshmi      uuid := '22222222-2222-2222-2222-000000000001';
  e_ramesh       uuid := '22222222-2222-2222-2222-000000000002';
  e_samarth_iitk uuid := '22222222-2222-2222-2222-000000000003';

  -- Payments
  p_old       uuid := '33333333-3333-3333-3333-000000000010';
  p_recent    uuid := '33333333-3333-3333-3333-000000000011';
  p_completed uuid := '33333333-3333-3333-3333-000000000012';
  p_iitk      uuid := '33333333-3333-3333-3333-000000000013';

  -- Job postings
  j_maid   uuid := '44444444-4444-4444-4444-000000000001';
  j_cook   uuid := '44444444-4444-4444-4444-000000000002';
  j_car    uuid := '44444444-4444-4444-4444-000000000003';
  j_garden uuid := '44444444-4444-4444-4444-000000000004';
BEGIN

  -- ──────────────────────────────────────────────────────────
  -- 1. Resolve auth user IDs from the emails the user onboarded with
  -- ──────────────────────────────────────────────────────────
  SELECT id INTO v_resident_id FROM auth.users WHERE email = v_resident_email LIMIT 1;
  IF v_resident_id IS NULL THEN
    RAISE EXCEPTION 'Resident auth user "%" not found. Sign up & onboard that user in the app first.', v_resident_email;
  END IF;

  SELECT id INTO v_worker2_id FROM auth.users WHERE email = v_worker_email LIMIT 1;
  IF v_worker2_id IS NULL THEN
    RAISE EXCEPTION 'Worker auth user "%" not found. Sign up & onboard that user in the app first.', v_worker_email;
  END IF;

  -- The worker row was created by onboarding; grab its id
  SELECT id INTO w_samarth_iitk FROM workers WHERE auth_id = v_worker2_id LIMIT 1;
  IF w_samarth_iitk IS NULL THEN
    RAISE EXCEPTION 'No workers row linked to "%". The worker onboarding step did not complete.', v_worker_email;
  END IF;

  -- ──────────────────────────────────────────────────────────
  -- 2. Society — create demo society and attach both profiles
  -- ──────────────────────────────────────────────────────────
  INSERT INTO societies (id, name, city)
  VALUES (v_society_id, '[DEMO] Sunrise Apartments', 'Bengaluru')
  ON CONFLICT (id) DO NOTHING;

  -- Attach both profiles to the demo society (COALESCE won't overwrite names set during onboarding)
  UPDATE profiles
     SET society_id  = v_society_id,
         role        = 'resident',
         full_name   = COALESCE(full_name, 'Samarth Kumar'),
         flat_number = COALESCE(flat_number, 'A-204')
   WHERE id = v_resident_id;

  UPDATE profiles
     SET society_id = v_society_id,
         role       = 'worker',
         full_name  = COALESCE(full_name, 'Samarth K (Cook)')
   WHERE id = v_worker2_id;

  -- Keep the onboarded worker row in the demo society
  UPDATE workers
     SET society_id = v_society_id
   WHERE id = w_samarth_iitk;

  -- ──────────────────────────────────────────────────────────
  -- 3. Workers directory (15 fake demo workers)
  -- ──────────────────────────────────────────────────────────
  INSERT INTO workers (id, society_id, auth_id, full_name, phone, specialty, bio, experience_years, monthly_rate, daily_rate, trust_score, photo_url, upi_id, is_active, is_available)
  VALUES
    (w_lakshmi, v_society_id, null, '[DEMO] Lakshmi Devi',   '+919900000001', 'maid',       'Honest and punctual. 10+ years.',              12, 7000,  300, 4.8, 'https://i.pravatar.cc/300?img=47', 'lakshmi@okhdfc',  true, true),
    (w_ramesh,  v_society_id, null, '[DEMO] Ramesh Kumar',   '+919900000002', 'cook',       'North & South Indian veg. Jain meals.',         8, 12000, 500, 4.6, 'https://i.pravatar.cc/300?img=68', 'ramesh@okicici',  true, true),
    (w_priya,   v_society_id, null, '[DEMO] Priya Sharma',   '+919900000003', 'caretaker',  'Elder care + medication reminders.',            7, 15000, 600, 4.9, 'https://i.pravatar.cc/300?img=44', 'priya@okaxis',    true, true),
    (w_arjun,   v_society_id, null, '[DEMO] Arjun Singh',    '+919900000004', 'other',      'Plumbing, electrical, minor repairs.',         10, 18000, 750, 4.4, 'https://i.pravatar.cc/300?img=12', 'arjun@oksbi',     true, true),
    (w_meera,   v_society_id, null, '[DEMO] Meera Patel',    '+919900000005', 'maid',       'Quick and reliable, double-shift available.',   4, 6500,  280, 4.2, 'https://i.pravatar.cc/300?img=23', 'meera@okhdfc',    true, true),
    (w_suresh,  v_society_id, null, '[DEMO] Suresh Yadav',   '+919900000006', 'gardener',   'Lawn, balcony plants, weekly pruning.',         9, 5500,  240, 4.0, 'https://i.pravatar.cc/300?img=15', 'suresh@okicici',  true, true),
    (w_anita,   v_society_id, null, '[DEMO] Anita Reddy',    '+919900000007', 'caretaker',  'Live-in caretaker for elderly couples.',       15, 28000, 1100,4.8, 'https://i.pravatar.cc/300?img=32', 'anita@okaxis',    true, true),
    (w_imran,   v_society_id, null, '[DEMO] Imran Khan',     '+919900000008', 'cook',       'Mughlai, biryani, kebabs. Non-veg specialist.',10, 18000, 750, 4.8, 'https://i.pravatar.cc/300?img=51', 'imran@oksbi',     true, true),
    (w_geeta,   v_society_id, null, '[DEMO] Geeta Kulkarni', '+919900000009', 'cook',       'Maharashtrian veg, tiffin lunchboxes.',         6, 13000, 550, 4.5, 'https://i.pravatar.cc/300?img=10', 'geeta@okhdfc',    true, true),
    (w_vikram,  v_society_id, null, '[DEMO] Vikram Das',     '+919900000010', 'car_washer', 'Premium polish + interior detailing.',          5, 5500,  220, 4.6, 'https://i.pravatar.cc/300?img=8',  'vikram@okicici',  true, true),
    (w_sunita,  v_society_id, null, '[DEMO] Sunita Rao',     '+919900000011', 'gardener',   'Indoor plants & terrace garden setup.',         4, 7000,  320, 4.4, 'https://i.pravatar.cc/300?img=20', 'sunita@okaxis',   true, true),
    (w_arif,    v_society_id, null, '[DEMO] Arif Sheikh',    '+919900000012', 'cleaner',    'Move-in/out deep cleaning, crew of two.',       8, 11000, 480, 4.5, 'https://i.pravatar.cc/300?img=33', 'arif@oksbi',      true, true),
    (w_kavita,  v_society_id, null, '[DEMO] Kavita Joshi',   '+919900000013', 'maid',       'Sweeping, mopping, dishes. Mornings.',          3, 9500,  400, 4.3, 'https://i.pravatar.cc/300?img=49', 'kavita@okhdfc',   true, true),
    (w_manoj,   v_society_id, null, '[DEMO] Manoj Patel',    '+919900000014', 'car_washer', 'Daily wash, weekly wax. Brings own supplies.',  4, 4500,  180, 4.4, 'https://i.pravatar.cc/300?img=11', 'manoj@okicici',   true, true),
    (w_pooja,   v_society_id, null, '[DEMO] Pooja Mishra',   '+919900000015', 'cleaner',    'Deep cleaning — kitchen, bathrooms, sofas.',    5, 9000,  380, 4.6, 'https://i.pravatar.cc/300?img=25', 'pooja@okaxis',    true, true)
  ON CONFLICT (id) DO UPDATE SET
    society_id       = EXCLUDED.society_id,
    full_name        = EXCLUDED.full_name,
    phone            = EXCLUDED.phone,
    specialty        = EXCLUDED.specialty,
    bio              = EXCLUDED.bio,
    experience_years = EXCLUDED.experience_years,
    monthly_rate     = EXCLUDED.monthly_rate,
    daily_rate       = EXCLUDED.daily_rate,
    trust_score      = EXCLUDED.trust_score,
    photo_url        = EXCLUDED.photo_url,
    upi_id           = EXCLUDED.upi_id,
    is_active        = EXCLUDED.is_active,
    is_available     = EXCLUDED.is_available;

  -- ──────────────────────────────────────────────────────────
  -- 3b. Populate worker_societies for all workers in this society
  --     (covers both the 15 demo workers and the onboarded worker)
  -- ──────────────────────────────────────────────────────────
  insert into worker_societies (worker_id, society_id)
  select id, v_society_id from workers where society_id = v_society_id
  on conflict do nothing;

  -- ──────────────────────────────────────────────────────────
  -- 4. Engagements (resident hires 3 workers including samarthk21)
  -- ──────────────────────────────────────────────────────────
  INSERT INTO engagements (id, employer_id, worker_id, monthly_salary, service_type, status)
  VALUES
    (e_lakshmi,      v_resident_id, w_lakshmi,       8000, 'maid', 'active'),
    (e_ramesh,       v_resident_id, w_ramesh,       12000, 'cook', 'active'),
    (e_samarth_iitk, v_resident_id, w_samarth_iitk, 14000, 'cook', 'active')
  ON CONFLICT (id) DO UPDATE SET
    employer_id    = EXCLUDED.employer_id,
    worker_id      = EXCLUDED.worker_id,
    monthly_salary = EXCLUDED.monthly_salary,
    service_type   = EXCLUDED.service_type,
    status         = EXCLUDED.status;

  -- ──────────────────────────────────────────────────────────
  -- 5. Attendance (current month)
  -- ──────────────────────────────────────────────────────────
  DELETE FROM attendance
   WHERE engagement_id IN (e_lakshmi, e_ramesh, e_samarth_iitk)
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

  INSERT INTO attendance (engagement_id, date, status)
  SELECT e_samarth_iitk, v_month_start + (d - 1), 'present'::attendance_status
  FROM generate_series(1, 9) AS d;

  -- ──────────────────────────────────────────────────────────
  -- 6. Payments
  -- ──────────────────────────────────────────────────────────
  INSERT INTO payments (id, engagement_id, amount, period_start, period_end, days_worked, nodal_vpa, upi_txn_ref, utr, status, created_at)
  VALUES
    (p_old,       e_lakshmi,      7500, (v_month_start - interval '1 month')::date, (v_month_start - interval '1 day')::date,           26,   'samarth@upi', 'SHDEMO0001', 'SHDEMO0001', 'completed', (v_month_start - interval '2 days')::timestamptz),
    (p_recent,    e_ramesh,       4000, v_month_start,                              (v_month_start + interval '1 month - 1 day')::date, 10,   'samarth@upi', 'SHDEMO0002', null,         'initiated', now()),
    (p_completed, e_lakshmi,      3500, v_month_start,                              (v_month_start + interval '1 month - 1 day')::date, 11.5, 'samarth@upi', 'SHDEMO0003', 'SHDEMO0003', 'completed', now()),
    (p_iitk,      e_samarth_iitk, 4846, v_month_start,                             (v_month_start + interval '1 month - 1 day')::date, 9,    'samarth@upi', 'SHDEMO0004', 'SHDEMO0004', 'completed', now())
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
  -- 7. Job postings (resident's open jobs)
  -- ──────────────────────────────────────────────────────────
  INSERT INTO job_postings (id, society_id, employer_id, specialty, title, description, schedule, offered_salary, status)
  VALUES
    (j_maid,   v_society_id, v_resident_id, 'maid',
     '[DEMO] Morning maid for 2BHK',
     'Need a maid for sweeping, mopping & dishes. 1.5 hrs in the morning.',
     'Mon–Sat, 7am–8:30am', 8000, 'open'),
    (j_cook,   v_society_id, v_resident_id, 'cook',
     '[DEMO] Part-time cook — veg dinner',
     'Part-time cook for vegetarian dinner, 6 days/week. South & North Indian.',
     'Mon–Sat, 5pm–7pm', 14000, 'open'),
    (j_car,    v_society_id, v_resident_id, 'car_washer',
     '[DEMO] Daily car wash',
     'Daily wash for 1 sedan. Monday to Saturday. Brings own supplies preferred.',
     'Daily, by 8am', 3500, 'open'),
    (j_garden, v_society_id, v_resident_id, 'gardener',
     '[DEMO] Balcony + terrace garden',
     'Weekly maintenance for balcony plants and a small terrace lawn. ~2 hrs/week.',
     'Once a week (flexible)', 5000, 'open')
  ON CONFLICT (id) DO UPDATE SET
    society_id     = EXCLUDED.society_id,
    employer_id    = EXCLUDED.employer_id,
    specialty      = EXCLUDED.specialty,
    title          = EXCLUDED.title,
    description    = EXCLUDED.description,
    schedule       = EXCLUDED.schedule,
    offered_salary = EXCLUDED.offered_salary,
    status         = EXCLUDED.status;

  -- ──────────────────────────────────────────────────────────
  -- 8. Job applications FROM samarthk21 (worker: My applications)
  -- ──────────────────────────────────────────────────────────
  INSERT INTO job_applications (job_posting_id, worker_id, cover_note, status)
  VALUES
    (j_cook,   w_samarth_iitk, 'I can cook North and South Indian veg meals. Available Mon–Sat evenings.', 'pending'),
    (j_maid,   w_samarth_iitk, 'Cross-applying — happy to help with morning cleaning too.',                'pending'),
    (j_garden, w_samarth_iitk, 'Have a green thumb on the side. Open to weekly garden upkeep.',            'pending')
  ON CONFLICT (job_posting_id, worker_id) DO NOTHING;

  -- ──────────────────────────────────────────────────────────
  -- 9. Hire requests TO samarthk21 (worker: incoming offers)
  -- ──────────────────────────────────────────────────────────
  INSERT INTO hire_requests (id, resident_id, worker_id, message, offered_salary, status)
  VALUES
    ('55555555-5555-5555-5555-000000000001', v_resident_id, w_samarth_iitk,
     'Hi Samarth — interested in hiring you for evening dinner. ₹14k/mo OK?', 14000, 'pending'),
    ('55555555-5555-5555-5555-000000000002', v_resident_id, w_priya,
     'Looking for elder-care help for my mother. Can we chat?',               15000, 'pending')
  ON CONFLICT (id) DO UPDATE SET
    message        = EXCLUDED.message,
    offered_salary = EXCLUDED.offered_salary,
    status         = EXCLUDED.status;

  -- ──────────────────────────────────────────────────────────
  -- 10. Conversations + chat history
  -- ──────────────────────────────────────────────────────────
  INSERT INTO conversations (id, resident_id, worker_id)
  VALUES
    ('66666666-6666-6666-6666-000000000001', v_resident_id, w_samarth_iitk),
    ('66666666-6666-6666-6666-000000000002', v_resident_id, w_lakshmi),
    ('66666666-6666-6666-6666-000000000003', v_resident_id, w_priya)
  ON CONFLICT (resident_id, worker_id) DO NOTHING;

  -- Wipe previous demo messages so re-runs aren't cumulative
  DELETE FROM messages
   WHERE conversation_id IN (
     '66666666-6666-6666-6666-000000000001',
     '66666666-6666-6666-6666-000000000002',
     '66666666-6666-6666-6666-000000000003'
   );

  -- Resident ↔ Samarth K — active chat thread
  INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at) VALUES
    ('66666666-6666-6666-6666-000000000001', v_resident_id, 'Hi Samarth, saw your application for the cook role.', true,  now() - interval '3 days'),
    ('66666666-6666-6666-6666-000000000001', v_worker2_id,  'Hello sir, thank you! When can I start?',             true,  now() - interval '3 days' + interval '5 min'),
    ('66666666-6666-6666-6666-000000000001', v_resident_id, 'Can you do a trial dinner this Saturday 6pm?',        true,  now() - interval '2 days'),
    ('66666666-6666-6666-6666-000000000001', v_worker2_id,  'Yes, I will come at 5:45pm to set up.',               true,  now() - interval '2 days' + interval '10 min'),
    ('66666666-6666-6666-6666-000000000001', v_resident_id, 'Please bring your own knife set if possible.',        false, now() - interval '6 hours'),
    ('66666666-6666-6666-6666-000000000001', v_worker2_id,  'Sure, I have a full set. Any food allergies?',        false, now() - interval '3 hours');

  -- Resident ↔ Lakshmi (no auth for Lakshmi, resident-side only)
  INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at) VALUES
    ('66666666-6666-6666-6666-000000000002', v_resident_id, 'Lakshmi, can you come 30 min late tomorrow?', true,  now() - interval '1 day'),
    ('66666666-6666-6666-6666-000000000002', v_resident_id, 'Tomorrow only — Wednesday onwards normal.',   false, now() - interval '1 day' + interval '1 min');

  -- Resident ↔ Priya (after hire request)
  INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at) VALUES
    ('66666666-6666-6666-6666-000000000003', v_resident_id, 'Priya, I sent you a hire request. Free to talk now?', false, now() - interval '2 hours');

  -- ──────────────────────────────────────────────────────────
  RAISE NOTICE 'Seed complete.';
  RAISE NOTICE '  Resident : %  (auth id: %)', v_resident_email, v_resident_id;
  RAISE NOTICE '  Worker   : %  (auth id: %, worker id: %)', v_worker_email, v_worker2_id, w_samarth_iitk;
  RAISE NOTICE '  Society  : %  (id: %)', '[DEMO] Sunrise Apartments', v_society_id;
  RAISE NOTICE '  16 workers | 3 engagements | 4 job postings | 3 applications | 2 hire requests | 3 chat threads';
END $$;
