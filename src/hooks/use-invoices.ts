import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Invoice {
  id: string;
  company: string;
  amount: string;
  invoice_date: string;
  recipient_email: string;
  cc: string;
  bcc: string;
  file_name: string;
  status: string;
  created_at: string;
}

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Invoice[];
    },
  });
}

export function useAddInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoice: Omit<Invoice, "id" | "created_at">) => {
      const { data, error } = await supabase.from("invoices").insert(invoice).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}
