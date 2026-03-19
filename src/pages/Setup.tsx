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
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check if org already exists — if so, initialize via Cloud Function to create missing profile
  useEffect(() => {
    if (!user) {
      setChecking(false);
      return;
    }

    async function checkAndFixProfile() {
      try {
        // Try initializing — the Cloud Function handles the "already exists" case
        // by creating the missing user profile if needed
        await submitRequest("initializeOrganization", { orgName: "OltaFlock Warehousing LLP" }, user!.uid);
        toast.success("Profile created! Redirecting...");
        window.location.href = "/";
        return;
      } catch {
        // If it fails, show the setup form (e.g., org doesn't exist yet)
      } finally {
        setChecking(false);
      }
    }

    checkAndFixProfile();
  }, [user, navigate]);

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
