<div align="right"><a href="README.html">📄 View styled version</a></div>

<div align="center">

<img src="public/icon-192.png" alt="Society Helper" width="80" />

# Society Helper

**A mobile-first PWA for residential societies to find, hire, and pay domestic help.**
No app store. No upfront fees. Distributed via a WhatsApp link.

<br/>

![Next.js](https://img.shields.io/badge/Next.js_14-black?style=for-the-badge&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

</div>

---

## What is Society Helper?

Society Helper connects **residents** of a housing society with **domestic workers** — maids, cooks, car washers, caretakers, gardeners, and more. Residents browse available workers, post jobs, track attendance, and pay directly via UPI. Workers manage their availability, apply for jobs, and view their engagements — all from a phone browser, no installation required.

---

## How It Works

<table>
<tr>
<td width="50%" valign="top">

### 🏠 For Residents

**Finding Help**
Browse the worker directory filtered by specialty, availability, and trust score. Tap any worker to view their full profile and send a hire request.

**Posting Jobs**
Post a job listing with a title, specialty, description, schedule, and offered salary. Workers in your society can apply and you'll be notified instantly.

**Managing Engagements**
Once a worker is hired, mark daily attendance, view a full monthly calendar, and track a live dues summary — days worked × daily rate.

**Paying Workers**
Tap Pay to open your UPI app (GPay, PhonePe, Paytm) with the worker's VPA and amount pre-filled. Every payment is logged with its UTR reference.

**Messaging**
Chat with workers directly from the app.

</td>
<td width="50%" valign="top">

### 🧑‍🔧 For Workers

**Profile & Availability**
Set up a profile with your specialty, daily rate, and photo. Toggle availability on/off from your dashboard — residents only see available workers.

**Finding Jobs**
Browse the job board of all open postings in your society. Apply with one tap and track the status of each application.

**Hire Requests**
When a resident sends a hire request, accept or decline it directly from the app.

**Tracking Work**
View your active engagements and attendance calendar — a useful reference for knowing what you're owed at end of month.

**Messaging**
Chat with residents directly from the app.

</td>
</tr>
</table>

---

# For Developers

## Key Pages

| Route | Resident | Worker |
|---|---|---|
| `/` | Dashboard — engagements, attendance, dues | Dashboard — engagements, hire requests |
| `/directory` | Browse available workers | Browse open job postings |
| `/directory/[workerId]` | Worker profile + hire CTA | — |
| `/jobs` | Manage job postings, review applicants | Redirects to directory |
| `/jobs/new` | Post a new job listing | — |
| `/hire-requests` | — | Pending hire requests |
| `/engagement/[id]` | Attendance calendar + pay button | Attendance calendar |
| `/payments` | Full payment history | — |
| `/chat` | All conversations | All conversations |
| `/notifications` | App notifications | App notifications |
| `/profile` | Edit profile, change password, delete account | Edit profile, toggle availability |
| `/onboarding` | First-time setup (name, flat number) | First-time setup (name, specialty, rate) |

---

## File Structure

<details>
<summary><b>Click to expand</b></summary>

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
│       │   └── [workerId]/
│       │       ├── page.tsx                # Worker profile
│       │       └── HireForm.tsx
│       ├── jobs/
│       │   ├── page.tsx                    # Resident job postings
│       │   ├── new/page.tsx
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
│       ├── payments/
│       │   └── page.tsx
│       ├── chat/
│       │   ├── page.tsx
│       │   └── [id]/
│       │       ├── page.tsx
│       │       └── ChatRoom.tsx
│       ├── notifications/
│       │   └── page.tsx
│       └── profile/
│           ├── page.tsx
│           ├── ResidentProfileForm.tsx
│           ├── AvailabilityToggle.tsx
│           ├── LogoutButton.tsx
│           ├── DeleteAccountButton.tsx
│           └── edit/
│               ├── page.tsx
│               └── ResidentEditForm.tsx
├── components/
│   ├── BottomNav.tsx
│   ├── AttendanceToggle.tsx
│   ├── PaymentButton.tsx
│   ├── QuickApplyButton.tsx
│   ├── DeleteJobButton.tsx
│   └── EndEngagementButton.tsx
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
└── package.json
```

</details>

---

## Setup

### 1 · Supabase

- Create a project at [supabase.com](https://supabase.com)
- In the SQL editor, run `supabase/schema.sql` to create all tables and RLS policies
- Under **Authentication → Providers**, enable **Phone** *(30 free SMS/day; swap to Twilio or MSG91 later)*
- Under **Authentication → URL Configuration**, set your Site URL and add your Vercel URLs to Redirect URLs:

```
https://your-app.vercel.app/**
https://your-app-*.vercel.app/**
```

### 2 · Environment Variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3 · Run Locally

```bash
npm install
npm run dev
```

### 4 · Deploy

Push to `master` → production deployment on Vercel.
Push to `dev` or any other branch → automatic preview deployment.

---

## Authentication

Login is **phone-number OTP only** — no passwords. On first login, users go through an onboarding flow to pick their role (resident or worker) and fill in their details. Sessions are refreshed automatically on every request via Next.js middleware, so users stay logged in without interruption.
