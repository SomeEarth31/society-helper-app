# Society Helper Directory & Ledger — PWA

A Concierge MVP for digitizing your residential society's domestic-help market.
Distributed via WhatsApp link, no app store, no upfront fees.

> Stack: **Next.js 14 (App Router)** • **Supabase** (Postgres + Auth + RLS) • **Tailwind CSS** • **Lucide React** • **UPI Intent Deep Links** • **Vercel**

---

## File Structure

```
society-helper-app/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx              # Phone OTP login (Supabase)
│   ├── (app)/                        # Auth-gated route group
│   │   ├── layout.tsx                # Bottom nav + auth guard
│   │   ├── page.tsx                  # ⭐ DASHBOARD (Module 2: Ledger)
│   │   ├── directory/
│   │   │   └── page.tsx              # Module 1: Worker directory
│   │   ├── helper/[id]/
│   │   │   └── page.tsx              # Worker detail + Hire CTA
│   │   ├── engagement/[id]/
│   │   │   ├── page.tsx              # Attendance calendar + history
│   │   │   └── actions.ts            # Server actions (mark attendance, settle)
│   │   └── profile/
│   │       └── page.tsx
│   ├── api/
│   │   └── auth/callback/route.ts    # Supabase auth callback
│   ├── layout.tsx                    # Root layout (fonts, PWA meta)
│   └── globals.css
├── components/
│   ├── BottomNav.tsx                 # Mobile bottom navigation
│   ├── WorkerCard.tsx                # Reusable directory card
│   ├── AttendanceCalendar.tsx        # Month-grid toggle (engagement page)
│   ├── AttendanceToggle.tsx          # Today's quick toggle (dashboard)
│   ├── PaymentButton.tsx             # ⭐ UPI deep-link launcher
│   └── DuesCard.tsx                  # Current-month dues summary
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   ├── server.ts                 # Server client (RSC + actions)
│   │   └── middleware.ts             # Session refresh
│   ├── upi.ts                        # UPI deep-link builder + parser
│   └── utils.ts
├── supabase/
│   ├── schema.sql                    # ⭐ DB schema + RLS policies
│   └── seed.sql                      # Sample data (your 100 numbers go here)
├── public/
│   ├── manifest.json                 # PWA manifest
│   ├── icon-192.png
│   └── icon-512.png
├── types/database.ts                 # `supabase gen types` output
├── middleware.ts                     # Next middleware (auth refresh)
├── .env.local.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Setup (10 minutes, end-to-end)

1. **Create Supabase project** → copy `URL` and `anon key` into `.env.local`.
2. Open Supabase **SQL Editor** → paste contents of `supabase/schema.sql` → Run.
3. (Optional) Paste `supabase/seed.sql` with your society + workers.
4. In Supabase Auth → **Providers** → enable **Phone** (use the free 30 SMS/day quota; switch to MSG91/Twilio later via the same provider interface).
5. `npm install && npm run dev`.
6. Deploy to Vercel — add the same env vars. The Vercel preview URL is your WhatsApp distribution link.

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_NODAL_VPA=samarth@upi          # your nodal account
NEXT_PUBLIC_NODAL_PAYEE_NAME=SocietyHelp   # shown in UPI apps
```

---

## Architectural Notes

**Why Server Components + Server Actions.** All reads happen on the server with the user's session cookie — RLS does the security work, you write almost no auth checks. Mutations are Server Actions, which gives you optimistic-UI for free and keeps the bundle tiny.

**Why a `societies` table from day 1.** You'll expand to society #2 the moment this works. Multi-tenancy as an afterthought is brutal; baking it in now costs nothing.

**Why UPI Intent, not a gateway.** Zero fees, zero KYC, zero merchant onboarding. The trade-off is reconciliation: you collect to your nodal VPA, then settle to worker VPAs (manually for now, batched later). Document the UTR on each `payments` row.

**Trust Score.** Stubbed at 3.0 for everyone. Compute later from: attendance consistency × tenure × employer ratings. Don't optimize this until you have engagement data.

---

## Next milestones (after this scaffold runs)

1. Worker onboarding flow — admin (you) adds the 100 phone numbers in `supabase/seed.sql`.
2. Hire flow — `engagement/new` page with rate negotiation.
3. WhatsApp invite — `/invite` page that opens `https://wa.me/?text=...` with a per-flat referral.
4. Two-sided ratings (after first settlement).
5. Migrate from UPI Intent → Razorpay Route once you cross ₹1L/month GMV.
