# Firebase Setup Guide — Invoice Genius (godown-ai)

**Your Firebase project is already created:** `godown-ai-01` (Blaze plan ✓)
**Your `.env` is configured** ✓
**`firebase.json` and `functions/` are already set up** — do NOT run `firebase init functions`

---

## Important: Where Things Actually Live

| Thing | Where to manage |
|-------|----------------|
| Firestore data & rules | Firebase Console or CLI |
| Storage rules | Firebase Console or CLI |
| `OPENAI_API_KEY` secret | **CLI only** (stored in Google Secret Manager) |
| Deployed functions | Firebase Console → Functions (view logs only) |

---

## Step 1 — Log In & Link Project

```bash
firebase login
firebase use godown-ai-01
```

---

## Step 2 — Build Cloud Functions

```bash
cd functions
npm install
npm run build
cd ..
```

---

## Step 3 — Set the OpenAI API Key Secret

The Cloud Function uses **OpenAI `gpt-4o`** to read your PDF invoices and extract the company name, amount, and date. This key must be set via CLI — it is stored in Google Secret Manager, not in `.env`.

Get your key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys), then:

```bash
firebase functions:secrets:set OPENAI_API_KEY
# Paste your key when prompted (starts with sk-...)
```

---

## Step 4 — Deploy

```bash
firebase deploy --only functions
```

After deploy, your `parseInvoice` function will be live at:
`https://us-central1-godown-ai-01.cloudfunctions.net/parseInvoice`

---

## Step 9 — Run the Dev Server

```bash
npm install   # from project root
npm run dev
```

Open [http://localhost:8080](http://localhost:8080)

---

## Step 10 — (Optional) Seed Sample Email Mappings

Populates Firestore with sample companies so invoice parsing has data to match against.

1. Firebase Console → **Project Settings** → **Service accounts** tab
2. Click **Generate new private key** → save as `service-account.json` in the project root
3. Run:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npx tsx scripts/seed-firestore.ts
```

> Delete `service-account.json` immediately after — never commit it.

---

## Project File Reference

| File | Purpose |
|------|---------|
| `.env` | Your Firebase config keys (gitignored) |
| `.env.example` | Template for `.env` |
| `.firebaserc` | Project ID: `godown-ai-01` |
| `firebase.json` | Firebase deploy config (functions, rules) |
| `firestore.rules` | Firestore security rules (open for dev) |
| `storage.rules` | Storage security rules (open for dev) |
| `functions/src/index.ts` | Cloud Function: AI invoice parser (OpenAI gpt-4o) |
| `src/integrations/firebase/config.ts` | Frontend Firebase SDK init |

---

## Architecture Summary

```
User uploads PDF
      ↓
Firebase Storage  (invoices/ path)
      ↓
parseInvoice Cloud Function  (onCall)
      ↓
OpenAI gpt-4o  (reads PDF, extracts company / amount / date)
      ↓
Fuzzy match against email_mappings (Firestore)
      ↓
Invoice logged to invoices collection
      ↓
Frontend reads via React Query hooks
```

---

## Troubleshooting

**`firebase: command not found`**
```bash
npm install -g firebase-tools
```

**Functions deploy fails — billing error**
Cloud Functions require the Blaze plan — you're already on it ✓

**`OPENAI_API_KEY` not configured error**
Run Step 6 again and redeploy functions.

**Firestore permission denied**
Check that your `.env` values are correct and Firestore was created in the console.

**Storage upload fails**
Make sure the Storage bucket was created in Firebase Console under Databases & Storage → Storage.
