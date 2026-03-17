# Invoice Genius

AI-powered invoice management application for warehouse rental invoicing. Upload PDF invoices, automatically extract company and amount data using AI, match against configured email recipients, and track invoice history.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Firebase (Firestore, Cloud Functions, Storage)
- **Data Fetching:** TanStack React Query
- **AI:** OpenAI `gpt-4o` (via Firebase Cloud Function) for PDF invoice parsing

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project (Blaze plan for Cloud Functions)

For a detailed Firebase walkthrough for this repo, see `firebase_setup.md`.

### Firebase & Functions Setup

1. Log in and select the existing project (or create one):
   ```sh
   firebase login
   firebase use <your-project-id>
   ```
2. Build Cloud Functions:
   ```sh
   cd functions
   npm install
   npm run build
   cd ..
   ```
3. Set the OpenAI API key secret (stored in Google Secret Manager, **not** `.env`):
   ```sh
   firebase functions:secrets:set OPENAI_API_KEY
   ```
4. Deploy Cloud Functions:
   ```sh
   firebase deploy --only functions
   ```

### Local App Setup

```sh
# Install frontend dependencies
npm install

# Copy environment variables and fill in your Firebase config
cp .env.example .env

# Start the development server (runs on http://localhost:8080)
npm run dev
```

### Seed Sample Email Mappings (Optional)

To populate initial `email_mappings` in Firestore:

1. In Firebase Console: Project Settings → Service Accounts → Generate New Private Key
2. Save the key as `service-account.json` in the project root (gitignored)
3. Run:
   ```sh
   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npx tsx scripts/seed-firestore.ts
   ```
4. Delete `service-account.json` once seeding is complete.

### Environment Variables (`.env`)

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |

> The backend Cloud Function uses the `OPENAI_API_KEY` secret configured via `firebase functions:secrets:set` (not stored in `.env`).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server on port 8080 |
| `npm run build` | Production build |
| `npm run build:dev` | Dev build with sourcemaps |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint with ESLint |

## Features

- **Dashboard** — KPIs and charts for invoice overview
- **Invoice Sender** — Upload PDF, AI extracts company/amount/date, matches email recipients
- **Invoice History** — Search and filter sent invoices
- **Companies** — Manage company records
- **Members** — Manage team members
- **Settings** — Configure email mappings (company to recipient email, CC, BCC)

## Project Structure (High-Level)

- `src/` — React SPA (pages, layout, UI components, hooks)
- `src/integrations/firebase/` — Firebase client SDK config & types
- `functions/` — Firebase Cloud Functions (OpenAI-powered invoice parser)
- `scripts/seed-firestore.ts` — Utility to seed Firestore with sample email mappings
- `firebase.json`, `firestore.rules`, `storage.rules`, `.firebaserc` — Firebase config and security rules
