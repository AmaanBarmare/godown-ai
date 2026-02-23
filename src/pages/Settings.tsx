import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Mail, FileText, Plus, Pencil, Trash2 } from "lucide-react";

const emailMappings = [
  { company: "Apex Logistics", primary: "billing@apexlogistics.com", cc: "manager@apexlogistics.com", bcc: "" },
  { company: "BlueLine Storage", primary: "accounts@bluelinestorage.com", cc: "", bcc: "admin@bluelinestorage.com" },
  { company: "CargoHub Inc.", primary: "finance@cargohub.com", cc: "ops@cargohub.com", bcc: "" },
  { company: "Delta Freight", primary: "pay@deltafreight.com", cc: "", bcc: "" },
  { company: "EastPort Shipping", primary: "billing@eastport.com", cc: "cfo@eastport.com", bcc: "" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"email" | "templates">("email");

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
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
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
                {emailMappings.map((m) => (
                  <tr key={m.company} className="border-b border-border/50 last:border-0">
                    <td className="px-6 py-3.5 font-medium text-card-foreground">{m.company}</td>
                    <td className="px-6 py-3.5 text-card-foreground">{m.primary}</td>
                    <td className="px-6 py-3.5 text-muted-foreground">{m.cc || "—"}</td>
                    <td className="px-6 py-3.5 text-muted-foreground">{m.bcc || "—"}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex gap-2">
                        <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
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

      </div>
    </DashboardLayout>
  );
}
