import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

/**
 * Allows admin and manager roles. Redirects member role to dashboard.
 */
export function ManagerRoute({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const toastShown = useRef(false);

  useEffect(() => {
    if (!loading && user && userProfile && !["admin", "manager"].includes(userProfile.role) && !toastShown.current) {
      toastShown.current = true;
      toast.error("Access denied: admin or manager role required");
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

  if (!userProfile || !["admin", "manager"].includes(userProfile.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
