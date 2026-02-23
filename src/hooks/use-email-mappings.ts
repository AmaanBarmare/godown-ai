import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EmailMapping {
  id: string;
  company: string;
  primary_email: string;
  cc: string;
  bcc: string;
}

export function useEmailMappings() {
  return useQuery({
    queryKey: ["email_mappings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_mappings")
        .select("*")
        .order("company");
      if (error) throw error;
      return data as EmailMapping[];
    },
  });
}

export function useAddEmailMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mapping: Omit<EmailMapping, "id">) => {
      const { error } = await supabase.from("email_mappings").insert(mapping);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email_mappings"] }),
  });
}

export function useUpdateEmailMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...mapping }: EmailMapping) => {
      const { error } = await supabase.from("email_mappings").update(mapping).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email_mappings"] }),
  });
}

export function useDeleteEmailMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_mappings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email_mappings"] }),
  });
}
