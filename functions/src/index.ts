import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";

admin.initializeApp();

const AI_GATEWAY_KEY = defineSecret("AI_GATEWAY_KEY");

export const parseInvoice = onCall(
  { secrets: [AI_GATEWAY_KEY] },
  async (request) => {
    const { filePath, fileName, mimeType } = request.data as {
      filePath: string;
      fileName: string;
      mimeType: string;
    };

    if (!filePath || !fileName) {
      throw new HttpsError("invalid-argument", "filePath and fileName are required");
    }

    try {
      // Download file from Firebase Storage
      const bucket = admin.storage().bucket();
      const file = bucket.file(filePath);
      const [buffer] = await file.download();
      const base64 = buffer.toString("base64");

      const apiKey = AI_GATEWAY_KEY.value();
      if (!apiKey) {
        throw new HttpsError("failed-precondition", "AI_GATEWAY_KEY not configured");
      }

      // Call AI to extract invoice data
      const aiResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content:
                  "You are an invoice data extractor. Extract the company name and invoice amount from the provided invoice document. The currency is INR (₹). You MUST call the extract_invoice_data function with the results.",
              },
              {
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mimeType};base64,${base64}`,
                    },
                  },
                  {
                    type: "text",
                    text: "Extract the company name (the company being billed / recipient) and the total amount from this invoice.",
                  },
                ],
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "extract_invoice_data",
                  description: "Extract structured invoice data",
                  parameters: {
                    type: "object",
                    properties: {
                      company: {
                        type: "string",
                        description: "The company name being billed",
                      },
                      amount: {
                        type: "string",
                        description:
                          "The total invoice amount including currency symbol, e.g. ₹4,200.00",
                      },
                      date: {
                        type: "string",
                        description: "The invoice date, e.g. Feb 19, 2026",
                      },
                    },
                    required: ["company", "amount"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: {
              type: "function",
              function: { name: "extract_invoice_data" },
            },
          }),
        }
      );

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429) {
          throw new HttpsError(
            "resource-exhausted",
            "Rate limit exceeded. Please try again later."
          );
        }
        if (status === 402) {
          throw new HttpsError(
            "resource-exhausted",
            "AI credits exhausted. Please add funds."
          );
        }
        const errText = await aiResponse.text();
        console.error("AI error:", status, errText);
        throw new HttpsError("internal", "AI extraction failed");
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        throw new HttpsError("internal", "AI did not return structured data");
      }

      const extracted = JSON.parse(toolCall.function.arguments);

      // Find matching email mapping (fuzzy match)
      const mappingsSnapshot = await admin
        .firestore()
        .collection("email_mappings")
        .get();

      let matchedMapping = null;
      const companyLower = extracted.company.toLowerCase();

      for (const doc of mappingsSnapshot.docs) {
        const m = doc.data();
        if (
          companyLower.includes(m.company.toLowerCase()) ||
          m.company.toLowerCase().includes(companyLower)
        ) {
          matchedMapping = {
            email: m.primary_email,
            cc: m.cc,
            bcc: m.bcc,
            company: m.company,
          };
          break;
        }
      }

      return {
        company: extracted.company,
        amount: extracted.amount || "N/A",
        date:
          extracted.date ||
          new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        file_name: fileName,
        file_path: filePath,
        matched_mapping: matchedMapping,
      };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      console.error("parse-invoice error:", e);
      throw new HttpsError(
        "internal",
        e instanceof Error ? e.message : "Unknown error"
      );
    }
  }
);
