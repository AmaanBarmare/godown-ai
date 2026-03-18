import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  useMembers,
  useAddMember,
  useUpdateMember,
  useDeleteMember,
} from "@/hooks/use-members";
import type { Member } from "@/integrations/firebase/types";

const memberSchema = z.object({
  member_type: z.enum(["company", "individual"]),
  name: z.string().trim().min(1, "Name is required"),
  address: z.string().trim().min(1, "Address is required"),
  gst_number: z.string().trim().min(1, "GST number is required"),
  bank_name: z.string().trim().min(1, "Bank name is required"),
  branch: z.string().trim().min(1, "Branch is required"),
  ifsc_code: z.string().trim().min(1, "IFSC code is required"),
  account_number: z.string().trim().min(1, "Account number is required"),
});

type MemberFormData = z.infer<typeof memberSchema>;

const emptyForm: MemberFormData = {
  member_type: "company",
  name: "",
  address: "",
  gst_number: "",
  bank_name: "",
  branch: "",
  ifsc_code: "",
  account_number: "",
};

function MemberModal({
  open,
  onClose,
  onSave,
  initial,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: MemberFormData) => void;
  initial?: Member;
  saving: boolean;
}) {
  const [form, setForm] = useState<MemberFormData>({ ...emptyForm });
  const [errors, setErrors] = useState<Partial<Record<keyof MemberFormData, string>>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      initial
        ? {
            member_type: initial.member_type,
            name: initial.name,
            address: initial.address,
            gst_number: initial.gst_number,
            bank_name: initial.bank_name,
            branch: initial.branch,
            ifsc_code: initial.ifsc_code,
            account_number: initial.account_number,
          }
        : { ...emptyForm }
    );
  }, [open, initial]);

  if (!open) return null;

  const handleSave = () => {
    const result = memberSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof MemberFormData, string>> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof MemberFormData;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    onSave(result.data);
  };

  const update = (field: keyof MemberFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const textField = (field: keyof MemberFormData, label: string, placeholder: string, textarea?: boolean) => (
    <div key={field}>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
        {label} <span className="text-destructive">*</span>
      </label>
      {textarea ? (
        <textarea
          value={form[field] as string}
          onChange={(e) => update(field, e.target.value)}
          placeholder={placeholder}
          rows={2}
          className={`w-full px-3 py-2.5 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none ${errors[field] ? "border-destructive" : "border-input"}`}
        />
      ) : (
        <input
          type="text"
          value={form[field] as string}
          onChange={(e) => update(field, e.target.value)}
          placeholder={placeholder}
          className={`w-full px-3 py-2.5 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring ${errors[field] ? "border-destructive" : "border-input"}`}
        />
      )}
      {errors[field] && <p className="text-xs text-destructive mt-1">{errors[field]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card rounded-xl card-shadow border border-border w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-card-foreground">
            {initial ? "Edit Member" : "Add Member"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Member Type <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-4">
              {(["company", "individual"] as const).map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="member_type"
                    value={type}
                    checked={form.member_type === type}
                    onChange={() => update("member_type", type)}
                    className="accent-primary"
                  />
                  <span className="text-sm text-foreground capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>
          {textField("name", form.member_type === "company" ? "Company Name" : "Person Name", "Enter name")}
          {textField("address", "Address", "Full address", true)}
          {textField("gst_number", "GST Number", "e.g. 29ABCDE1234F1Z5")}
          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Bank Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {textField("bank_name", "Bank Name", "e.g. HDFC Bank")}
              {textField("branch", "Branch", "e.g. MG Road")}
              {textField("ifsc_code", "IFSC Code", "e.g. HDFC0001234")}
              {textField("account_number", "Account Number", "e.g. 12345678901234")}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving..." : initial ? "Save Changes" : "Add Member"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Members() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const { toast } = useToast();

  const { data: members = [], isLoading } = useMembers();
  const addMember = useAddMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  const openAdd = () => { setEditingMember(null); setModalOpen(true); };
  const openEdit = (m: Member) => { setEditingMember(m); setModalOpen(true); };

  const handleSave = async (data: MemberFormData) => {
    try {
      if (editingMember) {
        await updateMember.mutateAsync({ id: editingMember.id, ...data } as Member);
        toast({ title: "Member updated", description: `${data.name} has been updated.` });
      } else {
        await addMember.mutateAsync(data);
        toast({ title: "Member added", description: `${data.name} has been added.` });
      }
      setModalOpen(false);
      setEditingMember(null);
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to save member", variant: "destructive" });
    }
  };

  const handleDelete = async (m: Member) => {
    try {
      await deleteMember.mutateAsync(m.id);
      toast({ title: "Member removed", description: `${m.name} has been removed.` });
    } catch (e) {
      toast({ title: "Error", description: "Failed to delete member", variant: "destructive" });
    }
  };

  const saving = addMember.isPending || updateMember.isPending;

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Members</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your landlord / payee members</p>
        </div>

        <div className="flex justify-end mb-6">
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Add Member
          </button>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading...</div>
        ) : members.length === 0 ? (
          <div className="bg-card rounded-xl card-shadow border border-border p-8 text-center text-muted-foreground">
            No members yet. Click "Add Member" to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {members.map((m) => (
              <div key={m.id} className="bg-card rounded-xl card-shadow border border-border p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
                      {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-card-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{m.member_type}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(m)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(m)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{m.address}</p>
                <p className="text-xs text-muted-foreground">GST: {m.gst_number}</p>
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {m.bank_name} — {m.branch} — {m.ifsc_code}
                  </p>
                  <p className="text-xs text-muted-foreground">A/C: {m.account_number}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MemberModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingMember(null); }}
        onSave={handleSave}
        initial={editingMember ?? undefined}
        saving={saving}
      />
    </DashboardLayout>
  );
}
