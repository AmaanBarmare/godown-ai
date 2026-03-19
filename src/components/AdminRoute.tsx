import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const toastShown = useRef(false);

  useEffect(() => {
    if (!loading && user && userProfile && userProfile.role !== "admin" && !toastShown.current) {
      toastShown.current = true;
      toast.error("Access denied: admin only");
    }
  }, [loading, user, userProfile]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!userProfile || userProfile.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
