# GodownOS

**A full-stack warehouse rental management platform** that handles the entire invoicing lifecycle — from tenant onboarding and automated invoice generation to payment reminders with time-locked sends and TDS-reconciled payment confirmations.

Built with React 18, TypeScript, Firebase, and Resend. Generates compliant GST invoices as PDFs client-side and emails them directly to tenants.

---

## Why I Built This

Warehouse rental invoicing in India is surprisingly manual. Landlords managing multiple godowns (warehouses) juggle spreadsheets, manually calculate GST (IGST vs CGST+SGST depending on state codes), chase tenants for payments, and reconcile TDS deductions by hand every month.

I wanted to build a system that handles the full lifecycle: **configure once, generate monthly, track payments**.

### The AI Pivot: Why I Removed the AI Upload Feature

The first version (v1, "Invoice Genius") used **OpenAI GPT-4o via Cloud Functions** to parse uploaded PDF invoices — extracting company names, amounts, and dates using vision + tool calling, then fuzzy-matching against configured email mappings.

It worked, but after using it with real invoices I realized the fundamental flaw: **landlords don't receive invoices, they send them**. The AI parser was solving the wrong problem. A warehouse owner doesn't need to extract data from someone else's invoice — they need to *generate* their own invoices from their tenant contracts.

So I ripped out the AI upload pipeline entirely and replaced it with:

- A **contract-driven Invoice Generator** that auto-populates everything from the company and member records
- **Automatic GST detection** by comparing state codes in GST numbers (first 2 digits)
- **Client-side PDF generation** with jsPDF — no server roundtrip needed
- **One-click email delivery** via Resend Cloud Functions

This shift from "AI-powered data extraction" to "contract-driven document generation" was the key architectural insight. The AI approach was technically impressive but operationally backwards. The manual form approach is faster, more reliable, and actually matches the real workflow.

---

## Features

### Core Modules

| Module | Description |
|---|---|
| **Dashboard** | 5 real-time KPIs (revenue, active companies, sent/paid/pending counts), 12-month revenue bar chart, recent invoices feed |
| **Companies** | Full tenant contract management — 13 fields including area, rate/sqft, possession date, annual increment %, invoice send day, rent due day, reminder buffer |
| **Members** | Landlord/payee profiles with bank details (name, branch, IFSC, account number) and GST info for invoice generation |
| **Invoice Generator** | Auto-populates from company + member records, computes base rent (area x rate), auto-detects GST type from state codes, generates PDF, emails via Resend |
| **Invoice History** | Searchable, filterable audit log with status tracking (Sent → Pending → Paid / Failed) |
| **Payment Reminder** | Time-locked send — reminders only available after `due_date + buffer_days`, shows days overdue, tracks reminder timestamps |
| **Payment Confirmation** | TDS reconciliation — validates that `amount_received + tds_deducted = invoice_total` before marking as Paid |
| **Email Settings** | Company-to-email mapping with sender, recipient, CC, BCC — auto-fills into Invoice Generator |

### Key Technical Decisions

- **GST Auto-Detection**: Compares first 2 characters of company and member GST numbers. Same state code → CGST 9% + SGST 9% (intra-state). Different → IGST 18% (inter-state). No user input needed.

- **Client-Side PDF Generation**: Uses `jspdf` + `jspdf-autotable` to render invoices in the browser before upload. No server-side rendering, no headless Chrome, no Puppeteer — just a clean 15KB PDF with landlord details, tenant block, line items, GST breakdown, and bank payment instructions.

- **Time-Locked Reminders**: Each company has a configurable `reminder_buffer_days`. The "Send Reminder" button is disabled until `today >= due_date + buffer`. This prevents premature reminder emails and keeps the landlord-tenant relationship professional.

- **TDS Reconciliation**: Indian tenants deduct TDS (Tax Deducted at Source) before paying. The payment confirmation form requires `amount_received + tds_amount = invoice_total` to reconcile. If it doesn't balance, the form blocks submission with an inline error.

