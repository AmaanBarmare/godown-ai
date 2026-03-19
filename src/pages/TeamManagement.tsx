import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useInvites, useCreateInvite, useResendInvite, useRevokeInvite } from "@/hooks/use-invites";
import { useUsers, useUpdateUserStatus } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Send, XCircle, Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const roleBadgeVariant = (role: string) => {
  switch (role) {
    case "admin": return "destructive" as const;
    case "manager": return "default" as const;
    default: return "secondary" as const;
  }
};

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case "active":
    case "accepted": return "default" as const;
    case "invited": return "secondary" as const;
    case "disabled":
    case "revoked": return "destructive" as const;
    case "expired": return "outline" as const;
    default: return "secondary" as const;
  }
};

export default function TeamManagement() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("");
  const [fullName, setFullName] = useState("");

  const { data: invites, isLoading: invitesLoading } = useInvites();
  const { data: users, isLoading: usersLoading } = useUsers();
  const createInvite = useCreateInvite();
  const resendInvite = useResendInvite();
  const revokeInvite = useRevokeInvite();
  const updateUserStatus = useUpdateUserStatus();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !role) {
      toast.error("Email and role are required");
      return;
    }
    try {
      await createInvite.mutateAsync({ email, role, fullName: fullName || undefined });
      toast.success(`Invite sent to ${email}`);
      setEmail("");
      setRole("");
      setFullName("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create invite");
    }
  };

  const handleResend = async (inviteId: string) => {
    try {
      await resendInvite.mutateAsync(inviteId);
      toast.success("Invite resent");
    } catch (err: any) {
      toast.error(err?.message || "Failed to resend invite");
    }
  };

  const handleRevoke = async (inviteId: string) => {
    try {
      await revokeInvite.mutateAsync(inviteId);
      toast.success("Invite revoked");
    } catch (err: any) {
      toast.error(err?.message || "Failed to revoke invite");
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "disabled" : "active";
    try {
      await updateUserStatus.mutateAsync({ userId, status: newStatus as "active" | "disabled" });
      toast.success(`User ${newStatus === "active" ? "enabled" : "disabled"}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update user status");
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">Invite users and manage team access</p>
        </div>

        {/* Role Descriptions */}
        <Card>
          <CardHeader>
            <CardTitle>Roles & Permissions</CardTitle>
            <CardDescription>What each role can do in GodownAI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  <Badge variant="destructive">Admin</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Full access. Can manage team (invite/revoke/disable users), manage companies, members, email settings, generate &amp; send invoices, send reminders, and confirm payments.
                </p>
              </div>
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <Badge variant="default">Manager</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Operational access. Can manage companies, members, email settings, generate &amp; send invoices, send payment reminders, and confirm payments. Cannot manage team.
                </p>
              </div>
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary">Member</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  View-only access. Can view the dashboard, companies, members, invoice history, and payment status. Cannot generate invoices, send emails, or manage settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invite Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite User
            </CardTitle>
            <CardDescription>Send an invitation to join GodownAI</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2 flex-1 min-w-[200px]">
                <Label htmlFor="inviteEmail">Email</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="space-y-2 w-[160px]">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex-1 min-w-[160px]">
                <Label htmlFor="inviteName">Full Name (optional)</Label>
                <Input
                  id="inviteName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <Button type="submit" disabled={createInvite.isPending}>
                {createInvite.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send Invite
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Pending Invites */}
        <Card>
          <CardHeader>
            <CardTitle>Invites</CardTitle>
            <CardDescription>Track and manage pending invitations</CardDescription>
          </CardHeader>
          <CardContent>
            {invitesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !invites?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No invites yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell className="font-medium">{invite.email}</TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariant(invite.role)}>{invite.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(invite.status)}>{invite.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(invite.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {invite.status === "invited" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResend(invite.id)}
                              disabled={resendInvite.isPending}
                            >
                              Resend
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRevoke(invite.id)}
                              disabled={revokeInvite.isPending}
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              Revoke
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Manage user access and roles</CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !users?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No team members yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.fullName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariant(user.role)} className="gap-1">
                          {user.role === "admin" && <ShieldAlert className="h-3 w-3" />}
                          {user.role === "manager" && <Shield className="h-3 w-3" />}
                          {user.role === "member" && <ShieldCheck className="h-3 w-3" />}
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(user.status)}>{user.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant={user.status === "active" ? "destructive" : "default"}
                          size="sm"
                          onClick={() => handleToggleStatus(user.id, user.status)}
                          disabled={updateUserStatus.isPending}
                        >
                          {user.status === "active" ? "Disable" : "Enable"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
