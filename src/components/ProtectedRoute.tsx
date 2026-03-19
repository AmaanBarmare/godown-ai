import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const location = useLocation();

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

  // User exists in Firebase Auth but has no Firestore profile yet (setup flow)
  // Only allow access to /setup — redirect everything else there
  if (!userProfile) {
    if (location.pathname === "/setup") {
      return <>{children}</>;
    }
    return <Navigate to="/setup" replace />;
  }

  if (userProfile.status === "disabled") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
