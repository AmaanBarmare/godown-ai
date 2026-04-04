# Current Context — Changes Made This Session

## Change 1: Flexible Payment Confirmation (Manual Fields + No Strict Validation)

**Files changed:** `src/pages/PaymentConfirmation.tsx`

**What changed:**
- **Total Reconciled** is now an editable input field instead of a read-only computed display. It auto-updates as you type in Amount Received or TDS Amount, but the user can manually override it to any value.
- **Strict validation removed** — the Confirm Payment button is no longer disabled when the numbers don't add up to the invoice total. Users can save partial payments, unexpected deductions, or any real-world scenario.
- **Informational indicator kept** — a subtle text line below Total Reconciled shows whether it matches the invoice total (green checkmark) or displays the invoice total for reference. Purely informational, never blocking.
- Removed the `error` state, `setError` calls, blocking validation logic, and unused `cn` import.

**Why:**
The old system enforced `amount received + TDS = invoice total` and blocked the form if it didn't balance. In practice, tenants make partial payments, apply unexpected deductions, or pay in installments. The strict rule prevented landlords from recording what actually happened. The new approach gives full control to log payments exactly as received.

---

## Change 2: README.md Updates

**File changed:** `README.md`

**What changed:**
- **Key Design Decisions → TDS Reconciliation** — rewrote the section to describe the new flexible behavior and explain why the strict rule was removed.
- **Features table** — updated the Payment Confirmation row to reflect that it saves in any state.
- **Payment Lifecycle diagram** — removed the `received + TDS = total` note that implied enforcement.
- **Bugs Caught & Fixed** — added a full entry documenting the payment confirmation redesign: what the old rule was, why it failed in practice, what changed, and the broader takeaway.
- **Roadmap** — marked flexible payment confirmation as completed.

---

## Change 3: CLAUDE.md — Working Principle Added

**File changed:** `CLAUDE.md`

**What changed:**
- Added a **Working Principle** section: "Do not make a change unless you are highly confident it is correct. If there is genuine uncertainty about the right approach — whether the logic is correct, whether it could break something, or whether it matches the intent — stop and clarify before proceeding. Speculation that gets committed is harder to undo than a question asked upfront."

---

## Change 4: CORS Fix — Migrate sendInvoice & sendPaymentReminder to Firestore Trigger Pattern

**Files changed:**
- `functions/src/index.ts`
- `src/pages/InvoiceGenerator.tsx`
- `src/pages/PaymentReminder.tsx`

**Root cause:**
`sendInvoice` and `sendPaymentReminder` were using direct `onCall` (httpsCallable), which gets blocked by Google Cloud's "Domain Restricted Sharing" org policy. The CORS preflight (OPTIONS) request is unauthenticated, so Cloud Run rejects it. This is the same issue that was already solved for invites/org setup.

**What changed:**

### functions/src/index.ts
- Added `handleSendInvoice()` handler function — downloads PDF from Storage, sends email via Resend with attachment.
- Added `handleSendPaymentReminder()` handler function — sends reminder email via Resend, best-effort Firestore status update.
- Registered both as cases (`"sendInvoice"`, `"sendPaymentReminder"`) in the `processRequests` Firestore trigger switch statement.

### src/pages/InvoiceGenerator.tsx
- Replaced `import { httpsCallable } from "firebase/functions"` and `import { functions } from "@/integrations/firebase/config"` with `import { submitRequest } from "@/lib/request-client"` and `import { useAuth } from "@/contexts/AuthContext"`.
- Added `const { user } = useAuth()` hook call.
- Replaced `httpsCallable(functions, "sendInvoice")` call with `submitRequest("sendInvoice", ..., user!.uid, 60000)` (60s timeout since PDF download + email can be slow).

### src/pages/PaymentReminder.tsx
- Replaced `import { httpsCallable } from "firebase/functions"` and `import { functions } from "@/integrations/firebase/config"` with `import { submitRequest } from "@/lib/request-client"` and `import { useAuth } from "@/contexts/AuthContext"`.
- Added `const { user } = useAuth()` hook call.
- Replaced `httpsCallable(functions, "sendPaymentReminder")` call with `submitRequest("sendPaymentReminder", ..., user!.uid, 30000)`.

**How the trigger pattern works:**
Instead of calling a Cloud Function directly (which CORS/org policy blocks), the client writes a request document to the `_requests` Firestore collection. A server-side Firestore trigger (`processRequests`) picks it up, executes the operation with admin access (bypassing org policy), and writes the result back. The client watches for the result in real-time via `onSnapshot`.

**Deployment required:**
- Cloud Functions: `firebase deploy --only functions`
- Frontend: push to git / redeploy on Vercel
