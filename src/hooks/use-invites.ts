import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import { submitRequest } from "@/lib/request-client";
import type { Invite } from "@/integrations/firebase/types";

export function useInvites() {
  return useQuery({
    queryKey: ["invites"],
    queryFn: async () => {
      const q = query(collection(db, "invites"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Invite[];
    },
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: { email: string; role: string; fullName?: string }) => {
      if (!user) throw new Error("Not authenticated");
      return submitRequest("createInvite", data, user.uid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
    },
  });
}

export function useResendInvite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (inviteId: string) => {
      if (!user) throw new Error("Not authenticated");
      return submitRequest("resendInvite", { inviteId }, user.uid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
    },
  });
}

export function useRevokeInvite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (inviteId: string) => {
      if (!user) throw new Error("Not authenticated");
      return submitRequest("revokeInvite", { inviteId }, user.uid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
    },
  });
}
