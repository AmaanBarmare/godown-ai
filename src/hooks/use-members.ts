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
import type { Member } from "@/integrations/firebase/types";

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const q = query(collection(db, "members"), orderBy("name"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Member[];
    },
  });
}

export function useAddMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (member: Omit<Member, "id" | "created_at" | "updated_at">) => {
      const now = new Date().toISOString();
      await addDoc(collection(db, "members"), {
        ...member,
        created_at: now,
        updated_at: now,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...member }: Member) => {
      await updateDoc(doc(db, "members", id), {
        ...member,
        updated_at: new Date().toISOString(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
}

export function useDeleteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, "members", id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
}
