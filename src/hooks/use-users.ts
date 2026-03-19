import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import { submitRequest } from "@/lib/request-client";
import type { AppUser } from "@/integrations/firebase/types";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AppUser[];
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: "active" | "disabled" }) => {
      if (!user) throw new Error("Not authenticated");
      return submitRequest("updateUserStatus", { targetUserId: userId, status }, user.uid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
