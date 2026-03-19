# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Dev server on http://localhost:8080
npm run build         # Production build → dist/
npm run build:dev     # Dev build with sourcemaps
npm run preview       # Serve production build locally
npm run test          # Run tests once (vitest)
npm run test:watch    # Watch mode testing
npm run lint          # ESLint on .ts/.tsx files
```

### Cloud Functions
```bash
cd functions && npm run build    # Compile Cloud Functions
cd functions && npm run serve    # Local emulator
firebase deploy --only functions # Deploy functions
```

## Architecture

**Godown AI / GodownOS** is a warehouse rental invoicing SPA for Indian landlords. It handles tenant contracts, GST-compliant invoice generation (client-side PDF via jsPDF), email delivery (via Resend), payment reminders, and TDS reconciliation.

**Live:** godown-ai.vercel.app
**Firebase project:** `godown-ai-01`

### Tech Stack
- **Frontend:** React 18 + TypeScript, Vite (port 8080), Tailwind CSS, shadcn/ui (Radix primitives)
- **Backend:** Firebase (Firestore + Cloud Functions + Storage)
- **Email:** Resend API (key stored as Firebase secret `RESEND_API_KEY`)
- **Data fetching:** TanStack React Query wrapping Firebase SDK calls
- **Forms:** React Hook Form + Zod validation
- **PDF:** jsPDF + jspdf-autotable (client-side generation)
- **Charts:** Recharts (dashboard revenue chart)
- **Deployment:** Vercel (frontend), Firebase (backend)

### Key Patterns

- **Path alias:** `@/*` maps to `src/*`
- **Firebase config:** `src/integrations/firebase/config.ts` exports `db`, `storage`, `functions` (region: `us-central1`)
- **Type definitions:** `src/integrations/firebase/types.ts` has interfaces for all Firestore collections
- **Data hooks:** `src/hooks/use-companies.ts`, `use-members.ts`, `use-invoices.ts`, `use-email-mappings.ts` — each wraps Firestore queries in React Query hooks. Mutations invalidate queries via `queryClient.invalidateQueries()`.
- **Pages** are route-level containers in `src/pages/`. All wrapped in `DashboardLayout` with `AppSidebar`.
- **UI components** in `src/components/ui/` are shadcn/ui primitives — don't edit directly, use `npx shadcn-ui@latest add <component>` to add new ones.
- **Theming:** CSS variables (HSL) in `src/index.css` with dark mode via class toggle (`next-themes`).
- **Notifications:** Sonner toast library.

### Routes (12 total)

| Path | Page | Access | Purpose |
|------|------|--------|---------|
| `/login` | Login | Public | Email/password sign-in |
| `/accept-invite` | AcceptInvite | Public | Invite acceptance + account creation |
| `/setup` | Setup | Authenticated | One-time org bootstrap |
| `/` | Index | Protected | Dashboard — KPIs, revenue chart, recent invoices |
| `/companies` | Companies | Protected | Tenant contract CRUD (13 fields) |
| `/members` | Members | Protected | Landlord/payee profiles (bank details) |
| `/invoice-generator` | InvoiceGenerator | Protected | PDF generation + email send pipeline |
| `/invoice-history` | InvoiceHistory | Protected | Searchable invoice audit log |
| `/payment-reminder` | PaymentReminder | Protected | Time-locked reminder sends |
| `/payment-confirmation` | PaymentConfirmation | Protected | TDS reconciliation + payment logging |
| `/settings` | Settings | Protected | Email mapping configuration |
| `/team` | TeamManagement | Admin only | Invite users, manage team access |

### Invoice Generation Flow (v2 — contract-driven, no AI)
1. User selects company + member on `/invoice-generator`
2. Invoice fields auto-calculated from contract terms (area, rate, GST)
3. GST type auto-detected via state code parsing (IGST vs CGST+SGST)
4. Client generates PDF via jsPDF
5. PDF uploaded to Firebase Storage (`invoices/INV-NNN.pdf`)
6. Cloud Function `sendInvoice` downloads PDF from Storage, emails via Resend
7. Invoice logged to `invoices` collection (status: "Sent")

### Payment Lifecycle
`Sent` → `Pending` (reminder sent, time-locked by `reminder_buffer_days`) → `Paid` (TDS reconciliation confirmed)

### Cloud Functions (`functions/src/index.ts`)
Eight `onCall` functions. Auth-protected functions verify `request.auth` and check user roles in Firestore.

**Email functions** (require auth + role admin|manager, use `RESEND_API_KEY` secret):
1. **`sendInvoice`** — Downloads PDF from Storage, sends email with attachment via Resend
2. **`sendPaymentReminder`** — Sends reminder email (no attachment), best-effort Firestore status update

**Invite management** (require auth + admin role):
3. **`createInvite`** — Generates secure token, stores hash, sends invite email
4. **`resendInvite`** — Regenerates token, resends invite email
5. **`revokeInvite`** — Marks invite as revoked

**Account management:**
6. **`acceptInvite`** — Public. Validates token, creates Firebase Auth user + Firestore user doc
7. **`updateUserStatus`** — Admin only. Toggles user active/disabled
8. **`initializeOrganization`** — One-time bootstrap. Only callable by `admin@oltaflock.ai`

All called from the client via `httpsCallable()`. Firebase SDK automatically attaches auth tokens.

### Database (Firestore)
- **organizations:** name, primaryAdminEmail, createdAt, updatedAt
- **users:** email, fullName, organizationId, role (admin|manager|member), status (active|disabled), invitedBy, createdAt, updatedAt. Document ID = Firebase Auth UID.
- **invites:** email, organizationId, role, status (invited|accepted|expired|revoked), tokenHash, expiresAt, invitedBy, acceptedAt, createdAt, updatedAt
- **companies:** company_name, signing_authority, gst_number, registered_address, warehouse_location, area_sqft, rate_per_sqft, monthly_base_rent, possession_date, annual_increment, next_increment_date, invoice_send_day, rent_due_day, reminder_buffer_days
- **members:** member_type, name, address, gst_number, bank_name, branch, ifsc_code, account_number
- **invoices:** company, amount, invoice_date, invoice_number, invoice_period, member_id, base_amount, gst_type, gst_rate, gst_amount, total_amount, due_date, recipient_email, sender_email, cc, bcc, file_name, status, reminder_sent_at, payment_received, tds_amount, receipt_date, bank_received_into, confirmed_at, created_at
- **email_mappings:** company, sender_email, primary_email, cc, bcc
- **Storage:** `invoices/` path for PDF files

### Auth & Security
- **Firebase Authentication:** Email/password, invite-only signup
- **Roles:** admin, manager, member
- **Firestore rules:** Role-based authenticated access. `users`/`invites`/`organizations` managed by Cloud Functions only.
- **Storage rules:** Authenticated users can read/write `invoices/*`
- **Cloud Functions:** All privileged functions verify `request.auth` and check user roles in Firestore
- **Route protection:** `ProtectedRoute` (auth required), `AdminRoute` (admin role required)
- Admin email for Oltaflock Warehousing LLP: `admin@oltaflock.ai`
- See `docs/auth-invite-architecture.md` for full architecture documentation

### Currency
All monetary values use INR (₹).

### Environment Variables
Frontend (Vite-prefixed, public):
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`

Backend (Firebase secrets):
- `RESEND_API_KEY` — set via `firebase functions:secrets:set RESEND_API_KEY`