- **Computed Monthly Rent**: `area_sqft × rate_per_sqft` is computed and stored. When creating an invoice, the generator pulls these values and allows override (e.g., for prorated months).

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite (port 8080) |
| **Styling** | Tailwind CSS, shadcn/ui (Radix primitives), CSS variables for theming |
| **State & Data** | TanStack React Query wrapping Firebase SDK calls |
| **Forms** | React Hook Form + Zod validation schemas |
| **PDF** | jsPDF + jspdf-autotable (client-side generation) |
| **Charts** | Recharts (bar charts for monthly revenue) |
| **Backend** | Firebase — Firestore (database), Cloud Functions (email sending), Storage (PDF files) |
| **Email** | Resend SDK (via Firebase Cloud Functions with secret management) |
| **Routing** | React Router v6 |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         React SPA (Vite)                        │
│                                                                 │
│  Dashboard ─ Companies ─ Members ─ Invoice Generator            │
│  Invoice History ─ Payment Reminder ─ Payment Confirmation      │
│  Email Settings                                                 │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ React Query  │  │  jsPDF       │  │  React Router v6   │    │
│  │ (data hooks) │  │  (PDF gen)   │  │  (8 routes)        │    │
│  └──────┬───────┘  └──────┬───────┘  └────────────────────┘    │
└─────────┼─────────────────┼─────────────────────────────────────┘
          │                 │
          ▼                 ▼
┌──────────────────────────────────────────┐
│              Firebase                     │
│                                          │
│  Firestore          Storage    Functions  │
│  ┌────────────┐    ┌───────┐  ┌────────┐│
│  │ companies  │    │ PDFs  │  │sendInv.││
│  │ members    │    │       │  │sendRem.││
│  │ invoices   │    └───────┘  └───┬────┘│
│  │ email_map  │                   │     │
│  └────────────┘                   ▼     │
│                              ┌────────┐ │
│                              │ Resend │ │
│                              └────────┘ │
└──────────────────────────────────────────┘
```

### Database Schema (Firestore)

**companies** — Tenant contract details
```
company_name, signing_authority, gst_number, registered_address,
warehouse_location, area_sqft, rate_per_sqft, monthly_base_rent,
possession_date, annual_increment, next_increment_date,
invoice_send_day, rent_due_day, reminder_buffer_days
```

**members** — Landlord/payee profiles
```
member_type (company | individual), name, address, gst_number,
bank_name, branch, ifsc_code, account_number
```

**invoices** — Full invoice records with payment tracking
```
invoice_number, invoice_period, company, member_id,
base_amount, gst_type, gst_rate, gst_amount, total_amount,
due_date, status (Sent | Pending | Paid | Failed),
recipient_email, sender_email, cc, bcc, file_name,
reminder_sent_at, payment_received, tds_amount, receipt_date,
bank_received_into, confirmed_at
```

**email_mappings** — Company-to-email routing
```
company, sender_email, primary_email, cc, bcc
```

---

## Invoice Generation Flow

```
1. User selects Company + Member (payee)
         │
2. Form auto-populates:
   ├── Warehouse address, area, rate from Company
   ├── Recipient/sender/CC/BCC from Email Mappings
   ├── Invoice number (INV-001, auto-incremented)
   └── GST type (auto-detected from state codes)
         │
3. Computed fields display:
   ├── Base Amount = area × rate
   ├── GST Amount = base × 18%
   ├── Total Payable = base + GST
   └── Due Date = next month + rent_due_day
         │
4. User clicks "Generate & Send"
         │
5. Client generates PDF (jsPDF)
         │
6. PDF uploaded to Firebase Storage
         │
7. Cloud Function sends email via Resend with PDF attachment
         │
8. Invoice saved to Firestore with status "Sent"
         │
9. Redirect to Invoice History
```

---

## Payment Lifecycle

```
  Invoice Generated
        │
        ▼
   ┌─────────┐
   │  Sent   │ ← Invoice emailed to tenant
   └────┬────┘
        │
        │  (after due_date + buffer_days)
        ▼
   ┌──────────┐
   │ Pending  │ ← Payment reminder sent
   └────┬─────┘
        │
        │  (tenant pays, landlord logs payment)
        ▼
   ┌─────────┐
   │  Paid   │ ← TDS reconciled: received + TDS = total
   └─────────┘
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project on the Blaze plan (required for Cloud Functions)

### Setup

