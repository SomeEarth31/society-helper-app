# Society Helper

A mobile-first PWA for residential societies to find, hire, and pay verified domestic help — no app store, no upfront fees, distributed via a WhatsApp link.

> **Stack:** Next.js 14 (App Router) · Supabase (Postgres + Auth + RLS) · Tailwind CSS · Lucide React · UPI Intent Deep Links · Vercel

---

## What is Society Helper?

Society Helper connects residents of a housing society with domestic workers — maids, cooks, car washers, caretakers, gardeners, and more. Residents can browse available workers, post jobs, track attendance, and pay directly via UPI. Workers can set their availability, apply for jobs, and manage their engagements — all from their phone.

The app is role-aware: the experience is entirely different depending on whether you log in as a resident or a worker.

---

## How It Works

### For Residents

**Finding Help**
Residents land on a directory of all active workers in their society. Each worker card shows their name, specialty, daily rate, trust score, and whether they are currently available. Tapping a worker opens their full profile where you can send a hire request.

**Posting Jobs**
If you have a specific requirement, you can post a job listing with a title, specialty, description, schedule, and offered salary. Workers in your society can apply, and you'll get notified when they do. From the Jobs page you can review all applicants and accept or reject them.

**Managing Engagements**
Once you hire a worker, an engagement is created. From the dashboard you can see all your active engagements, mark attendance day by day, and view a full attendance calendar for any given month. The dashboard also shows a dues summary — how much you owe based on days worked and the agreed daily rate.

**Paying Workers**
Payments are made via UPI intent deep links — tapping Pay opens your UPI app (GPay, PhonePe, Paytm, etc.) directly with the worker's VPA and the correct amount pre-filled. All payments are logged with their status and UTR reference in the Payments tab.

**Messaging**
Residents can message workers directly from the app. The Chat tab shows all your active conversations.

---

### For Workers

**Profile & Availability**
Workers set up a profile with their specialty, daily rate, and a photo. An availability toggle on the dashboard lets them flip between available and unavailable — residents only see available workers by default.

**Finding Jobs**
The Directory tab shows workers a job board of all open postings in their society. They can apply with one tap and track the status of their applications.

**Hire Requests**
When a resident sends a hire request, the worker sees it in the Hire Requests tab and can accept or decline.

**Tracking Work**
Workers can see their active engagements and the attendance calendar — a useful reference for knowing what they are owed at the end of the month.

---

## Key Pages

| Route | Resident | Worker |
|---|---|---|
| `/` | Dashboard — active engagements, attendance, dues | Dashboard — active engagements, hire requests |
| `/directory` | Browse available workers | Browse open job postings |
| `/directory/[workerId]` | Worker profile + hire CTA | — |
| `/jobs` | Manage job postings, view applicants | Redirects to directory |
| `/jobs/new` | Post a new job | — |
| `/hire-requests` | — | Pending hire requests |
| `/engagement/[id]` | Attendance calendar + payment | Attendance calendar |
| `/payments` | Full payment history | — |
| `/chat` | All conversations | All conversations |
| `/notifications` | App notifications | App notifications |
| `/profile` | Edit profile, change password, delete account | Edit profile, toggle availability |
| `/onboarding` | First-time setup (name, flat number) | First-time setup (name, specialty, rate) |

---

## File Structure

```
society-helper-app/
├── app/
│   ├── layout.tsx                          # Root layout (fonts, PWA meta, Analytics)
│   ├── providers.tsx                       # Client-side context providers
│   ├── globals.css
│   ├── login/
│   │   └── page.tsx                        # Phone OTP login
│   ├── onboarding/
│   │   ├── page.tsx
│   │   └── OnboardingForm.tsx              # Role-aware first-time setup
│   └── (app)/                              # Auth-gated route group
│       ├── layout.tsx                      # Auth guard + bottom nav + badge counts
│       ├── page.tsx                        # Dashboard (role-aware)
│       ├── ResidentDashboard.tsx
│       ├── WorkerDashboard.tsx
│       ├── directory/
│       │   ├── page.tsx                    # Worker list (resident) / job board (worker)
│       │   ├── WorkerList.tsx
│       │   ├── JobBoard.tsx
│       │   ├── JobList.tsx
│       │   └── [workerId]/
│       │       ├── page.tsx                # Worker profile
│       │       └── HireForm.tsx
│       ├── jobs/
│       │   ├── page.tsx                    # Resident job postings
│       │   ├── new/page.tsx                # Post a job
│       │   └── [id]/applicants/
│       │       ├── page.tsx
│       │       └── ApplicantActions.tsx
│       ├── hire-requests/
│       │   ├── page.tsx
│       │   └── HireRequestCard.tsx
│       ├── engagement/[id]/
│       │   ├── page.tsx                    # Attendance calendar + pay button
│       │   ├── AttendanceCalendar.tsx
│       │   └── actions.ts                  # Server actions (mark attendance, settle)
│       ├── engagements/[id]/
│       │   └── page.tsx
│       ├── payments/
│       │   └── page.tsx                    # Payment history
│       ├── chat/
│       │   ├── page.tsx                    # Conversation list
│       │   └── [id]/
│       │       ├── page.tsx
│       │       └── ChatRoom.tsx
│       ├── notifications/
│       │   ├── page.tsx
│       │   └── MarkAllRead.tsx
│       ├── profile/
│       │   ├── page.tsx
│       │   ├── ResidentProfileForm.tsx
│       │   ├── AvailabilityToggle.tsx
│       │   ├── LogoutButton.tsx
│       │   ├── DeleteAccountButton.tsx
│       │   └── edit/
│       │       ├── page.tsx
│       │       └── ResidentEditForm.tsx
│       ├── worker-profile/
│       │   ├── page.tsx
│       │   └── WorkerProfileForm.tsx
│       └── change-password/
│           └── page.tsx
├── auth/
│   └── callback/
│       └── route.ts                        # Supabase auth callback
├── components/
│   ├── BottomNav.tsx
│   ├── AttendanceToggle.tsx
│   ├── PaymentButton.tsx
│   ├── RateButtons.tsx
│   ├── QuickApplyButton.tsx
│   ├── DeleteJobButton.tsx
│   ├── EndEngagementButton.tsx
│   └── ClosedJobsSection.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                       # Browser client
│   │   └── server.ts                       # Server client (RSC + actions)
│   └── upi.ts                              # UPI deep-link builder
├── types/
│   └── database.ts                         # Generated Supabase types
├── public/
│   ├── manifest.json                       # PWA manifest
│   ├── icon-192.png
│   └── icon-512.png
├── middleware.ts                           # Session refresh on every request
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Setup

**1. Supabase**
- Create a project at supabase.com
- Copy the project URL and anon key
- In the SQL editor, run `supabase/schema.sql` to create tables and RLS policies
- Under Authentication → Providers, enable Phone (Supabase gives 30 free SMS/day; swap to Twilio or MSG91 later)
- Under Authentication → URL Configuration, set your Site URL and add redirect URLs for your Vercel deployment

**2. Environment variables**

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

**3. Run locally**

```bash
npm install
npm run dev
```

**4. Deploy**
Push to `master` to deploy to production on Vercel. Push to `dev` or any other branch to get a preview deployment.

---

## Authentication

Login is phone-number OTP only — no passwords to manage. On first login, users are sent through an onboarding flow where they choose their role (resident or worker) and fill in their details. From then on, the app remembers their role and shows the appropriate experience.
