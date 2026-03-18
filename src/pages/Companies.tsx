import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Building2, Search, Plus, Pencil, Trash2, X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  useCompanies,
  useAddCompany,
  useUpdateCompany,
  useDeleteCompany,
} from "@/hooks/use-companies";
import type { Company } from "@/integrations/firebase/types";

const companySchema = z.object({
  company_name: z.string().trim().min(1, "Company name is required"),
  signing_authority: z.string().trim().min(1, "Signing authority is required"),
  gst_number: z.string().trim().min(1, "GST number is required"),
  registered_address: z.string().trim().min(1, "Registered address is required"),
  warehouse_location: z.string().trim().min(1, "Warehouse location is required"),
  area_sqft: z.number({ invalid_type_error: "Area is required" }).positive("Area must be positive"),
  rate_per_sqft: z.number({ invalid_type_error: "Rate is required" }).positive("Rate must be positive"),
  possession_date: z.string().min(1, "Possession date is required"),
  annual_increment: z.number({ invalid_type_error: "Increment % is required" }).min(0),
  next_increment_date: z.string().min(1, "Next increment date is required"),
  invoice_send_day: z.number().int().min(1).max(28, "Must be 1–28"),
  rent_due_day: z.number().int().min(1).max(28, "Must be 1–28"),
  reminder_buffer_days: z.number().int().min(0),
});

type CompanyFormData = z.infer<typeof companySchema>;

const emptyForm: CompanyFormData = {
  company_name: "",
  signing_authority: "",
  gst_number: "",
  registered_address: "",
  warehouse_location: "",
  area_sqft: 0,
  rate_per_sqft: 0,
  possession_date: "",
  annual_increment: 5,
  next_increment_date: "",
  invoice_send_day: 25,
  rent_due_day: 5,
  reminder_buffer_days: 5,
};

