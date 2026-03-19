# GodownAI — Warehouse Rental Invoice Management Platform

![React](https://img.shields.io/badge/React_18-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)

A full-stack SPA that automates the entire warehouse rental invoicing lifecycle — from tenant contract configuration and GST-compliant PDF generation to automated email delivery, time-locked payment reminders, and TDS-reconciled payment confirmations.

Built for Indian warehouse landlords who manage multiple godowns (warehouses) and need to generate, send, and track invoices for dozens of tenants each month.

> **Live:** [godown-ai.vercel.app](https://godown-ai.vercel.app)

---

## Table of Contents

- [Problem & Motivation](#problem--motivation)
- [Key Engineering Decisions](#key-engineering-decisions)
- [Features](#features)
- [Architecture](#architecture)
- [Invoice Generation Flow](#invoice-generation-flow)
- [Payment Lifecycle](#payment-lifecycle)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Auth & Security](#auth--security)
- [Evolution: v1 to v2](#evolution-v1--v2)
- [Roadmap](#roadmap)

---

## Problem & Motivation

Warehouse rental invoicing in India is surprisingly manual. Landlords managing multiple godowns juggle spreadsheets, manually calculate GST (IGST vs CGST+SGST depending on state codes), chase tenants for payments, and reconcile TDS deductions by hand every month.

I built GodownAI to handle the full lifecycle: **configure once, generate monthly, track payments**.

### The AI Pivot

The first version used **OpenAI GPT-4o via Cloud Functions** to parse uploaded PDF invoices — extracting company names, amounts, and dates using vision + tool calling, then fuzzy-matching against configured email mappings.

It worked, but I realized the fundamental flaw: **landlords don't receive invoices — they send them**. The AI parser was solving the wrong problem. A warehouse owner doesn't need to extract data from someone else's invoice — they need to *generate* their own invoices from their tenant contracts.

So I removed the AI pipeline entirely and replaced it with a **contract-driven Invoice Generator** that auto-populates everything from stored company and member records. This shift from "AI-powered data extraction" to "contract-driven document generation" was the key architectural insight — the AI approach was technically impressive but operationally backwards. The deterministic approach is faster, more reliable, cheaper ($0.00 vs ~$0.03/invoice), and actually matches the real workflow.

---

## Key Engineering Decisions

### GST Auto-Detection

Indian GST law requires different tax treatment based on whether a transaction is intra-state or inter-state. GodownAI automates this by comparing the first 2 digits of the company's and landlord's GST numbers (which encode the state code):

- **Same state** → CGST 9% + SGST 9% (intra-state)
- **Different state** → IGST 18% (inter-state)

No manual selection needed. The algorithm runs on every invoice and displays the correct tax breakdown automatically.

### Client-Side PDF Generation

Invoices are rendered entirely in the browser using `jsPDF` + `jspdf-autotable`. No server-side rendering, no headless Chrome, no Puppeteer — just a clean ~15KB PDF with:

- Landlord letterhead (name, address, GST, bank details)
- Tenant bill-to block
- Line items table with area, rate, base amount
- GST breakdown (IGST or CGST+SGST depending on detection)
- Bank payment instructions (name, branch, IFSC, account number)

The generated PDF is uploaded to Firebase Storage and attached to the outbound email — all in one user action.

### Time-Locked Payment Reminders

Each company has a configurable `reminder_buffer_days`. The "Send Reminder" button is physically disabled until `today >= due_date + buffer_days`. This prevents premature reminder emails and keeps the landlord-tenant relationship professional. The UI shows exactly when each reminder becomes available.

### TDS Reconciliation

Indian tenants deduct TDS (Tax Deducted at Source) before paying. The payment confirmation form enforces a hard constraint: `amount_received + tds_deducted = invoice_total`. If the numbers don't balance to the rupee, the form blocks submission with an inline error. Both values are stored separately for accounting and tax filing.

---

## Features

### Dashboard
Real-time executive overview with 5 KPI cards (monthly revenue, active companies, sent/paid/pending counts), a 12-month revenue trend bar chart (Recharts), and a recent invoices feed.

### Companies
Full tenant contract management with 13 configurable fields: company name, signing authority, GST number, registered address, warehouse location, area (sq.ft.), rate per sq.ft., computed monthly rent, possession date, annual increment %, next increment date, invoice send day, rent due day, and reminder buffer days. All Firestore-persisted with search and CRUD operations.

### Members
Landlord/payee profiles with bank details (name, branch, IFSC code, account number) and GST information. Supports both company and individual member types. Bank details are pulled into generated invoices automatically.

### Invoice Generator
The core workflow. Selecting a company auto-fills warehouse data, area, and rate. Selecting a member enables GST auto-detection. Email fields auto-populate from configured mappings. Invoice numbers auto-increment (INV-001, INV-002, ...). One click generates the PDF client-side, uploads it to Storage, triggers a Cloud Function to email it via Resend, and logs the invoice to Firestore with status "Sent".

### Invoice History
Searchable, filterable audit log of all invoices. Filter by status (Sent, Pending, Paid, Failed), search by company name or invoice number. Displays invoice number, company, period, amount, sent date, due date, and status with color-coded badges.

### Payment Reminder
Shows all unpaid invoices with days overdue calculation. Time-locked send buttons that only activate after the configured buffer period. Sends reminder emails via Cloud Function (no attachment). Automatically transitions invoice status from "Sent" to "Pending".

### Payment Confirmation
TDS reconciliation interface. For each unpaid invoice, log the amount received after TDS, the TDS amount deducted, date of receipt, and receiving bank account. Form validates that the amounts balance before allowing confirmation. Marks invoice as "Paid" with full payment metadata.

### Email Settings
Company-to-email mapping configuration: sender email, recipient email, CC, and BCC per company. These mappings auto-fill into the Invoice Generator when a company is selected.

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

**Data flow pattern:** All persistent data lives in Firestore. React Query hooks wrap every Firebase SDK call, providing caching, background refetching, and optimistic updates. Mutations invalidate relevant queries via `queryClient.invalidateQueries()` so the UI stays in sync without manual state management.

**Firestore Trigger pattern (`_requests`):** Privileged operations (invites, org setup, user management) use a write-trigger architecture instead of `onCall` Cloud Functions. The client writes a request document to `_requests/{id}`, a Firestore `onDocumentCreated` trigger (`processRequests`) picks it up, executes the operation with the Admin SDK (bypassing security rules), and writes the result back. The client listens via `onSnapshot` for completion. This avoids Cloud Run IAM / Domain Restricted Sharing issues that block `onCall` functions in some Google Cloud org configurations.

**Forms:** React Hook Form + Zod validation schemas on every CRUD form. Field-level error display, disabled submit during async operations, and form state reset on modal open/close.

---

## Invoice Generation Flow

```
1. User selects Company + Member (payee)
         │
2. Form auto-populates:
   ├── Warehouse address, area, rate from Company
   ├── Recipient / sender / CC / BCC from Email Mappings
   ├── Invoice number (INV-NNN, auto-incremented)
   └── GST type (auto-detected from state codes)
         │
3. Computed fields:
   ├── Base Amount = area × rate
   ├── GST Amount = base × 18%
   ├── Total Payable = base + GST
   └── Due Date = next month + rent_due_day
         │
4. User clicks "Generate & Send"
         │
5. Client generates PDF via jsPDF
         │
6. PDF uploaded to Firebase Storage
         │
7. Cloud Function sends email via Resend (PDF attached)
         │
8. Invoice saved to Firestore (status: "Sent")
         │
9. Redirect to Invoice History
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
        │  (tenant pays → landlord logs payment)
        ▼
   ┌─────────┐
   │  Paid   │ ← TDS reconciled: received + TDS = total
   └─────────┘
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React 18 + TypeScript | Type safety across the full component tree, hooks-based architecture |
| **Build** | Vite | Sub-second HMR, fast production builds |
| **Styling** | Tailwind CSS + shadcn/ui | Utility-first CSS with accessible Radix primitives, HSL theming with dark mode |
| **Data Fetching** | TanStack React Query | Server state management with caching, background sync, and mutation invalidation |
| **Forms** | React Hook Form + Zod | Performant forms (no re-renders on input) with schema-based validation |
| **PDF** | jsPDF + jspdf-autotable | Client-side PDF generation — no server dependency |
| **Charts** | Recharts | Composable chart components for the revenue dashboard |
| **Database** | Cloud Firestore | Real-time NoSQL with offline support and automatic scaling |
| **File Storage** | Firebase Storage | Stores generated invoice PDFs |
| **Serverless** | Firebase Cloud Functions (Node 22) | Email delivery, invite management, org bootstrap via Firestore triggers |
| **Email** | Resend | Transactional email API with PDF attachments, called from Cloud Functions |
| **Auth** | Firebase Authentication | Email/password, invite-only signup, role-based access |
| **Routing** | React Router v6 | Declarative client-side routing with 12 routes |

---

## Database Schema

### `companies` — Tenant Contracts
```
company_name, signing_authority, gst_number, registered_address,
warehouse_location, area_sqft, rate_per_sqft, monthly_base_rent,
possession_date, annual_increment, next_increment_date,
invoice_send_day, rent_due_day, reminder_buffer_days,
created_at, updated_at
```

### `members` — Landlord / Payee Profiles
```
member_type ("company" | "individual"), name, address, gst_number,
bank_name, branch, ifsc_code, account_number,
created_at, updated_at
```

### `invoices` — Invoice Records + Payment Tracking
```
invoice_number, invoice_period, company, member_id,
base_amount, gst_type ("IGST" | "CGST+SGST"), gst_rate, gst_amount, total_amount,
due_date, status ("Sent" | "Pending" | "Paid" | "Failed"),
recipient_email, sender_email, cc, bcc, file_name,
reminder_sent_at, payment_received, tds_amount, receipt_date,
bank_received_into, confirmed_at, created_at
```

### `email_mappings` — Company-to-Email Routing
```
company, sender_email, primary_email, cc, bcc,
created_at, updated_at
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
│   ├── Companies.tsx            # Tenant contract CRUD (13 fields, Firestore-persisted)
│   ├── Members.tsx              # Landlord/payee profiles with bank details
│   ├── InvoiceGenerator.tsx     # Form → PDF → upload → email → Firestore pipeline
│   ├── InvoiceHistory.tsx       # Searchable invoice audit log with status filters
│   ├── PaymentReminder.tsx      # Time-locked reminder sends with overdue tracking
│   ├── PaymentConfirmation.tsx  # TDS reconciliation and payment logging
│   ├── Settings.tsx             # Email mapping configuration
│   └── TeamManagement.tsx       # Invite users, manage team access (admin only)
├── contexts/
│   └── AuthContext.tsx           # Firebase Auth provider + user profile loading
├── components/
│   ├── AppSidebar.tsx           # Collapsible sidebar navigation
│   ├── DashboardLayout.tsx      # Page wrapper with sidebar
│   ├── ProtectedRoute.tsx       # Auth-required route guard
│   ├── AdminRoute.tsx           # Admin-role route guard
│   └── ui/                      # shadcn/ui primitives (Radix-based)
├── hooks/
│   ├── use-companies.ts         # Firestore CRUD hooks for companies
│   ├── use-members.ts           # Firestore CRUD hooks for members
│   ├── use-invoices.ts          # Invoice queries + status update mutations
│   ├── use-email-mappings.ts    # Email mapping CRUD hooks
│   ├── use-invites.ts           # Invite management hooks
│   └── use-users.ts             # User management hooks
├── lib/
│   └── request-client.ts        # _requests write-trigger client (submitRequest)
├── integrations/firebase/
│   ├── config.ts                # Firebase SDK initialization
│   └── types.ts                 # TypeScript interfaces for all collections
functions/
└── src/index.ts                 # Cloud Functions: email, invites, org setup (trigger-based)
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project on the Blaze plan (required for Cloud Functions)

### Installation

```bash
# Clone and install
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
# Login and select project
firebase login
firebase use <your-project-id>

# Set the Resend API key as a secret (used by Cloud Functions)
firebase functions:secrets:set RESEND_API_KEY

# Deploy Cloud Functions
firebase deploy --only functions
```

### Run Locally

```bash
npm run dev    # Frontend at http://localhost:8080
```

### Deploy to Vercel

```bash
# Connect your GitHub repo to Vercel, then:
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

> **Note:** Invite and system emails currently send from `onboarding@resend.dev` (Resend's test sender) because the `oltaflock.ai` domain is not yet verified in Resend. Once domain DNS records are added and verified in the [Resend dashboard](https://resend.com/domains), update `INVITE_SENDER_EMAIL` in `functions/src/index.ts` back to `admin@oltaflock.ai`.

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

Users cannot self-register. An admin creates an invite from the Team Management page, which generates a secure token, stores its SHA-256 hash in Firestore, and emails the invite link via Resend. The recipient clicks the link, creates a Firebase Auth account, and the Cloud Function validates the token, creates the Firestore user profile, and marks the invite as accepted.

### Role-Based Access Control

Three roles: **admin**, **manager**, **member**. Enforced at three layers:
1. **Firestore rules** — role checks on every read/write (e.g., only active users access business data, only admins read invites)
2. **Cloud Functions** — `requireRole()` checks on all privileged operations
3. **Frontend routes** — `ProtectedRoute` (auth required) and `AdminRoute` (admin role required) wrappers

### Organization Bootstrap

First-time setup is restricted to `admin@oltaflock.ai`. The Setup page writes to `_requests`, which triggers the `initializeOrganization` Cloud Function handler. The function creates the organization doc and admin user profile using the Admin SDK (bypassing Firestore security rules). This avoids the chicken-and-egg problem where security rules require a user doc that doesn't exist yet.

### Firestore Security Rules

- `organizations`: bootstrap admin can create; active users read own org only
- `users`: bootstrap admin can create own doc; users can read own doc or same-org docs
- `invites`: admin read only; writes managed exclusively by Cloud Functions
- `_requests`: authenticated users can create (with own userId + pending status) and read own requests; no client updates
- Business data (`companies`, `members`, `invoices`, `email_mappings`): active authenticated users only

---

## Engineering Challenges Solved

### Cloud Run IAM / Domain Restricted Sharing Blocking `onCall` Functions

Google Cloud org policies (Domain Restricted Sharing) prevented unauthenticated invocations of `onCall` Cloud Functions, causing "Missing or insufficient permissions" errors even for authenticated users. Solved by replacing `onCall` with a **Firestore write-trigger pattern**: the client writes a request to `_requests/{id}`, the `processRequests` trigger (which runs as a service account unaffected by IAM restrictions) processes it with the Admin SDK, and writes the result back. The client listens via `onSnapshot` for completion.

### Organization Setup Permissions

The Setup page originally wrote directly to Firestore from the client, but Firestore security rules use `get()` to check the caller's user document — which doesn't exist yet during first-time setup. Moving the initialization to the `_requests` trigger pattern resolved this: the Cloud Function uses the Admin SDK which bypasses security rules entirely.

### Shipping Updated Cloud Functions

Deploys kept serving the old `parseInvoice` function even though the code had been rewritten to `sendInvoice` / `sendPaymentReminder`. Root cause: the deploy pipeline reads compiled output (`functions/lib/`), which hadn't been rebuilt. Rebuilding before deploy fixed it.

### IAM / Build Permissions on Cloud Functions Deploy

Deploys failed with "missing permission on the build service account" despite being a project owner. Traced to Cloud Build service-account policy changes — enabled the required API and granted the correct IAM roles.

### Edit Modals Not Pre-Filling

Companies/Members/Settings edit modals opened with empty fields. The modal forms were initialized once on mount; switching between items didn't re-sync form state. Fixed by resetting form state on modal open with the selected item's data.

### Best-Effort Status Updates

Reminder emails could succeed but the server-side Firestore status update could fail due to runtime permissions, making the whole action appear failed. Made the status update best-effort (log on failure, don't block the email). The client updates status independently.

---

## Evolution: v1 → v2

| Aspect | v1 | v2 |
|---|---|---|
| **Core flow** | Upload PDF → AI extracts data → log | Configure contracts → generate → email → track |
| **AI dependency** | OpenAI GPT-4o per invoice | None — deterministic computation |
| **PDF handling** | Upload existing | Generate new (client-side jsPDF) |
| **GST** | Not handled | Auto-detected from state codes |
| **Payment tracking** | None | Full lifecycle with TDS reconciliation |
| **Companies** | 3 fields, local state | 13 fields, Firestore-persisted |
| **Members** | Name only | 8 fields with bank details |
| **Email** | Manual | Automated via Resend with PDF attachment |
| **Cost per invoice** | ~$0.03 (GPT-4o call) | $0.00 |

---

## Roadmap

- [x] Firebase Authentication with invite-only signup and role-based access
- [ ] Automatic rent increment notifications based on `next_increment_date`
- [ ] Email template customization
- [ ] Multi-warehouse / multi-landlord support
- [ ] Bulk invoice generation (all companies in one click)
- [ ] Export to Excel / CSV for accountants

---

## License

MIT
