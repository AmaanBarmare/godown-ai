import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/config";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import type { EmailMapping } from "@/integrations/firebase/types";

export type { EmailMapping };

export function useEmailMappings() {
  return useQuery({
    queryKey: ["email_mappings"],
    queryFn: async () => {
      const q = query(collection(db, "email_mappings"), orderBy("company"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as EmailMapping[];
    },
  });
}

export function useAddEmailMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mapping: Omit<EmailMapping, "id" | "created_at" | "updated_at">) => {
      const now = new Date().toISOString();
      await addDoc(collection(db, "email_mappings"), {
        ...mapping,
        created_at: now,
        updated_at: now,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email_mappings"] }),
  });
}

export function useUpdateEmailMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...mapping }: EmailMapping) => {
      await updateDoc(doc(db, "email_mappings", id), {
        ...mapping,
        updated_at: new Date().toISOString(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email_mappings"] }),
  });
}

export function useDeleteEmailMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, "email_mappings", id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email_mappings"] }),
  });
}
