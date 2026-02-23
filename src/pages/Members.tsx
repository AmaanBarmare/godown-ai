import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Member {
  id: number;
  name: string;
}

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState("");
  const { toast } = useToast();

  const openAdd = () => {
    setEditingMember(null);
    setNameInput("");
    setNameError("");
    setModalOpen(true);
  };

  const openEdit = (m: Member) => {
    setEditingMember(m);
    setNameInput(m.name);
    setNameError("");
    setModalOpen(true);
  };

  const handleSave = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError("Name is required");
      return;
    }
    if (editingMember) {
      setMembers((prev) => prev.map((m) => (m.id === editingMember.id ? { ...m, name: trimmed } : m)));
      toast({ title: "Member updated", description: `${trimmed} has been updated.` });
    } else {
      setMembers((prev) => [...prev, { id: Date.now(), name: trimmed }]);
      toast({ title: "Member added", description: `${trimmed} has been added.` });
    }
    setModalOpen(false);
  };

  const handleDelete = (m: Member) => {
    setMembers((prev) => prev.filter((x) => x.id !== m.id));
    toast({ title: "Member removed", description: `${m.name} has been removed.` });
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Members</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your team members</p>
        </div>

        <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-card-foreground">Team Members</h3>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" /> Add Member
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border bg-muted/30">
                <th className="px-6 py-3.5 font-medium">Member</th>
                <th className="px-6 py-3.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-border/50 last:border-0">
                  <td className="px-6 py-4 font-medium text-card-foreground flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {m.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    {m.name}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(m)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(m)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-6 py-8 text-center text-muted-foreground">
                    No members yet. Click "Add Member" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="relative bg-card rounded-xl card-shadow border border-border w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-card-foreground">
                {editingMember ? "Edit Member" : "Add Member"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => { setNameInput(e.target.value); setNameError(""); }}
                placeholder="Enter member name"
                className={`w-full px-3 py-2.5 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                  nameError ? "border-destructive" : "border-input"
                }`}
              />
              {nameError && <p className="text-xs text-destructive mt-1">{nameError}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted">
                Cancel
              </button>
              <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                {editingMember ? "Save" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
