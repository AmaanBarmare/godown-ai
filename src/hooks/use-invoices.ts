import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/config";
import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
} from "firebase/firestore";

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
      const q = query(collection(db, "invoices"), orderBy("created_at", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Invoice[];
    },
  });
}

export function useAddInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoice: Omit<Invoice, "id" | "created_at">) => {
      const docRef = await addDoc(collection(db, "invoices"), {
        ...invoice,
        created_at: new Date().toISOString(),
      });
      return { id: docRef.id, ...invoice, created_at: new Date().toISOString() };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}
