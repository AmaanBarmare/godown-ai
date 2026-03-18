# Test Guide (Dashboard-First, End-to-End) — GodownAI

This guide helps you **test everything from inside the dashboard UI** (the way a real user would), end-to-end, using **mock values**.

Assumptions:
- Firebase project: `godown-ai-01`
- Firestore + Storage are enabled
- Cloud Functions deployed: `sendInvoice`, `sendPaymentReminder`
- Secret set: `RESEND_API_KEY`
- No Auth (rules are open in dev)

---

## 0) Quick pre-flight checks

Run these from repo root:

```bash
firebase functions:list --project godown-ai-01
firebase functions:secrets:get RESEND_API_KEY --project godown-ai-01
```

Expected:
- Functions list shows `sendInvoice` and `sendPaymentReminder`
- `RESEND_API_KEY` shows at least one ENABLED version

Start the app:

```bash
npm run dev
```

Open `http://localhost:8080`.

---

## 1) Seed mock data (Firestore) — one-time setup

Open **Firebase Console → Firestore Database → Data** for project `godown-ai-01`.

### Important: pick the right database
If you see two Firestore databases (example: `(default)` and `godown-ai`), **select `(default)`**.

Reason: the app uses the normal Firebase Web SDK initialization (`getFirestore(app)`), which connects to the **`(default)`** Firestore database unless you explicitly coded a named database.

### Important: Firestore Console doesn’t accept pasted JSON here
The “Start collection” UI is **field-by-field** (no JSON paste box). Use the steps below to enter each document.

Create these documents/collections. **Document ID** can be **Auto-ID** (recommended).

### A) `members` (1 doc)

Collection: `members`

Steps:
- Click **Start collection**
- **Collection ID**: `members` → **Next**
- **Document ID**: click **Auto-ID**
- Click **Add field** and add:
  - `member_type` → type **string** → value `company`
  - `name` → **string** → `OltaFlock Warehousing LLP`
  - `address` → **string** → `Plot 12, MIDC Industrial Area, Andheri East, Mumbai, MH 400093`
  - `gst_number` → **string** → `27AABCO1234F1Z5`
  - `bank_name` → **string** → `HDFC Bank`
  - `branch` → **string** → `Andheri East`
  - `ifsc_code` → **string** → `HDFC0000123`
  - `account_number` → **string** → `123456789012`
- Click **Save**

### B) `companies` (1 doc)

Collection: `companies`

Steps:
- Click **Start collection**
- **Collection ID**: `companies` → **Next**
- **Document ID**: **Auto-ID**
- Click **Add field** and add:
  - `company_name` → **string** → `Acme Retail Pvt Ltd`
  - `signing_authority` → **string** → `Rohit Sharma`
  - `gst_number` → **string** → `27AAECA1234A1ZP`
  - `registered_address` → **string** → `5th Floor, Acme Towers, Lower Parel, Mumbai, MH 400013`
  - `warehouse_location` → **string** → `Bhiwandi, Thane, MH`
  - `area_sqft` → **number** → `2500`
  - `rate_per_sqft` → **number** → `42`
  - `monthly_base_rent` → **number** → `105000`
  - `possession_date` → **string** → `2026-01-01`
  - `annual_increment` → **number** → `5`
  - `next_increment_date` → **string** → `2027-01-01`
  - `invoice_send_day` → **number** → `1`
  - `rent_due_day` → **number** → `7`
  - `reminder_buffer_days` → **number** → `3`
- Click **Save**

### C) `email_mappings` (1 doc)

Collection: `email_mappings`

Important:
- Use a **real email** you control for `primary_email` so you can verify delivery.
- **`sender_email` = FROM address** (who sends). Resend generally **does not** let you send “From: admin@oltaflock.ai” unless the `oltaflock.ai` domain is **verified in Resend**.
- If you **don’t** have a verified domain yet, use a Resend-provided sender such as `onboarding@resend.dev` (if your Resend account allows it). This is the easiest way to test end-to-end delivery.
- **`primary_email` = TO address** (who receives). For testing, set this to your own inbox (example: `admin@oltaflock.ai`) so you can confirm the email arrives.

Steps:
- Click **Start collection**
- **Collection ID**: `email_mappings` → **Next**
- **Document ID**: **Auto-ID**
- Click **Add field** and add:
  - `company` → **string** → `Acme Retail Pvt Ltd`
  - `sender_email` → **string** → `onboarding@resend.dev` *(or your verified sender address)*
  - `primary_email` → **string** → `admin@oltaflock.ai` *(your inbox for testing)*
  - `cc` → **string** → *(leave empty)* or put a real CC email
  - `bcc` → **string** → *(leave empty)* or put a real BCC email
- Click **Save**

---

## 2) Start testing from the Dashboard (UI-only flow)

Go to **Dashboard** first.

Expected right after seeding (before creating invoices):
- Revenue / invoices KPIs may be **0** (normal)
- “Active Companies” should show **1** (Acme) once your Companies page is Firestore-backed

