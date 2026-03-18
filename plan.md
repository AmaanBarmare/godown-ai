# GodownOS — Implementation Plan

**Goal:** Transform the current "Invoice Genius" prototype into the full GodownOS dashboard as
specified in the walkthrough document. This covers 8 modules: Dashboard, Companies,
Invoice History, Members, Email Settings, Invoice Generator, Payment Reminder, and
Payment Confirmation.

**Assumption on email:** Resend will be configured separately. All email-sending Cloud
Functions will be stubbed with the Resend SDK call wired up but the API key left as a
secret to be populated later.

---

## What Exists vs. What Needs to Change

| Module | Current State | Target State |
|---|---|---|
| Dashboard | Basic KPIs + chart | Updated KPIs + Paid/Pending counts |
| Companies | Local state, 3 fields | Firestore, 12 fields (full contract) |
| Invoice History | Firestore, basic fields | Add invoice_number, period, "Paid" status |
| Members | Local state, 1 field | Firestore, bank details + GST |
| Email Settings | Firestore, 4 fields | Add sender_email field |
| Invoice Sender (AI upload) | Exists | **DELETE — replaced by Invoice Generator** |
| Invoice Generator | Does not exist | New page — manual form, PDF, email send |
| Payment Reminder | Does not exist | New page — time-locked send |
| Payment Confirmation | Does not exist | New page — TDS reconciliation |

---

## Phase 1 — Data Layer & Schema

**Goal:** Establish the correct Firestore schema for all collections before touching UI.

### 1.1 — Companies collection (new)

Move companies from `useState` to a `companies` Firestore collection.

Fields per document:
```
company_name        string   required
signing_authority   string   required
gst_number          string   required
registered_address  string   required
warehouse_location  string   required
area_sqft           number   required  (e.g. 50000)
rate_per_sqft       number   required  (e.g. 10)
monthly_base_rent   number   computed (area_sqft × rate_per_sqft, stored for reference)
possession_date     string   required  (ISO date)
annual_increment    number   required  (e.g. 5 for 5%)
next_increment_date string   required  (ISO date)
invoice_send_day    number   required  (e.g. 25 — day of month)
rent_due_day        number   required  (e.g. 5)
reminder_buffer_days number  required  (e.g. 5)
created_at          string   auto
updated_at          string   auto
```

New hook: `src/hooks/use-companies.ts`
- `useCompanies()` — query all, ordered by company_name
- `useAddCompany()` — mutation
- `useUpdateCompany()` — mutation
- `useDeleteCompany()` — mutation

### 1.2 — Members collection (new)

Move members from `useState` to a `members` Firestore collection.

Fields per document:
```
member_type     string   "company" | "individual"
name            string   required  (company name or person name)
address         string   required
gst_number      string   required
bank_name       string   required
branch          string   required
ifsc_code       string   required
account_number  string   required
created_at      string   auto
updated_at      string   auto
```

New hook: `src/hooks/use-members.ts`
- `useMembers()` — query all
- `useAddMember()` — mutation
- `useUpdateMember()` — mutation
- `useDeleteMember()` — mutation

### 1.3 — Update invoices schema

Add fields to existing `invoices` collection documents:
```
invoice_number   string   e.g. "INV-001"  (sequential, auto-generated)
invoice_period   string   e.g. "February 2025"
member_id        string   FK to members collection (payee)
base_amount      number
gst_type         string   "IGST" | "CGST+SGST"
gst_rate         number   e.g. 18
gst_amount       number
total_amount     number
due_date         string   ISO date
```

Update `status` enum to: `"Sent" | "Pending" | "Paid" | "Failed"`

Update hook `src/hooks/use-invoices.ts`:
- Add `useUpdateInvoiceStatus()` mutation (used by Payment Confirmation + Reminder)
- Add `useInvoicesByStatus()` helper

### 1.4 — Update email_mappings schema

Add one field to existing `email_mappings` documents:
```
sender_email   string   required  (landlord's outgoing email)
```

Update `useAddEmailMapping` and `useUpdateEmailMapping` to include this field.

---

## Phase 2 — Companies Page Overhaul

**File:** `src/pages/Companies.tsx`

Replace the current 3-field local-state form with a full Firestore-backed form.

**Form fields (matches Step 1 of walkthrough):**
- Company Name (text)
- Signing Authority (text)
- GST Number (text)
- Registered Address (textarea)
- Warehouse Location (textarea)
- Area in sq.ft. (number)
- Rate per sq.ft. (₹, number) — auto-computes Monthly Base Rent display
- Possession Date (date picker)
- Annual Increment % (number)
- Next Increment Date (date picker)
- Invoice Send Day (number, 1–28)
- Rent Due Day (number, 1–28)
- Reminder Buffer Days (number)

**Table columns:** Company Name, Area, Rate/sqft, Monthly Rent, Next Increment Date, Actions

**Validation:** Zod schema for all required fields.

**Computed display:** Monthly Base Rent = Area × Rate shown read-only in form.

---