```bash
# Clone and install
git clone <repo-url>
cd godown-ai
npm install

# Install Cloud Functions dependencies
cd functions && npm install && cd ..

# Configure environment
cp .env.example .env
# Fill in your Firebase config values in .env
```

### Firebase Setup

```bash
# Login and select project
firebase login
firebase use <your-project-id>

# Set the Resend API key as a secret
firebase functions:secrets:set RESEND_API_KEY

# Deploy Cloud Functions
firebase deploy --only functions
```

### Run Locally

```bash
npm run dev    # Frontend at http://localhost:8080
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

Cloud Functions use `RESEND_API_KEY` via Firebase secret management (not `.env`).

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server on port 8080 |
| `npm run build` | Production build |
| `npm run build:dev` | Dev build with sourcemaps |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests (Vitest) |
| `npm run test:watch` | Watch mode testing |
| `npm run lint` | ESLint |
| `cd functions && npm run build` | Compile Cloud Functions |
| `firebase deploy --only functions` | Deploy Cloud Functions |

---

## Project Structure

```
src/
├── pages/
│   ├── Index.tsx                # Dashboard — KPIs, revenue chart, recent invoices
│   ├── Companies.tsx            # Tenant contract CRUD (13 fields, Firestore-backed)
│   ├── Members.tsx              # Landlord/payee profiles with bank details
│   ├── InvoiceGenerator.tsx     # Form → PDF → email → Firestore pipeline
│   ├── InvoiceHistory.tsx       # Searchable invoice audit log with status filters
│   ├── PaymentReminder.tsx      # Time-locked reminder sends with overdue tracking
│   ├── PaymentConfirmation.tsx  # TDS reconciliation and payment logging
│   └── Settings.tsx             # Email mapping configuration
├── hooks/
│   ├── use-companies.ts         # Firestore CRUD hooks for companies
│   ├── use-members.ts           # Firestore CRUD hooks for members
│   ├── use-invoices.ts          # Invoice queries + status update mutations
│   └── use-email-mappings.ts    # Email mapping CRUD hooks
├── components/
│   ├── AppSidebar.tsx           # Collapsible sidebar with 8 nav items
│   ├── DashboardLayout.tsx      # Page wrapper with sidebar
│   └── ui/                      # shadcn/ui primitives (don't edit directly)
├── integrations/firebase/
│   ├── config.ts                # Firebase SDK initialization
│   └── types.ts                 # TypeScript interfaces for all collections
functions/
└── src/index.ts                 # sendInvoice + sendPaymentReminder Cloud Functions
```

---

## Evolution: v1 → v2

| Aspect | v1 ("Invoice Genius") | v2 ("GodownOS") |
|---|---|---|
| **Core flow** | Upload PDF → AI extracts data → log invoice | Configure contracts → generate invoice → email → track payment |
| **AI dependency** | OpenAI GPT-4o for every invoice | None — deterministic computation from stored contract data |
| **Data source** | AI-extracted (unreliable for handwritten invoices) | User-configured contracts (reliable, auditable) |
| **PDF handling** | Upload existing PDFs | Generate new PDFs client-side with jsPDF |
| **GST** | Not handled | Auto-detected from GST state codes |
| **Payment tracking** | Not implemented | Full lifecycle: Sent → Pending → Paid with TDS reconciliation |
| **Companies** | 3 fields, local state | 13 fields, Firestore-persisted |
| **Members** | 1 field (name only), local state | 8 fields with bank details, Firestore-persisted |
| **Email** | Manual (no sending) | Automated via Resend with PDF attachment |
| **Cloud Functions** | `parseInvoice` (OpenAI) | `sendInvoice` + `sendPaymentReminder` (Resend) |
| **Cost per invoice** | ~$0.03 (GPT-4o API call) | $0.00 (no AI calls) |

---

## What's Next

- [ ] Firebase Authentication (currently open — flagged for pre-production)
- [ ] Automatic rent increment notifications based on `next_increment_date`
- [ ] Email template customization (UI exists, not yet wired to backend)
- [ ] Multi-warehouse / multi-landlord support
- [ ] Bulk invoice generation (all companies in one click)
- [ ] Export to Excel / CSV for accountants

---

## License

MIT