function CompanyModal({
  open,
  onClose,
  onSave,
  initial,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: CompanyFormData) => void;
  initial?: Company;
  saving: boolean;
}) {
  const [form, setForm] = useState<CompanyFormData>({ ...emptyForm });
  const [errors, setErrors] = useState<Partial<Record<keyof CompanyFormData, string>>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      initial
        ? {
            company_name: initial.company_name,
            signing_authority: initial.signing_authority,
            gst_number: initial.gst_number,
            registered_address: initial.registered_address,
            warehouse_location: initial.warehouse_location,
            area_sqft: initial.area_sqft,
            rate_per_sqft: initial.rate_per_sqft,
            possession_date: initial.possession_date,
            annual_increment: initial.annual_increment,
            next_increment_date: initial.next_increment_date,
            invoice_send_day: initial.invoice_send_day,
            rent_due_day: initial.rent_due_day,
            reminder_buffer_days: initial.reminder_buffer_days,
          }
        : { ...emptyForm }
    );
  }, [open, initial]);

  if (!open) return null;

  const monthlyRent = (form.area_sqft || 0) * (form.rate_per_sqft || 0);

  const handleSave = () => {
    const result = companySchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof CompanyFormData, string>> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof CompanyFormData;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    onSave(result.data);
  };

  const update = (field: keyof CompanyFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const numField = (field: keyof CompanyFormData, label: string, placeholder: string, prefix?: string) => (
    <div key={field}>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
        {label} <span className="text-destructive">*</span>
      </label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>}
        <input
          type="number"
          value={form[field] || ""}
          onChange={(e) => update(field, e.target.value === "" ? 0 : Number(e.target.value))}
          placeholder={placeholder}
          className={`w-full ${prefix ? "pl-7" : "px-3"} pr-3 py-2.5 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring ${errors[field] ? "border-destructive" : "border-input"}`}
        />
      </div>
      {errors[field] && <p className="text-xs text-destructive mt-1">{errors[field]}</p>}
    </div>
  );

  const textField = (field: keyof CompanyFormData, label: string, placeholder: string, textarea?: boolean) => (
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

  const dateField = (field: "possession_date" | "next_increment_date", label: string) => {
    const dateValue = form[field] ? new Date(form[field]) : undefined;
    return (
      <div key={field}>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          {label} <span className="text-destructive">*</span>
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("w-full justify-start text-left font-normal", !dateValue && "text-muted-foreground", errors[field] && "border-destructive")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateValue ? format(dateValue, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={(d) => update(field, d ? d.toISOString().split("T")[0] : "")}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        {errors[field] && <p className="text-xs text-destructive mt-1">{errors[field]}</p>}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card rounded-xl card-shadow border border-border w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-card-foreground">
            {initial ? "Edit Company" : "Add Company"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {textField("company_name", "Company Name", "Enter company name")}
          {textField("signing_authority", "Signing Authority", "Name of signing authority")}
          {textField("gst_number", "GST Number", "e.g. 29ABCDE1234F1Z5")}
          {textField("registered_address", "Registered Address", "Full registered address", true)}
          {textField("warehouse_location", "Warehouse Location", "Warehouse address", true)}
          {numField("area_sqft", "Area (sq.ft.)", "e.g. 50000")}
          {numField("rate_per_sqft", "Rate per sq.ft. (₹)", "e.g. 10", "₹")}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Monthly Base Rent</label>
            <div className="w-full px-3 py-2.5 rounded-lg border border-input bg-muted/30 text-foreground text-sm">
              ₹{monthlyRent.toLocaleString("en-IN")}
            </div>
          </div>
          {dateField("possession_date", "Possession Date")}
          {numField("annual_increment", "Annual Increment (%)", "e.g. 5")}
          {dateField("next_increment_date", "Next Increment Date")}
          {numField("invoice_send_day", "Invoice Send Day (1–28)", "e.g. 25")}
          {numField("rent_due_day", "Rent Due Day (1–28)", "e.g. 5")}
          {numField("reminder_buffer_days", "Reminder Buffer Days", "e.g. 5")}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving..." : initial ? "Save Changes" : "Add Company"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Companies() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const { toast } = useToast();

  const { data: companies = [], isLoading } = useCompanies();
  const addCompany = useAddCompany();
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();

  const filtered = companies.filter((c) =>
    c.company_name.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (c: Company) => { setEditing(c); setModalOpen(true); };

  const handleSave = async (data: CompanyFormData) => {
    try {
      const payload = {
        ...data,
        monthly_base_rent: data.area_sqft * data.rate_per_sqft,
      };
      if (editing) {
        await updateCompany.mutateAsync({ id: editing.id, ...payload } as Company);
        toast({ title: "Company updated", description: `${data.company_name} has been updated.` });
      } else {
        await addCompany.mutateAsync(payload);
        toast({ title: "Company added", description: `${data.company_name} has been added.` });
      }
      setModalOpen(false);
      setEditing(null);
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to save company", variant: "destructive" });
    }
  };

  const handleDelete = async (c: Company) => {
    try {
      await deleteCompany.mutateAsync(c.id);
      toast({ title: "Company removed", description: `${c.company_name} has been removed.` });
    } catch (e) {
      toast({ title: "Error", description: "Failed to delete company", variant: "destructive" });
    }
  };

  const saving = addCompany.isPending || updateCompany.isPending;

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Companies</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your tenant companies</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6 items-start sm:items-center justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-card-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Add Company
          </button>
        </div>

        <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border bg-muted/30">
                  <th className="px-6 py-3.5 font-medium">Company Name</th>
                  <th className="px-6 py-3.5 font-medium">Area (sq.ft.)</th>
                  <th className="px-6 py-3.5 font-medium">Rate/sqft</th>
                  <th className="px-6 py-3.5 font-medium">Monthly Rent</th>
                  <th className="px-6 py-3.5 font-medium">Next Increment</th>
                  <th className="px-6 py-3.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : filtered.length > 0 ? filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-card-foreground flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      {c.company_name}
                    </td>
                    <td className="px-6 py-4 text-card-foreground">{c.area_sqft.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-4 text-card-foreground">₹{c.rate_per_sqft}</td>
                    <td className="px-6 py-4 font-semibold text-card-foreground">₹{c.monthly_base_rent.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {c.next_increment_date ? format(new Date(c.next_increment_date), "MMM dd, yyyy") : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(c)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      {companies.length === 0
                        ? 'No companies yet. Click "Add Company" to get started.'
                        : "No companies match your search."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CompanyModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        initial={editing ?? undefined}
        saving={saving}
      />
    </DashboardLayout>
  );
}