## Phase 3 — Members Page Overhaul

**File:** `src/pages/Members.tsx`

Replace the single-name local-state form with a full Firestore-backed form.

**Form fields (matches Step 2 of walkthrough):**
- Member Type (radio: Company / Individual)
- Name (text — "Company Name" or "Person Name" label swaps based on type)
- Address (textarea)
- GST Number (text)
- Bank Name (text)
- Branch (text)
- IFSC Code (text)
- Account Number (text)

**Card display:** Show name, address, bank summary (Bank — Branch — IFSC).

**Note:** In practice there will typically be one member (the landlord), but the UI supports multiple.

---

## Phase 4 — Email Settings Update

**File:** `src/pages/Settings.tsx`

Add `sender_email` field to the Email Mapping form:
- Label: "Sender Email (Landlord)"
- Position: between Company and Primary Email fields
- Zod validation: required, valid email

Update `useAddEmailMapping` and `useUpdateEmailMapping` hooks to persist this field.

---

## Phase 5 — Invoice Generator (New Page)

**File:** `src/pages/InvoiceGenerator.tsx`
**Route:** `/invoice-generator`

This replaces the old `/invoice-sender` route entirely.

### 5.1 — Form

The form auto-populates from the selected Company and the first (or selected) Member.

**Fields:**
- Company selector (dropdown from `useCompanies`) — triggers auto-fill
- Member / Payee selector (dropdown from `useMembers`) — triggers auto-fill
- Invoice Number (auto-generated as INV-XXX, editable)
- Invoice Date (date picker, defaults to today)
- Invoice Period (month+year picker, e.g. "February 2025")
- Warehouse Address (auto-filled from company, editable)
- Area sqft (auto-filled, editable)
- Rate per sqft (auto-filled, editable)
- Base Amount (computed: area × rate, read-only)
- GST Type (auto-detected from GST numbers, read-only display)
- GST Amount (computed, read-only)
- Total Payable (computed, read-only)
- Recipient Email (auto-filled from email_mappings for selected company)
- Sender Email (auto-filled from email_mappings)
- CC / BCC (auto-filled from email_mappings)

### 5.2 — GST Auto-Detection Logic

Compare the first two characters of the company's `gst_number` vs the member's `gst_number`:
- Same state code → CGST 9% + SGST 9% (intra-state)
- Different state code → IGST 18% (inter-state)

Display the GST type clearly in the form before the user sends.

### 5.3 — Invoice Number Generation

Query the `invoices` collection for the count of existing invoices, then generate `INV-{n+1}` zero-padded to 3 digits (INV-001, INV-002, …).

### 5.4 — PDF Generation (client-side)

Use `jspdf` + `jspdf-autotable` to generate the invoice PDF client-side before sending.

PDF layout:
- Header: Member (landlord) name, address, GST
- Invoice metadata: number, date, period
- Tenant block: company name, signing authority, GST, address
- Line items table: Area, Rate, Base Amount
- GST row: type + amount
- Total row
- Payment instructions: bank name, branch, IFSC, account number
- Footer note

### 5.5 — Send Flow

1. User clicks "Generate & Send"
2. Client generates PDF via jspdf
3. PDF uploaded to Firebase Storage at `invoices/{invoice_number}.pdf`
4. Callable Cloud Function `sendInvoice` is called with: invoice data + file path + email addresses
5. Cloud Function sends email via Resend with PDF attachment
6. On success: invoice document written to `invoices` collection with status `"Sent"`
7. User sees success toast and is redirected to Invoice History

### 5.6 — Cloud Function: `sendInvoice`

**Input:**
```typescript
{
  invoiceData: { /* all invoice fields */ },
  filePath: string,
  recipientEmail: string,
  senderEmail: string,
  cc?: string,
  bcc?: string
}
```

**Logic:**
1. Download PDF from Firebase Storage
2. Send email via Resend SDK with PDF as attachment
3. Return `{ success: true }`

**Note:** Resend API key stored as Firebase secret `RESEND_API_KEY`.

---

## Phase 6 — Payment Reminder (New Page)

**File:** `src/pages/PaymentReminder.tsx`
**Route:** `/payment-reminder`

### 6.1 — Display

List all invoices with status `"Sent"` where:
`today >= due_date + reminder_buffer_days`

For each invoice, show:
- Company name
- Invoice number + period
- Amount
- Due date
- Days overdue
- "Send Reminder" button (active only when condition above is met)
- If `today < due_date + buffer`: button is disabled with label "Available on {date}"

Also show invoices with status `"Pending"` (reminder already sent) separately with timestamp of when reminder was sent.

### 6.2 — Send Flow

1. User clicks "Send Reminder" for an invoice
2. Callable Cloud Function `sendPaymentReminder` is called
3. Cloud Function sends reminder email via Resend referencing invoice number, amount, original due date
4. Invoice status updated to `"Pending"` in Firestore

### 6.3 — Cloud Function: `sendPaymentReminder`

