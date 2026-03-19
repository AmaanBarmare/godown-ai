# Auth & Invite Architecture

## Overview

GodownAI uses Firebase Authentication with an invite-only signup model. All privileged actions (sending invoices, payment reminders, managing invites) are secured via Cloud Functions that verify Firebase Auth tokens and check user roles in Firestore.

## Architecture

```
Browser (React SPA)
  ├── Firebase Auth (sign in / sign out)
  ├── Firestore (data CRUD, rules enforce auth)
  ├── Storage (invoice PDFs, rules enforce auth)
  └── Cloud Functions via httpsCallable()
       ├── sendInvoice (auth + role: admin|manager)
       ├── sendPaymentReminder (auth + role: admin|manager)
       ├── createInvite (auth + role: admin)
       ├── acceptInvite (public — creates account)
       ├── resendInvite (auth + role: admin)
       ├── revokeInvite (auth + role: admin)
       ├── updateUserStatus (auth + role: admin)
       └── initializeOrganization (auth + admin@oltaflock.ai only)
```

## Auth Model

- **Firebase Authentication**: Email/password sign-in
- **No public signup**: Users can only create accounts via invite links
- **User profiles**: Stored in Firestore `users/{uid}` with role and status
- **Roles**: `admin`, `manager`, `member`
- **Statuses**: `active`, `disabled`

## Invite Flow

1. Admin opens `/team` and invites a user (email + role)
2. `createInvite` Cloud Function:
   - Generates 32-byte random token
   - Stores SHA-256 hash in `invites` collection (token never stored in plain text)
   - Sends invite email via Resend with link containing the raw token
   - Invite expires in 7 days
3. User clicks invite link → `/accept-invite?token=...&email=...`
4. User fills in name and password (email is locked)
5. `acceptInvite` Cloud Function:
   - Validates token hash, email, status, and expiry
   - Creates Firebase Auth user
   - Creates Firestore `users/{uid}` doc
   - Marks invite as `accepted`
6. User is auto-signed in and redirected to the app

## IAM Strategy

Cloud Functions are deployed as standard `onCall` functions (publicly invocable at the IAM level). Auth is enforced **in function code** via `request.auth` checks, not at the IAM layer.

When `firebase deploy --only functions` runs, it resets IAM to "allow unauthenticated invocations" — this is intentional. The `httpsCallable()` SDK automatically attaches the Firebase Auth ID token when a user is signed in.

**Do not** re-enable IAM REQUIRE AUTHENTICATION on these functions after deployment.

## Data Model

### Firestore Collections

**organizations**
- `name`: string
- `primaryAdminEmail`: string
- `createdAt`, `updatedAt`: ISO strings

**users** (document ID = Firebase Auth UID)
- `email`: string
- `fullName`: string
- `organizationId`: string (ref to organizations)
- `role`: "admin" | "manager" | "member"
- `status`: "active" | "disabled"
- `invitedBy`: string (UID of inviting admin)
- `createdAt`, `updatedAt`: ISO strings

**invites**
- `email`: string
- `organizationId`: string
- `role`: "admin" | "manager" | "member"
- `status`: "invited" | "accepted" | "expired" | "revoked"
- `tokenHash`: string (SHA-256 of invite token)
- `expiresAt`: ISO string
- `invitedBy`: string (UID)
- `acceptedAt`: ISO string (optional)
- `createdAt`, `updatedAt`: ISO strings

## Security Rules

### Firestore
- `organizations`: Active users can read own org. No client writes.
- `users`: Auth users can read own doc or same-org docs. No client writes (managed by functions).
- `invites`: Only admins can read. No client writes (managed by functions).
- `companies`, `members`, `invoices`, `email_mappings`: Active authenticated users can read/write.

### Storage
- `invoices/*`: Authenticated users can read/write.

## Route Protection

| Route | Access |
|-------|--------|
| `/login` | Public |
| `/accept-invite` | Public |
| `/setup` | Authenticated (no profile required) |
| `/team` | Admin only |
| All other routes | Authenticated + active user |

## Environment Variables

### Frontend (Vite, public)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

### Backend (Firebase secrets)
- `RESEND_API_KEY` — set via `firebase functions:secrets:set RESEND_API_KEY`

## First-Time Setup (Bootstrap)

1. Enable Email/Password auth in Firebase Console → Authentication → Sign-in method
2. Create admin user in Firebase Console → Authentication → Add user: `admin@oltaflock.ai`
3. Deploy Cloud Functions: `firebase deploy --only functions`
4. Visit the app at `/setup`, sign in as `admin@oltaflock.ai`
5. Enter organization name (e.g., "Oltaflock Warehousing LLP") and submit
6. Deploy security rules: `firebase deploy --only firestore:rules,storage`
7. Admin can now invite users from the `/team` page

**Important:** Deploy security rules AFTER bootstrap (step 6), not before, to avoid locking yourself out.

## Adding a New Organization (Future)

Currently single-org. To support multiple organizations:
1. Add `organizationId` to companies, members, invoices, email_mappings
2. Update Firestore rules to filter by organization
3. Update data hooks to filter by user's organization
4. Create a new `initializeOrganization` variant that doesn't require being the first org
