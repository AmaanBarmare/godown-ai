import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) throw new Error("No file provided");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Upload file to storage
    const filePath = `${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(filePath, file, { contentType: file.type });
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // Convert file to base64 for AI
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = file.type || "application/pdf";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Use AI to extract invoice data
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an invoice data extractor. Extract the company name and invoice amount from the provided invoice document. You MUST call the extract_invoice_data function with the results.`,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64}` },
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
                  company: { type: "string", description: "The company name being billed" },
                  amount: { type: "string", description: "The total invoice amount including currency symbol, e.g. $4,200.00" },
                  date: { type: "string", description: "The invoice date, e.g. Feb 19, 2026" },
                },
                required: ["company", "amount"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_invoice_data" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      throw new Error("AI extraction failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured data");

    const extracted = JSON.parse(toolCall.function.arguments);

    // Find matching email mapping (fuzzy match)
    const { data: mappings } = await supabase
      .from("email_mappings")
      .select("*");

    let matchedMapping = null;
    if (mappings) {
      const companyLower = extracted.company.toLowerCase();
      matchedMapping = mappings.find(
        (m: any) => companyLower.includes(m.company.toLowerCase()) || m.company.toLowerCase().includes(companyLower)
      );
    }

    return new Response(
      JSON.stringify({
        company: extracted.company,
        amount: extracted.amount || "N/A",
        date: extracted.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        file_name: file.name,
        file_path: filePath,
        matched_mapping: matchedMapping
          ? {
              email: matchedMapping.primary_email,
              cc: matchedMapping.cc,
              bcc: matchedMapping.bcc,
              company: matchedMapping.company,
            }
          : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("parse-invoice error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