Now follow the sidebar in order.

---

## 3) Companies (CRUD) — from the sidebar

From the sidebar, open **Companies**.
- Confirm “Acme Retail Pvt Ltd” exists.
- Edit one field (easy test): change `rate_per_sqft` from `42` → `45`, save.
- Refresh the page: confirm it stayed `45`.

---

## 4) Members (CRUD) — from the sidebar

From the sidebar, open **Members**.
- Confirm “OltaFlock Warehousing LLP” exists.
- Edit one field (easy test): change `branch` → `Andheri East - 2`, save.
- Refresh: confirm it persisted.

---

## 5) Email Settings — from the sidebar

From the sidebar, open **Email Settings**.
- Confirm there is an entry for “Acme Retail Pvt Ltd”.
- Set **real testing emails**:
  - `primary_email`: your real inbox (so you can confirm emails arrive)
  - `sender_email`: must be a sender Resend accepts (verified domain/sender)
- Save and refresh once to confirm it persisted.

---

## 6) Invoice Generator (this tests the “main pipeline”)

From the sidebar, open **Invoice Generator**.

Select:
- Company: `Acme Retail Pvt Ltd`
- Member: `OltaFlock Warehousing LLP`

Expected computed values (with the seed values):
- **Base Amount**: \(2500 × 42 = 105000\) (or \(2500 × 45 = 112500\) if you changed rate)
- GST (same state code `27` vs `27`): **CGST 9% + SGST 9%** (total 18%)
- Total = base + 18%

Click **Generate & Send**.

✅ This single action tests:
- PDF generation (client)
- Storage upload
- Cloud Function `sendInvoice`
- Resend delivery
- Firestore invoice creation with status `"Sent"`

What to verify (still from “dashboard tools”):
- **Invoice History** shows a new invoice immediately
- Your email inbox (`primary_email`) receives an email with a PDF attachment

If the UI shows an error:
- Open Google Cloud Console → Cloud Run → `sendinvoice` → Logs and read the latest error line.

---

## 7) Invoice History (search + filters)

From the sidebar, open **Invoice History**.
- Confirm the invoice you just sent appears.
- Search:
  - `Acme`
  - invoice number shown in the table
- Filter statuses:
  - Sent / Pending / Paid

---

## 8) Payment Reminder (tests time-lock + email reminder + status update)

From the sidebar, open **Payment Reminder**.

If the “Send Reminder” button is disabled, it’s because of:
- `due_date + reminder_buffer_days`

Fastest way to test without waiting:
- Go to Firestore Console and edit the invoice `due_date` to `"2026-01-01"` (old date)

Back in the dashboard:
- Refresh **Payment Reminder**
- Click **Send Reminder**

Verify (from the dashboard):
- Invoice status becomes `"Pending"` (you can confirm in **Invoice History**)
- Email reminder arrives in your inbox

---

## 9) Payment Confirmation (tests TDS validation + Paid status)

From the sidebar, open **Payment Confirmation**.

Pick the same invoice and test:

### Case A (should FAIL)
- Total: use the invoice total shown in UI
- Amount received: `120000`
- TDS: `2000`
- Expected: UI blocks submission (sum mismatch)

### Case B (should PASS)
- Amount received: `120000`
- TDS: set it so \(received + tds = total\)
  - Example if total is `123900`: TDS = `3900`

Verify (from the dashboard):
- Invoice status becomes `"Paid"`

---

## 10) Back to Dashboard (final verification)

Return to **Dashboard**.

Expected now that you have 1 Paid invoice:
- “Invoices Paid” KPI increases
- Revenue reflects that Paid invoice (depending on the dashboard’s “month” logic)
- Recent invoices shows your latest invoice activity

---

## 10) Troubleshooting checklist (most common)

- **Functions list shows only old function(s)**:
  - Rebuild functions: `cd functions && npm run build`
  - Deploy: `firebase deploy --only functions --project godown-ai-01`

- **Email not delivered**:
  - Resend sender domain not verified OR invalid `from`
  - Check Cloud Run logs for `sendinvoice`

- **Reminder button disabled**:
  - Adjust invoice `due_date` older in Firestore or reduce `reminder_buffer_days`

- **Permission/IAM confusion (Cloud Run UI)**:
  - For testing, don’t hit Cloud Run service URL directly.
  - The app should call Firebase callable endpoints via the Firebase SDK.

---

## Mock values reference (copy/paste)

- **Company**: `Acme Retail Pvt Ltd`
- **Member**: `OltaFlock Warehousing LLP`
- **area_sqft**: `2500`
- **rate_per_sqft**: `42`
- **base (at rate 42)**: `105000`
- **base (at rate 45)**: `112500`
- **gst total**: `18%`
- **gst amount (base 105000)**: `18900`
- **total (base 105000)**: `123900`
- **fast reminder due_date**: `"2026-01-01"`

