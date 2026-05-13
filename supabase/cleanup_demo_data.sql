-- ============================================================
-- SOCIETY HELPER — REMOVE DEMO DATA
-- ============================================================
-- Removes everything created by seed_demo_data.sql.
--
-- Identification rule: anything whose worker.full_name starts
-- with '[DEMO]'. Everything else cascades from that — we walk
-- payments → attendance → engagements → workers in FK order so
-- we don't trip foreign-key constraints regardless of whether
-- ON DELETE CASCADE is set.
--
-- Safe to run multiple times. Will not touch:
--   • your auth.users row
--   • your profiles row (we leave society_id intact so any
--     real workers you've since added stay scoped correctly)
--   • any worker / engagement / payment that doesn't trace
--     back to a worker named '[DEMO] …'
--
-- ╔══════════════════════════════════════════════════════════╗
-- ║  HOW TO RUN                                              ║
-- ║  1. Supabase Dashboard → SQL Editor → New query          ║
-- ║  2. Paste this whole file                                ║
-- ║  3. Click "Run"                                          ║
-- ╚══════════════════════════════════════════════════════════╝
-- ============================================================

DO $$
DECLARE
  v_demo_worker_ids     uuid[];
  v_demo_engagement_ids uuid[];
  v_workers_deleted     int;
  v_engagements_deleted int;
  v_attendance_deleted  int;
  v_payments_deleted    int;
BEGIN
  -- 1. Find every demo worker.
  SELECT array_agg(id) INTO v_demo_worker_ids
  FROM workers
  WHERE full_name LIKE '[DEMO]%';

  IF v_demo_worker_ids IS NULL OR array_length(v_demo_worker_ids, 1) IS NULL THEN
    RAISE NOTICE 'No demo data found. Nothing to clean up.';
    RETURN;
  END IF;

  -- 2. Engagements that point at those workers.
  SELECT array_agg(id) INTO v_demo_engagement_ids
  FROM engagements
  WHERE worker_id = ANY (v_demo_worker_ids);

  -- 3. Payments first (child of engagements).
  IF v_demo_engagement_ids IS NOT NULL AND array_length(v_demo_engagement_ids, 1) IS NOT NULL THEN
    DELETE FROM payments
    WHERE engagement_id = ANY (v_demo_engagement_ids);
    GET DIAGNOSTICS v_payments_deleted = ROW_COUNT;

    -- 4. Attendance (also child of engagements).
    DELETE FROM attendance
    WHERE engagement_id = ANY (v_demo_engagement_ids);
    GET DIAGNOSTICS v_attendance_deleted = ROW_COUNT;

    -- 5. Engagements themselves.
    DELETE FROM engagements
    WHERE id = ANY (v_demo_engagement_ids);
    GET DIAGNOSTICS v_engagements_deleted = ROW_COUNT;
  ELSE
    v_payments_deleted    := 0;
    v_attendance_deleted  := 0;
    v_engagements_deleted := 0;
  END IF;

  -- 6. Finally, the workers.
  DELETE FROM workers
  WHERE id = ANY (v_demo_worker_ids);
  GET DIAGNOSTICS v_workers_deleted = ROW_COUNT;

  RAISE NOTICE 'Demo data removed:';
  RAISE NOTICE '  workers:     %', v_workers_deleted;
  RAISE NOTICE '  engagements: %', v_engagements_deleted;
  RAISE NOTICE '  attendance:  %', v_attendance_deleted;
  RAISE NOTICE '  payments:    %', v_payments_deleted;
END $$;
