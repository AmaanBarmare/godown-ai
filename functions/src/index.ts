import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { Resend } from "resend";
import * as crypto from "crypto";

admin.initializeApp();

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

const APP_URL = "https://godown-ai.vercel.app";
const INVITE_EXPIRY_DAYS = 7;
const INVITE_SENDER_EMAIL = "admin@oltaflock.ai";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function requireAuth(request: CallableRequest): { uid: string; email: string } {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const email = request.auth.token.email;
  if (!email) {
    throw new HttpsError("unauthenticated", "User email not available");
  }
  return { uid: request.auth.uid, email };
}

async function requireRole(
  uid: string,
  roles: string[]
): Promise<FirebaseFirestore.DocumentData> {
  const userDoc = await admin.firestore().collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new Error("User profile not found");
  }
  const data = userDoc.data()!;
  if (data.status !== "active") {
    throw new Error("Account is disabled");
  }
  if (!roles.includes(data.role)) {
    throw new Error("Insufficient permissions");
  }
  return data;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getResend(): Resend {
  const apiKey = RESEND_API_KEY.value();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }
  return new Resend(apiKey);
}

// ─── onCall: sendInvoice & sendPaymentReminder (already have IAM set) ────────

export const sendInvoice = onCall(
  { secrets: [RESEND_API_KEY] },
  async (request) => {
    const { uid } = requireAuth(request);
    await requireRole(uid, ["admin", "manager"]);

    const { invoiceData, filePath, recipientEmail, senderEmail, cc, bcc } = request.data as {
      invoiceData: {
        invoice_number: string;
        invoice_period: string;
        company: string;
        total_amount: number;
        due_date: string;
      };
      filePath: string;
      recipientEmail: string;
      senderEmail: string;
      cc?: string;
      bcc?: string;
    };

    if (!filePath || !recipientEmail) {
      throw new HttpsError("invalid-argument", "filePath and recipientEmail are required");
    }

    try {
      const bucket = admin.storage().bucket();
      const file = bucket.file(filePath);
      const [buffer] = await file.download();

      const resend = getResend();

      await resend.emails.send({
        from: senderEmail || "invoices@example.com",
        to: [recipientEmail],
        cc: cc ? [cc] : undefined,
        bcc: bcc ? [bcc] : undefined,
        subject: `Invoice ${invoiceData.invoice_number} - ${invoiceData.invoice_period}`,
        html: `
          <p>Dear ${invoiceData.company},</p>
          <p>Please find attached invoice <strong>${invoiceData.invoice_number}</strong> for the period of <strong>${invoiceData.invoice_period}</strong>.</p>
          <p>Amount: <strong>₹${invoiceData.total_amount.toLocaleString("en-IN")}</strong></p>
          <p>Due Date: <strong>${invoiceData.due_date}</strong></p>
          <p>Please process the payment at your earliest convenience.</p>
          <p>Best regards,<br/>Warehouse Rentals</p>
        `,
        attachments: [
          {
            filename: `${invoiceData.invoice_number}.pdf`,
            content: buffer.toString("base64"),
          },
        ],
      });

      return { success: true };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      console.error("sendInvoice error:", e);
      throw new HttpsError("internal", e instanceof Error ? e.message : "Unknown error");
    }
  }
);

