import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { Resend } from "resend";

admin.initializeApp();

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

export const sendInvoice = onCall(
  { secrets: [RESEND_API_KEY] },
  async (request) => {
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
      // Download PDF from Firebase Storage
      const bucket = admin.storage().bucket();
      const file = bucket.file(filePath);
      const [buffer] = await file.download();

      const apiKey = RESEND_API_KEY.value();
      if (!apiKey) {
        throw new HttpsError("failed-precondition", "RESEND_API_KEY not configured");
      }

      const resend = new Resend(apiKey);

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
      throw new HttpsError(
        "internal",
        e instanceof Error ? e.message : "Unknown error"
      );
    }
  }
);

export const sendPaymentReminder = onCall(
  { secrets: [RESEND_API_KEY] },
  async (request) => {
    const {
      invoiceId,
      recipientEmail,
      senderEmail,
      invoiceNumber,
      amount,
      dueDate,
      companyName,
    } = request.data as {
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
      const apiKey = RESEND_API_KEY.value();
      if (!apiKey) {
        throw new HttpsError("failed-precondition", "RESEND_API_KEY not configured");
      }

      const resend = new Resend(apiKey);

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

      // Best-effort: status update is also done client-side.
      // If Firestore IAM is restricted for this runtime SA, don't block reminder sending.
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
      throw new HttpsError(
        "internal",
        e instanceof Error ? e.message : "Unknown error"
      );
    }
  }
);
