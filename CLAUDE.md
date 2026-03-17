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

**Invoice Genius** is an AI-powered invoice management SPA for warehouse rental invoicing. Users upload PDF invoices, an AI Cloud Function parses them, matches against configured email mappings, and logs the result.

### Tech Stack
- **Frontend:** React 18 + TypeScript, Vite (port 8080), Tailwind CSS, shadcn/ui (Radix primitives)
- **Backend:** Firebase (Firestore + Cloud Functions + Storage)
- **Data fetching:** TanStack React Query wrapping Firebase SDK calls
- **Forms:** React Hook Form + Zod validation

### Key Patterns

- **Path alias:** `@/*` maps to `src/*`
- **Firebase config:** `src/integrations/firebase/config.ts` exports `db`, `storage`, `functions`
- **Data hooks:** `src/hooks/use-invoices.ts` and `src/hooks/use-email-mappings.ts` wrap Firestore queries in React Query hooks. Mutations invalidate queries via `queryClient.invalidateQueries()`.
- **Server vs local state:** Invoices and email_mappings are persisted in Firestore. Companies and Members pages use local useState (not persisted).
- **Pages** are route-level containers in `src/pages/`. All wrapped in `DashboardLayout` with `AppSidebar`.
- **UI components** in `src/components/ui/` are shadcn/ui primitives — don't edit directly, use `npx shadcn-ui@latest add <component>` to add new ones.
- **Theming:** CSS variables (HSL) in `src/index.css` with dark mode via class toggle.

### Invoice Parsing Flow
1. User uploads PDF on `/invoice-sender`
2. File uploaded to Firebase Storage from client
3. Cloud Function (`functions/src/index.ts`) downloads file, calls LLM (Google Gemini via gateway)
4. LLM extracts company, amount, date via tool calling
5. Parsed company fuzzy-matched against `email_mappings` collection
6. Invoice logged to `invoices` collection

### Database (Firestore)
- **email_mappings:** company, primary_email, cc, bcc, created_at, updated_at
- **invoices:** company, amount, invoice_date, recipient_email, cc, bcc, file_name, status, created_at
- **Storage:** `invoices/` path for PDF files
- Security rules are open (no auth enforced) — add auth before production

### Currency
All monetary values use INR (₹).
