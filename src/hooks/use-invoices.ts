import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/config";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import type { Invoice } from "@/integrations/firebase/types";

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
      return { id: docRef.id, ...invoice, created_at: new Date().toISOString() } as Invoice;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      ...extra
    }: {
      id: string;
      status: Invoice["status"];
      reminder_sent_at?: string;
      payment_received?: number;
      tds_amount?: number;
      receipt_date?: string;
      bank_received_into?: string;
      confirmed_at?: string;
    }) => {
      await updateDoc(doc(db, "invoices", id), { status, ...extra });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useInvoicesByStatus(statuses: Invoice["status"][]) {
  const { data: invoices = [], ...rest } = useInvoices();
  return {
    ...rest,
    data: invoices.filter((inv) => statuses.includes(inv.status)),
  };
}