**Input:**
```typescript
{
  invoiceId: string,
  recipientEmail: string,
  senderEmail: string,
  invoiceNumber: string,
  amount: number,
  dueDate: string,
  companyName: string
}
```

**Logic:**
1. Send reminder email via Resend
2. Update invoice status to `"Pending"` in Firestore
3. Add `reminder_sent_at` timestamp to invoice document

---

## Phase 7 — Payment Confirmation (New Page)

**File:** `src/pages/PaymentConfirmation.tsx`
**Route:** `/payment-confirmation`

### 7.1 — Display

List all invoices with status `"Sent"` or `"Pending"` (awaiting payment).
For each, show an "Log Payment" button that opens a confirmation form.

### 7.2 — Form

- Invoice Reference (read-only, pre-filled)
- Amount Received After TDS (₹, number input)
- TDS Amount Deducted (₹, number input)
- Total Reconciled (read-only, computed: received + TDS — validated to equal invoice total)
- Date of Receipt (date picker)
- Bank Received Into (text, pre-filled from member bank name)

**Validation:** `amount_received + tds_amount` must equal `invoice.total_amount`. Show
inline error if it doesn't reconcile.

### 7.3 — On Confirm

1. Write payment record to a new `payments` sub-field on the invoice document:
   ```
   payment_received: number
   tds_amount: number
   receipt_date: string
   bank_received_into: string
   confirmed_at: string
   ```
2. Update invoice `status` to `"Paid"`
3. Toast: "Payment confirmed. Invoice marked as Paid."

---

## Phase 8 — Invoice History Updates

**File:** `src/pages/InvoiceHistory.tsx`

Update the table columns to reflect the new schema:
- Invoice No. (new column, first)
- Tenant / Company
- Period (new column, e.g. "Feb 2025")
- Amount (total_amount)
- Sent Date
- Due Date (new column)
- Status (Sent / Pending / Paid / Failed — color-coded badges)

Add `"Paid"` to the status filter buttons.

---

## Phase 9 — Dashboard Updates

**File:** `src/pages/Index.tsx`

Update KPI cards:
- **Total Revenue** — sum of `total_amount` for all Paid invoices (current month)
- **Active Companies** — count from `companies` collection
- **Invoices Sent** — count of all invoices this month
- **Invoices Paid** — count with status "Paid"
- **Invoices Pending** — count with status "Sent" or "Pending"

Monthly Revenue Chart: bar chart, group Paid invoice amounts by month (last 12 months).

Recent Invoices table: show last 5 invoices with Invoice No., Company, Period, Amount, Status.

---

## Phase 10 — Sidebar & Routing Cleanup

**File:** `src/components/AppSidebar.tsx`

Update navigation items:
- Dashboard → `/`
- Companies → `/companies`
- Members → `/members`
- Invoice Generator → `/invoice-generator` ← rename from "Invoice Sender"
- Invoice History → `/invoice-history`
- Payment Reminder → `/payment-reminder` ← new
- Payment Confirmation → `/payment-confirmation` ← new
- Email Settings → `/settings`

**File:** `src/App.tsx`

- Remove route `/invoice-sender`
- Add route `/invoice-generator` → `InvoiceGenerator`
- Add route `/payment-reminder` → `PaymentReminder`
- Add route `/payment-confirmation` → `PaymentConfirmation`
- Delete `src/pages/InvoiceSender.tsx`

---

## Phase 11 — Cloud Functions Cleanup

**File:** `functions/src/index.ts`

- Remove `parseInvoice` function (no longer needed — AI upload is replaced)
- Add `sendInvoice` function (Phase 5.6)
- Add `sendPaymentReminder` function (Phase 6.3)
- Install Resend SDK: `cd functions && npm install resend`
- Add `RESEND_API_KEY` as a Firebase secret (value to be populated by user)

---

## Execution Order

Build in this sequence to avoid blocking dependencies:

1. **Phase 1** — Schema + hooks (everything else depends on this)
2. **Phase 2** — Companies page (needed before Invoice Generator auto-fill works)
3. **Phase 3** — Members page (needed before Invoice Generator auto-fill works)
4. **Phase 4** — Email Settings update (needed before Invoice Generator email routing)
5. **Phase 11** — Cloud Functions (can be done in parallel with 2–4)
6. **Phase 5** — Invoice Generator (depends on 1, 2, 3, 4, 11)
7. **Phase 6** — Payment Reminder (depends on 1, 11)
8. **Phase 7** — Payment Confirmation (depends on 1)
9. **Phase 8** — Invoice History updates (depends on 1)
10. **Phase 9** — Dashboard updates (depends on 1)
11. **Phase 10** — Sidebar + routing cleanup (can be done anytime after 5, 6, 7)

---

## Out of Scope (for now)

- Authentication / user login (flagged in CLAUDE.md as pre-production concern)
- Email template customization (UI exists in Settings but is non-functional — leave as-is)
- Automatic rent increment notifications (manual update via Companies tab per PDF spec)
- Multi-warehouse / multi-landlord support