export const sendPaymentReminder = onCall(
  { secrets: [RESEND_API_KEY] },
  async (request) => {
    const { uid } = requireAuth(request);
    await requireRole(uid, ["admin", "manager"]);

    const { invoiceId, recipientEmail, senderEmail, invoiceNumber, amount, dueDate, companyName } =
      request.data as {
        invoiceId: string;
        recipientEmail: string;
        senderEmail: string;
        invoiceNumber: string;
        amount: number;
        dueDate: string;
        companyName: string;
      };

    if (!invoiceId || !recipientEmail) {
      throw new HttpsError("invalid-argument", "invoiceId and recipientEmail are required");
    }

    try {
      const resend = getResend();

      await resend.emails.send({
        from: senderEmail || "invoices@example.com",
        to: [recipientEmail],
        subject: `Payment Reminder: Invoice ${invoiceNumber}`,
        html: `
          <p>Dear ${companyName},</p>
          <p>This is a friendly reminder that payment for invoice <strong>${invoiceNumber}</strong> is overdue.</p>
          <p>Amount Due: <strong>₹${amount.toLocaleString("en-IN")}</strong></p>
          <p>Original Due Date: <strong>${dueDate}</strong></p>
          <p>Please process the payment at your earliest convenience.</p>
          <p>Best regards,<br/>Warehouse Rentals</p>
        `,
      });

      try {
        await admin.firestore().collection("invoices").doc(invoiceId).update({
          status: "Pending",
          reminder_sent_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error("sendPaymentReminder: failed to update invoice status:", err);
      }

      return { success: true };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      console.error("sendPaymentReminder error:", e);
      throw new HttpsError("internal", e instanceof Error ? e.message : "Unknown error");
    }
  }
);

// ─── Firestore Trigger: processes all _requests ──────────────────────────────
// Frontend writes to _requests/{id}, trigger processes and writes result back.
// This avoids the Cloud Run IAM / Domain Restricted Sharing issue entirely.

export const processRequests = onDocumentCreated(
  { document: "_requests/{requestId}", secrets: [RESEND_API_KEY] },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const { type, data, userId } = snap.data() as {
      type: string;
      data: Record<string, any>;
      userId: string;
    };

    if (!type || !userId) {
      await snap.ref.update({ status: "error", error: "Missing type or userId" });
      return;
    }

    try {
      let result: Record<string, any> = {};

      switch (type) {
        case "createInvite":
          result = await handleCreateInvite(data, userId);
          break;
        case "acceptInvite":
          result = await handleAcceptInvite(data, userId);
          break;
        case "resendInvite":
          result = await handleResendInvite(data, userId);
          break;
        case "revokeInvite":
          result = await handleRevokeInvite(data, userId);
          break;
        case "updateUserStatus":
          result = await handleUpdateUserStatus(data, userId);
          break;
        case "initializeOrganization":
          result = await handleInitializeOrganization(data, userId);
          break;
        default:
          throw new Error(`Unknown request type: ${type}`);
      }

      await snap.ref.update({
        status: "completed",
        result,
        processedAt: new Date().toISOString(),
      });
    } catch (e: any) {
      console.error(`processRequests [${type}] error:`, e);
      await snap.ref.update({
        status: "error",
        error: e.message || "Unknown error",
        processedAt: new Date().toISOString(),
      });
    }
  }
);

// ─── Request Handlers ────────────────────────────────────────────────────────

async function handleCreateInvite(
  data: Record<string, any>,
  userId: string
): Promise<Record<string, any>> {
  const adminData = await requireRole(userId, ["admin"]);

  const { email, role, fullName } = data;
  if (!email || !role) throw new Error("email and role are required");
  if (!["admin", "manager", "member"].includes(role)) throw new Error("Invalid role");

  // Check if email is already a user
  const existingUsers = await admin.firestore()
    .collection("users")
    .where("email", "==", email)
    .limit(1)
    .get();
  if (!existingUsers.empty) throw new Error("A user with this email already exists");

  // Check for existing pending invite
  const existingInvites = await admin.firestore()
    .collection("invites")
    .where("email", "==", email)
    .where("status", "==", "invited")
    .limit(1)
    .get();
  if (!existingInvites.empty) throw new Error("A pending invite already exists for this email");

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHashed = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const inviteRef = await admin.firestore().collection("invites").add({
    email,
    organizationId: adminData.organizationId,
    role,
    status: "invited",
    tokenHash: tokenHashed,
    expiresAt: expiresAt.toISOString(),
    invitedBy: userId,
    fullName: fullName || "",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });

  // Send invite email
  const inviteLink = `${APP_URL}/accept-invite?token=${token}&email=${encodeURIComponent(email)}`;
  const resend = getResend();

  await resend.emails.send({
    from: INVITE_SENDER_EMAIL,
    to: [email],
    subject: "You're invited to GodownAI",
    html: `
      <h2>You've been invited to GodownAI</h2>
      <p>You've been invited to join GodownAI as a <strong>${role}</strong>.</p>
      ${fullName ? `<p>Name: ${fullName}</p>` : ""}
      <p>Click the link below to create your account:</p>
      <p><a href="${inviteLink}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Accept Invite</a></p>
      <p>This invite expires in ${INVITE_EXPIRY_DAYS} days.</p>
      <p>If you did not expect this invitation, you can safely ignore this email.</p>
    `,
  });

  return { success: true, inviteId: inviteRef.id };
}

async function handleAcceptInvite(
  data: Record<string, any>,
  userId: string
): Promise<Record<string, any>> {
  const { token, email, fullName } = data;
  if (!token || !email || !fullName) throw new Error("token, email, and fullName are required");

  // Verify the requesting user's email matches the invite email
  const authUser = await admin.auth().getUser(userId);
  if (authUser.email !== email) {
    throw new Error("Email mismatch: your account email does not match the invite");
  }

  const tokenHashed = hashToken(token);

  // Find matching invite
  const invitesSnapshot = await admin.firestore()
    .collection("invites")
    .where("tokenHash", "==", tokenHashed)
    .where("email", "==", email)
    .limit(1)
    .get();

  if (invitesSnapshot.empty) throw new Error("Invalid invite link");

  const inviteDoc = invitesSnapshot.docs[0];
  const invite = inviteDoc.data();

  if (invite.status === "accepted") throw new Error("This invite has already been used");
  if (invite.status === "revoked") throw new Error("This invite has been revoked");
  if (invite.status === "expired" || new Date(invite.expiresAt) < new Date()) {
    if (invite.status !== "expired") {
      await inviteDoc.ref.update({ status: "expired", updatedAt: new Date().toISOString() });
    }
    throw new Error("This invite has expired");
  }

  // Check if user doc already exists (idempotent)
  const userRef = admin.firestore().collection("users").doc(userId);
  const existingUserDoc = await userRef.get();
  if (existingUserDoc.exists) {
    return { success: true, message: "Account already set up" };
  }

  const now = new Date().toISOString();
  const batch = admin.firestore().batch();

  // Create user doc
  batch.set(userRef, {
    email,
    fullName,
    organizationId: invite.organizationId,
    role: invite.role,
    status: "active",
    invitedBy: invite.invitedBy,
    createdAt: now,
    updatedAt: now,
  });

  // Mark invite as accepted
  batch.update(inviteDoc.ref, {
    status: "accepted",
    acceptedAt: now,
    updatedAt: now,
  });

  await batch.commit();

  // Update display name
  await admin.auth().updateUser(userId, { displayName: fullName });

  return { success: true };
}

async function handleResendInvite(
  data: Record<string, any>,
  userId: string
): Promise<Record<string, any>> {
  await requireRole(userId, ["admin"]);

  const { inviteId } = data;
  if (!inviteId) throw new Error("inviteId is required");

  const inviteDoc = await admin.firestore().collection("invites").doc(inviteId).get();
  if (!inviteDoc.exists) throw new Error("Invite not found");

  const invite = inviteDoc.data()!;
  if (invite.status !== "invited") throw new Error(`Cannot resend: invite is ${invite.status}`);

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHashed = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await inviteDoc.ref.update({
    tokenHash: tokenHashed,
    expiresAt: expiresAt.toISOString(),
    updatedAt: now.toISOString(),
  });

  const inviteLink = `${APP_URL}/accept-invite?token=${token}&email=${encodeURIComponent(invite.email)}`;
  const resend = getResend();

  await resend.emails.send({
    from: INVITE_SENDER_EMAIL,
    to: [invite.email],
    subject: "Reminder: You're invited to GodownAI",
    html: `
      <h2>Reminder: You've been invited to GodownAI</h2>
      <p>You've been invited to join GodownAI as a <strong>${invite.role}</strong>.</p>
      <p>Click the link below to create your account:</p>
      <p><a href="${inviteLink}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Accept Invite</a></p>
      <p>This invite expires in ${INVITE_EXPIRY_DAYS} days.</p>
    `,
  });

  return { success: true };
}

async function handleRevokeInvite(
  data: Record<string, any>,
  userId: string
): Promise<Record<string, any>> {
  await requireRole(userId, ["admin"]);

  const { inviteId } = data;
  if (!inviteId) throw new Error("inviteId is required");

  const inviteDoc = await admin.firestore().collection("invites").doc(inviteId).get();
  if (!inviteDoc.exists) throw new Error("Invite not found");

  const invite = inviteDoc.data()!;
  if (invite.status !== "invited") throw new Error(`Cannot revoke: invite is ${invite.status}`);

  await inviteDoc.ref.update({
    status: "revoked",
    updatedAt: new Date().toISOString(),
  });

  return { success: true };
}

const ADMIN_EMAIL = "admin@oltaflock.ai";

async function handleInitializeOrganization(
  data: Record<string, any>,
  userId: string
): Promise<Record<string, any>> {
  // Verify caller is the designated admin
  const authUser = await admin.auth().getUser(userId);
  if (authUser.email !== ADMIN_EMAIL) {
    throw new Error("Only admin@oltaflock.ai can initialize the organization");
  }

  const { orgName } = data;
  if (!orgName) throw new Error("orgName is required");

  // Check if org already exists
  const orgsSnapshot = await admin.firestore().collection("organizations").limit(1).get();
  if (!orgsSnapshot.empty) {
    // Org exists — ensure user doc exists too
    const userRef = admin.firestore().collection("users").doc(userId);
    const existingUser = await userRef.get();
    if (existingUser.exists) {
      return { success: true, message: "Organization already initialized" };
    }
    // Create missing user doc for admin
    const orgDoc = orgsSnapshot.docs[0];
    const now = new Date().toISOString();
    await userRef.set({
      email: ADMIN_EMAIL,
      fullName: "Admin",
      organizationId: orgDoc.id,
      role: "admin",
      status: "active",
      invitedBy: "",
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, message: "Admin user profile created" };
  }

  // Create organization and admin user doc in a batch
  const now = new Date().toISOString();
  const batch = admin.firestore().batch();

  const orgRef = admin.firestore().collection("organizations").doc();
  batch.set(orgRef, {
    name: orgName,
    primaryAdminEmail: ADMIN_EMAIL,
    createdAt: now,
    updatedAt: now,
  });

  const userRef = admin.firestore().collection("users").doc(userId);
  batch.set(userRef, {
    email: ADMIN_EMAIL,
    fullName: "Admin",
    organizationId: orgRef.id,
    role: "admin",
    status: "active",
    invitedBy: "",
    createdAt: now,
    updatedAt: now,
  });

  await batch.commit();

  // Update display name
  await admin.auth().updateUser(userId, { displayName: "Admin" });

  return { success: true, organizationId: orgRef.id };
}

async function handleUpdateUserStatus(
  data: Record<string, any>,
  userId: string
): Promise<Record<string, any>> {
  await requireRole(userId, ["admin"]);

  const { targetUserId, status } = data;
  if (!targetUserId || !status) throw new Error("targetUserId and status are required");
  if (!["active", "disabled"].includes(status)) throw new Error("Invalid status");
  if (targetUserId === userId) throw new Error("Cannot change your own status");

  const userDoc = await admin.firestore().collection("users").doc(targetUserId).get();
  if (!userDoc.exists) throw new Error("User not found");

  await userDoc.ref.update({
    status,
    updatedAt: new Date().toISOString(),
  });

  if (status === "disabled") {
    await admin.auth().updateUser(targetUserId, { disabled: true });
  } else {
    await admin.auth().updateUser(targetUserId, { disabled: false });
  }

  return { success: true };
}
