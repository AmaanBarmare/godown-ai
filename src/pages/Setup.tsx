import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { submitRequest } from "@/lib/request-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const ADMIN_EMAIL = "admin@oltaflock.ai";

export default function Setup() {
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const { user, userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // If profile is already loaded (e.g., late arrival), redirect to dashboard
  useEffect(() => {
    if (userProfile) {
      navigate("/", { replace: true });
    }
  }, [userProfile, navigate]);

  // Try to refresh profile first — if user doc exists (created by invite flow),
  // AuthContext will pick it up and ProtectedRoute will let them through
  useEffect(() => {
    if (!user) {
      setChecking(false);
      return;
    }

    async function checkProfile() {
      try {
        // First, try refreshing profile — the user doc may already exist
        await refreshProfile();
        // If refreshProfile set the profile, the useEffect above will redirect
        // Give it a tick to propagate
        await new Promise((r) => setTimeout(r, 100));
      } catch {
        // ignore
      }

      // If still no profile and this is the primary admin, try initializing
      if (user!.email === ADMIN_EMAIL) {
        try {
          await submitRequest("initializeOrganization", { orgName: "OltaFlock Warehousing LLP" }, user!.uid);
          toast.success("Profile created! Redirecting...");
          await refreshProfile();
          navigate("/", { replace: true });
          return;
        } catch {
          // Org doesn't exist yet — show the setup form
        }
      }

      setChecking(false);
    }

    checkProfile();
  }, [user]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              Please sign in as <strong>{ADMIN_EMAIL}</strong> first, then visit this page to initialize the organization.
            </p>
            <Button className="mt-4" onClick={() => navigate("/login")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Non-admin users should not see the setup form
  if (user.email !== ADMIN_EMAIL) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">Account Setup Pending</CardTitle>
            <CardDescription>
              Your account is being set up. Please try refreshing the page, or contact your organization admin if the issue persists.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
            <Button variant="outline" onClick={() => navigate("/login")}>
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (user.email !== ADMIN_EMAIL) {
      setError(`Only ${ADMIN_EMAIL} can initialize the organization.`);
      return;
    }

    setLoading(true);
    try {
      await submitRequest("initializeOrganization", { orgName }, user.uid);
      toast.success("Organization initialized! Redirecting...");
      window.location.href = "/";
    } catch (err: any) {
      console.error("Setup error:", err);
      setError(err?.message || "Failed to initialize organization. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Initialize GodownAI</CardTitle>
          <CardDescription>
            Set up your organization. This can only be done once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs break-all">{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g., Oltaflock Warehousing LLP"
                required
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Signed in as: <strong>{user.email}</strong>
            </p>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Initialize Organization
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
