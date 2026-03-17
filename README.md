# Invoice Genius

AI-powered invoice management application for warehouse rental invoicing. Upload PDF invoices, automatically extract company and amount data using AI, match against configured email recipients, and track invoice history.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Firebase (Firestore, Cloud Functions, Storage)
- **Data Fetching:** TanStack React Query
- **AI:** Google Gemini (via API gateway) for PDF invoice parsing

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project (Blaze plan for Cloud Functions)

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com) and create a new project
2. **Firestore:** Build → Firestore Database → Create database → Start in test mode
3. **Storage:** Build → Storage → Get started → Start in test mode
4. **Web App:** Project Settings → General → Add app (Web) → Copy the config values
5. Update `.firebaserc` with your project ID
6. Set the AI gateway secret:
   ```sh
   firebase functions:secrets:set AI_GATEWAY_KEY
   ```

### Local Setup

```sh
# Install dependencies
npm install

# Copy environment variables and fill in your Firebase config
cp .env.example .env

# Install Cloud Functions dependencies
cd functions && npm install && cd ..

# Start the development server (runs on http://localhost:8080)
npm run dev
```

### Seed Data

To populate initial email mappings:

1. Download your Firebase service account key from:
   Firebase Console → Project Settings → Service Accounts → Generate New Private Key
2. Save it as `service-account.json` in the project root
3. Run: `npx tsx scripts/seed-firestore.ts`

### Deploy Cloud Functions

```sh
firebase deploy --only functions
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

The Cloud Function also requires `AI_GATEWAY_KEY` set via `firebase functions:secrets:set`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server on port 8080 |
| `npm run build` | Production build |
| `npm run build:dev` | Dev build with sourcemaps |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint with ESLint |

## Features

- **Dashboard** — KPIs and charts for invoice overview
- **Invoice Sender** — Upload PDF, AI extracts company/amount/date, matches email recipients
- **Invoice History** — Search and filter sent invoices
- **Companies** — Manage company records
- **Members** — Manage team members
- **Settings** — Configure email mappings (company to recipient email, CC, BCC)
