import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Mail, FileText, Plus, Pencil, Trash2, X } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

interface EmailMapping {
  company: string;
  primary: string;
  cc: string;
  bcc: string;
}

const initialMappings: EmailMapping[] = [
  { company: "Apex Logistics", primary: "billing@apexlogistics.com", cc: "manager@apexlogistics.com", bcc: "" },
  { company: "BlueLine Storage", primary: "accounts@bluelinestorage.com", cc: "", bcc: "admin@bluelinestorage.com" },
  { company: "CargoHub Inc.", primary: "finance@cargohub.com", cc: "ops@cargohub.com", bcc: "" },
  { company: "Delta Freight", primary: "pay@deltafreight.com", cc: "", bcc: "" },
  { company: "EastPort Shipping", primary: "billing@eastport.com", cc: "cfo@eastport.com", bcc: "" },
];

const emailSchema = z.string().email("Invalid email address").max(255).or(z.literal(""));
const mappingSchema = z.object({
  company: z.string().trim().min(1, "Company name is required").max(100),
  primary: z.string().trim().min(1, "Primary email is required").email("Invalid email address").max(255),
  cc: emailSchema,
  bcc: emailSchema,
});

type MappingFormData = z.infer<typeof mappingSchema>;

function EmailMappingModal({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: MappingFormData) => void;
  initial?: EmailMapping;
}) {
  const [form, setForm] = useState<MappingFormData>(
    initial ?? { company: "", primary: "", cc: "", bcc: "" }
  );
  const [errors, setErrors] = useState<Partial<Record<keyof MappingFormData, string>>>({});

  if (!open) return null;

  const handleSave = () => {
    const result = mappingSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof MappingFormData, string>> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof MappingFormData;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    onSave(result.data);
  };

  const update = (field: keyof MappingFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const fields: { key: keyof MappingFormData; label: string; required?: boolean }[] = [
    { key: "company", label: "Company Name", required: true },
    { key: "primary", label: "Primary Email", required: true },
    { key: "cc", label: "CC Email" },
    { key: "bcc", label: "BCC Email" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card rounded-xl card-shadow border border-border w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-card-foreground">
            {initial ? "Edit Email Mapping" : "Add Email Mapping"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
              </label>
              <input
                type={f.key === "company" ? "text" : "email"}
                value={form[f.key]}
                onChange={(e) => update(f.key, e.target.value)}
                placeholder={f.key === "company" ? "Enter company name" : "email@example.com"}
                className={`w-full px-3 py-2.5 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                  errors[f.key] ? "border-destructive" : "border-input"
                }`}
              />
              {errors[f.key] && (
                <p className="text-xs text-destructive mt-1">{errors[f.key]}</p>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            {initial ? "Save Changes" : "Add Mapping"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"email" | "templates">("email");
  const [mappings, setMappings] = useState<EmailMapping[]>(initialMappings);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const openAdd = () => {
    setEditingIndex(null);
    setModalOpen(true);
  };

  const openEdit = (index: number) => {
    setEditingIndex(index);
    setModalOpen(true);
  };

  const handleSave = (data: MappingFormData) => {
    const mapping: EmailMapping = {
      company: data.company,
      primary: data.primary,
      cc: data.cc ?? "",
      bcc: data.bcc ?? "",
    };
    if (editingIndex !== null) {
      setMappings((prev) => prev.map((m, i) => (i === editingIndex ? mapping : m)));
      toast({ title: "Mapping updated", description: `Email mapping for ${mapping.company} has been updated.` });
    } else {
      setMappings((prev) => [...prev, mapping]);
      toast({ title: "Mapping added", description: `Email mapping for ${mapping.company} has been added.` });
    }
    setModalOpen(false);
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    const name = mappings[index].company;
    setMappings((prev) => prev.filter((_, i) => i !== index));
    toast({ title: "Mapping deleted", description: `Email mapping for ${name} has been removed.` });
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Email Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure invoice emailing</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-muted rounded-lg p-1 w-fit">
          {[
            { key: "email" as const, label: "Email Mapping", icon: Mail },
            { key: "templates" as const, label: "Email Templates", icon: FileText },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-card text-card-foreground card-shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "email" && (
          <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-card-foreground">Company Email Mapping</h3>
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
              >
                <Plus className="w-3.5 h-3.5" /> Add Mapping
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border bg-muted/30">
                  <th className="px-6 py-3 font-medium">Company</th>
                  <th className="px-6 py-3 font-medium">Primary Email</th>
                  <th className="px-6 py-3 font-medium">CC</th>
                  <th className="px-6 py-3 font-medium">BCC</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((m, i) => (
                  <tr key={`${m.company}-${i}`} className="border-b border-border/50 last:border-0">
                    <td className="px-6 py-3.5 font-medium text-card-foreground">{m.company}</td>
                    <td className="px-6 py-3.5 text-card-foreground">{m.primary}</td>
                    <td className="px-6 py-3.5 text-muted-foreground">{m.cc || "—"}</td>
                    <td className="px-6 py-3.5 text-muted-foreground">{m.bcc || "—"}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(i)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(i)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {mappings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No email mappings configured. Click "Add Mapping" to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "templates" && (
          <div className="bg-card rounded-xl card-shadow border border-border p-6">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Invoice Email Template</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Subject Line</label>
                <input
                  type="text"
                  defaultValue="Invoice {{invoice_number}} from Warehouse Rentals - {{month}} {{year}}"
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email Body</label>
                <textarea
                  rows={8}
                  defaultValue={`Dear {{company_name}},\n\nPlease find attached your invoice {{invoice_number}} for the month of {{month}} {{year}}.\n\nInvoice Amount: {{amount}}\nDue Date: {{due_date}}\n\nPlease process the payment at your earliest convenience.\n\nBest regards,\nWarehouse Rentals Team`}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <div className="flex justify-end">
                <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                  Save Template
                </button>
              </div>
            </div>
          </div>
        )}

        <EmailMappingModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setEditingIndex(null); }}
          onSave={handleSave}
          initial={editingIndex !== null ? mappings[editingIndex] : undefined}
        />
      </div>
    </DashboardLayout>
  );
}
