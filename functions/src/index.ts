import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import OpenAI from "openai";

admin.initializeApp();

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

export const parseInvoice = onCall(
  { secrets: [OPENAI_API_KEY] },
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

      const apiKey = OPENAI_API_KEY.value();
      if (!apiKey) {
        throw new HttpsError("failed-precondition", "OPENAI_API_KEY not configured");
      }

      const openai = new OpenAI({ apiKey });

      // Build content: PDFs use "file" type, images use "image_url"
      const fileContent: OpenAI.Chat.ChatCompletionContentPart =
        mimeType === "application/pdf"
          ? {
              type: "file" as unknown as "image_url", // openai SDK types catch up later
              // @ts-expect-error — openai SDK typedefs lag behind API support
              file: {
                filename: fileName,
                file_data: `data:application/pdf;base64,${base64}`,
              },
            }
          : {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` },
            };

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are an invoice data extractor. Extract the company name and invoice amount from the provided invoice. The currency is INR (₹). You MUST call the extract_invoice_data function with the results.",
          },
          {
            role: "user",
            content: [
              fileContent,
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
        tool_choice: { type: "function", function: { name: "extract_invoice_data" } },
      });

      const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
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
