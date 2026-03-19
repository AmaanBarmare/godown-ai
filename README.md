# GodownAI — Warehouse Rental Invoice Management Platform

![React](https://img.shields.io/badge/React_18-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)

A full-stack web app that automates the entire warehouse rental invoicing lifecycle — from tenant contracts and GST-compliant PDF generation to email delivery, payment reminders, and TDS reconciliation.

Built for Indian warehouse landlords who manage multiple godowns (warehouses) and need to generate, send, and track invoices for dozens of tenants each month.

> **Live:** [godown-ai.vercel.app](https://godown-ai.vercel.app)

---

## Table of Contents

- [Problem & Motivation](#problem--motivation)
- [Key Design Decisions](#key-design-decisions)
- [Features](#features)
- [Architecture](#architecture)
- [Invoice Generation Flow](#invoice-generation-flow)
- [Payment Lifecycle](#payment-lifecycle)
- [Bugs Caught & Fixed](#bugs-caught--fixed)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Auth & Security](#auth--security)
- [Evolution: v1 → v2](#evolution-v1--v2)
- [Roadmap](#roadmap)

---

## Problem & Motivation

Warehouse rental invoicing in India is surprisingly manual. Landlords managing multiple godowns juggle spreadsheets, manually calculate GST (which changes depending on whether the tenant is in the same state or a different one), chase tenants for payments, and reconcile tax deductions by hand every month.

I built GodownAI to handle the full lifecycle: **configure once, generate monthly, track payments**.

### The AI Pivot

The first version used **OpenAI GPT-4o** to parse uploaded PDF invoices — extracting company names, amounts, and dates using AI vision, then matching them against configured email mappings.

It worked, but I realized the fundamental flaw: **landlords don't receive invoices — they send them**. The AI parser was solving the wrong problem. A warehouse owner doesn't need to extract data from someone else's invoice — they need to *generate* their own invoices from their tenant contracts.

So I removed the AI pipeline entirely and replaced it with a **contract-driven Invoice Generator** that auto-populates everything from stored tenant and landlord records. This shift from "AI-powered data extraction" to "contract-driven document generation" was the key product insight — the AI approach was technically impressive but operationally backwards. The deterministic approach is faster, more reliable, and costs nothing ($0.00 vs ~$0.03/invoice).

---

## Key Design Decisions

### GST Auto-Detection

Indian tax law requires different treatment depending on whether the landlord and tenant are in the same state or not. GodownAI automates this by comparing state codes embedded in GST numbers:

- **Same state** → CGST 9% + SGST 9%
- **Different state** → IGST 18%

No manual selection needed — the correct tax breakdown appears automatically on every invoice.

### Client-Side PDF Generation

Invoices are rendered entirely in the browser — no server-side rendering needed. One click produces a clean PDF with landlord letterhead, tenant details, line items, GST breakdown, and bank payment instructions. The PDF is then uploaded to cloud storage and attached to the outbound email, all in a single user action.

### Time-Locked Payment Reminders

Each tenant has a configurable buffer period. The "Send Reminder" button stays disabled until enough days have passed after the due date. This prevents premature reminders and keeps the landlord-tenant relationship professional. The UI shows exactly when each reminder unlocks.

### TDS Reconciliation

Indian tenants deduct tax (TDS) before paying. The payment confirmation screen enforces a hard rule: `amount received + TDS deducted = invoice total`. If the numbers don't balance to the rupee, the form won't submit. Both values are stored separately for accounting.

---

## Features

| Feature | What it does |
|---|---|
| **Dashboard** | Real-time overview with 5 KPI cards, a 12-month revenue chart, and a recent invoices feed |
| **Companies** | Full tenant contract management — 13 fields covering rent terms, GST, warehouse details, and billing schedule |
| **Members** | Landlord/payee profiles with bank details that auto-populate into generated invoices |
| **Invoice Generator** | Select a company and member → all fields auto-fill → one click generates PDF, emails it, and logs it |
| **Invoice History** | Searchable audit log of all invoices, filterable by status (Sent, Pending, Paid, Failed) |
| **Payment Reminder** | Shows unpaid invoices with days overdue. Time-locked send buttons that unlock after the buffer period |
| **Payment Confirmation** | TDS reconciliation — log the amount received, TDS deducted, and receiving bank. Validates the math before saving |
| **Email Settings** | Map each company to sender, recipient, CC, and BCC emails that auto-fill in the Invoice Generator |
| **Team Management** | Invite-only signup with role-based access (admin, manager, member) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         React SPA (Vite)                        │
│                                                                 │
│  Login ─ Setup ─ AcceptInvite ─ Dashboard ─ Companies           │
│  Members ─ Invoice Generator ─ Invoice History                  │
│  Payment Reminder ─ Payment Confirmation ─ Settings ─ Team      │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ React Query  │  │  jsPDF       │  │  React Router v6   │    │
│  │ (data hooks) │  │  (PDF gen)   │  │  (12 routes)       │    │
│  └──────┬───────┘  └──────┬───────┘  └────────────────────┘    │
└─────────┼─────────────────┼─────────────────────────────────────┘
          │                 │
          ▼                 ▼
┌──────────────────────────────────────────────────────────────┐
│                        Firebase                               │
│                                                               │
│  Auth             Firestore          Storage    Functions      │
│  ┌──────────┐    ┌────────────┐    ┌───────┐  ┌───────────┐ │
│  │ Email/   │    │ companies  │    │ PDFs  │  │sendInvoice│ │
│  │ Password │    │ members    │    │       │  │sendRemind.│ │
│  │ Invite-  │    │ invoices   │    └───────┘  │           │ │
│  │ only     │    │ email_map  │               │process-   │ │
│  └──────────┘    │ users      │               │Requests   │ │
│                  │ invites    │               │(trigger)  │ │
│                  │ orgs       │               └─────┬─────┘ │
│                  │ _requests ─┼── triggers ──────────┘       │
│                  └────────────┘                   │          │
│                                                   ▼          │
│                                              ┌────────┐      │
│                                              │ Resend │      │
│                                              └────────┘      │
└──────────────────────────────────────────────────────────────┘
```

**How data flows:** All data lives in Firestore. React Query hooks wrap every database call, handling caching and keeping the UI in sync automatically when data changes.

**The Firestore Trigger pattern:** Some operations (invites, org setup, user management) need elevated permissions. Instead of calling Cloud Functions directly (which was blocked by Google Cloud org policies — see [Bugs Caught & Fixed](#bugs-caught--fixed)), the client writes a "request" document to a special collection. A server-side trigger picks it up, executes the operation with full admin access, and writes the result back. The client watches for the result in real-time.

---

## Invoice Generation Flow

```
1. User selects a Company + Member (payee)
         │
2. Form auto-fills everything:
   ├── Warehouse address, area, rate (from contract)
   ├── Email recipients (from mappings)
   ├── Invoice number (auto-incremented)
   └── GST type (auto-detected from state codes)
         │
3. Amounts computed automatically:
   ├── Base Rent = area × rate
   ├── GST = base × 18%
   └── Total = base + GST
         │
4. User clicks "Generate & Send"
         │
5. PDF generated in the browser → uploaded to storage
         │
6. Cloud Function emails it to the tenant (PDF attached)
         │
7. Invoice logged with status "Sent"
```

---

## Payment Lifecycle

```
  Invoice Generated & Emailed
        │
        ▼
   ┌─────────┐
   │  Sent   │ ← Invoice delivered to tenant
   └────┬────┘
        │
        │  (due_date + buffer_days elapsed)
        ▼
   ┌──────────┐
   │ Pending  │ ← Payment reminder sent
   └────┬─────┘
        │
        │  (tenant pays → landlord confirms)
        ▼
   ┌─────────┐
   │  Paid   │ ← TDS reconciled: received + TDS = total
   └─────────┘
```

---

## Bugs Caught & Fixed

Real bugs I found and fixed during development and dogfooding. These aren't theoretical — each one was discovered by actually using the app end-to-end.

### Auth Race Condition — New Users Stuck on Setup Page

**What happened:** I invited a new user (amaan@oltaflock.ai) from the admin account. The invite email arrived, they clicked the link, created their account, signed in — and landed on the "Initialize Organization" setup page. The organization was already set up. They shouldn't have seen that page at all.

**Why it happened:** When a user accepts an invite, two things happen almost simultaneously:
1. Their login account is created (instant)
2. Their user profile is created in the database (takes a moment — goes through a server-side trigger)

The app checks for the user profile immediately after the account is created. Since the profile hasn't been written yet (the trigger is still processing), the app thinks this user has no profile and redirects them to the setup page — which is only meant for the very first admin bootstrapping a brand new organization.

**Was it a security risk?** No — the setup page's server-side function is locked to a single admin email, so no one else could actually re-initialize the organization. But it was a confusing dead-end for every new user.

**How I fixed it:**
- Added a `refreshProfile()` method so the app can re-check the database after the invite is fully processed, instead of relying on the one-shot check at login
- The invite acceptance flow now waits for the profile to be created, *then* refreshes — so by the time the user is redirected, their profile is loaded
- The setup page now shows a helpful "Account Setup Pending" message with a refresh button for non-admin users, instead of the misleading org initialization form

### Cloud Functions Blocked by Google Cloud Org Policies

**What happened:** All Cloud Function calls from the frontend returned "Missing or insufficient permissions" — even for logged-in users with valid roles.

**Why:** Google Cloud's "Domain Restricted Sharing" org policy was blocking direct function calls from the browser. This is a policy set at the organization level, not something you can fix in your own project settings.

**How I fixed it:** Replaced direct function calls with a **write-trigger pattern**. Instead of calling a function, the client writes a request to a special database collection. A server-side trigger (which runs as a service account not affected by the policy) picks it up and processes it. The client watches for the result in real-time. Same end result, no IAM issues.

### First-Time Setup Chicken-and-Egg Problem

**What happened:** The very first user couldn't set up the organization because the database security rules required a user profile to exist — but the user profile couldn't be created until the organization existed.

**How I fixed it:** The setup operation runs through the same server-side trigger pattern, which uses admin-level access to bypass security rules. This lets it create both the organization and the first user profile in a single atomic operation.

### Edit Forms Opening Blank

**What happened:** Clicking "Edit" on a company, member, or email mapping opened the form with empty fields instead of pre-filled with the current data.

**Why:** The forms initialized their state once when first rendered. When you opened the modal for a different item, the form didn't know the data had changed.

**How I fixed it:** Reset the form state every time the modal opens, using the selected item's current data.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React 18 + TypeScript | Type safety, hooks-based architecture |
| **Build** | Vite | Sub-second hot reload, fast production builds |
| **Styling** | Tailwind CSS + shadcn/ui | Utility CSS with accessible UI primitives and dark mode |
| **Data** | TanStack React Query | Caching, background sync, automatic UI updates on mutations |
| **Forms** | React Hook Form + Zod | Performant forms with schema-based validation |
| **PDF** | jsPDF + jspdf-autotable | Client-side PDF generation — no server dependency |
| **Charts** | Recharts | Revenue dashboard chart |
| **Database** | Cloud Firestore | Real-time NoSQL with automatic scaling |
| **Storage** | Firebase Storage | Invoice PDF files |
| **Serverless** | Firebase Cloud Functions (Node 22) | Email delivery, invites, org setup via Firestore triggers |
| **Email** | Resend | Transactional emails with PDF attachments |
| **Auth** | Firebase Authentication | Email/password, invite-only, role-based access |
| **Routing** | React Router v6 | 12 client-side routes |
| **Deployment** | Vercel (frontend) + Firebase (backend) | |

---

## Database Schema

### `companies` — Tenant Contracts
```
company_name, signing_authority, gst_number, registered_address,
warehouse_location, area_sqft, rate_per_sqft, monthly_base_rent,
possession_date, annual_increment, next_increment_date,
invoice_send_day, rent_due_day, reminder_buffer_days
```

### `members` — Landlord / Payee Profiles
```
member_type ("company" | "individual"), name, address, gst_number,
bank_name, branch, ifsc_code, account_number
```

### `invoices` — Invoice Records + Payment Tracking
```
invoice_number, invoice_period, company, member_id,
base_amount, gst_type, gst_rate, gst_amount, total_amount,
due_date, status ("Sent" | "Pending" | "Paid" | "Failed"),
recipient_email, sender_email, cc, bcc, file_name,
reminder_sent_at, payment_received, tds_amount, receipt_date,
bank_received_into, confirmed_at
```

### `email_mappings` — Company-to-Email Routing
```
company, sender_email, primary_email, cc, bcc
```

---

## Project Structure

```
src/
├── pages/
│   ├── Login.tsx                # Email/password sign-in
│   ├── AcceptInvite.tsx         # Invite acceptance + account creation
│   ├── Setup.tsx                # One-time org bootstrap (admin only)
│   ├── Index.tsx                # Dashboard — KPIs, revenue chart, recent invoices
│   ├── Companies.tsx            # Tenant contract CRUD (13 fields)
│   ├── Members.tsx              # Landlord/payee profiles with bank details
│   ├── InvoiceGenerator.tsx     # Form → PDF → email → log pipeline
│   ├── InvoiceHistory.tsx       # Searchable invoice audit log
│   ├── PaymentReminder.tsx      # Time-locked reminder sends
│   ├── PaymentConfirmation.tsx  # TDS reconciliation and payment logging
│   ├── Settings.tsx             # Email mapping configuration
│   └── TeamManagement.tsx       # Invite users, manage team (admin only)
├── contexts/
│   └── AuthContext.tsx           # Auth provider + user profile management
├── components/
│   ├── AppSidebar.tsx           # Navigation sidebar
│   ├── DashboardLayout.tsx      # Page wrapper
│   ├── ProtectedRoute.tsx       # Auth-required route guard
│   ├── AdminRoute.tsx           # Admin-role route guard
│   └── ui/                      # shadcn/ui primitives
├── hooks/
│   ├── use-companies.ts         # Company CRUD hooks
│   ├── use-members.ts           # Member CRUD hooks
│   ├── use-invoices.ts          # Invoice queries + mutations
│   ├── use-email-mappings.ts    # Email mapping CRUD hooks
│   ├── use-invites.ts           # Invite management hooks
│   └── use-users.ts             # User management hooks
├── lib/
│   └── request-client.ts        # Firestore trigger request client
├── integrations/firebase/
│   ├── config.ts                # Firebase SDK config
│   └── types.ts                 # TypeScript interfaces
functions/
└── src/index.ts                 # Cloud Functions (trigger-based)
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project on the Blaze plan (required for Cloud Functions)

### Installation

```bash
git clone https://github.com/Oltaflock-AI/godown-ai.git
cd godown-ai
npm install

# Install Cloud Functions dependencies
cd functions && npm install && cd ..

# Configure environment
cp .env.example .env
# Fill in your Firebase config values
```

### Firebase Setup

```bash
firebase login
firebase use <your-project-id>

# Set the Resend API key (used by Cloud Functions for email)
firebase functions:secrets:set RESEND_API_KEY

# Deploy Cloud Functions
firebase deploy --only functions
```

### Run Locally

```bash
npm run dev    # Frontend at http://localhost:8080
```

### Deploy

```bash
# Connect your GitHub repo to Vercel:
# - Framework Preset: Vite
# - Build Command: npm run build
# - Output Directory: dist
# - Add VITE_FIREBASE_* environment variables in Vercel dashboard
```

### Environment Variables

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase analytics measurement ID |

Cloud Functions use `RESEND_API_KEY` via Firebase secret management (not `.env`).

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server on port 8080 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve production build locally |
| `npm run test` | Run tests (Vitest) |
| `npm run lint` | ESLint |
| `cd functions && npm run build` | Compile Cloud Functions |
| `firebase deploy --only functions` | Deploy Cloud Functions |

---

## Auth & Security

### Invite-Only Signup

Users cannot self-register. An admin sends an invite from the Team Management page, which generates a secure token, stores its hash in the database, and emails a sign-up link. The recipient clicks the link, creates their account, and the server validates the token before activating the profile.

### Role-Based Access Control

Three roles with enforcement at every layer:

| Role | Can do |
|---|---|
| **Admin** | Everything — manage team, invite/revoke users, all business operations |
| **Manager** | Manage companies, members, email settings, generate & send invoices, send reminders, confirm payments |
| **Member** | View-only access to dashboard, companies, members, invoice history, and payment status |

Access is enforced in the database rules, on the server, and in the frontend routing.

### Organization Bootstrap

First-time setup is restricted to a single designated admin email. The setup function creates both the organization and the admin profile in one atomic operation, solving the chicken-and-egg problem where security rules require a user profile that doesn't exist yet.

---

## Evolution: v1 → v2

| Aspect | v1 | v2 |
|---|---|---|
| **Core flow** | Upload PDF → AI extracts data → log | Configure contracts → generate → email → track |
| **AI dependency** | OpenAI GPT-4o per invoice | None — deterministic |
| **PDF** | Upload existing | Generate in browser |
| **GST** | Not handled | Auto-detected from state codes |
| **Payment tracking** | None | Full lifecycle with TDS reconciliation |
| **Companies** | 3 fields | 13 fields |
| **Members** | Name only | 8 fields with bank details |
| **Email** | Manual | Automated with PDF attachment |
| **Cost per invoice** | ~$0.03 (GPT-4o) | $0.00 |

---

## Roadmap

- [x] Firebase Authentication with invite-only signup and role-based access
- [x] Auth race condition fix for invited users
- [ ] Automatic rent increment notifications based on contract dates
- [ ] Email template customization
- [ ] Multi-warehouse / multi-landlord support
- [ ] Bulk invoice generation (all companies in one click)
- [ ] Export to Excel / CSV for accountants

---

## License

MIT
