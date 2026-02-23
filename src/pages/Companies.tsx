import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Building2, Search, Plus, Pencil, Trash2, X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Company {
  id: number;
  name: string;
  rent: string;
  incrementDate: Date | undefined;
}

function CompanyModal({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; rent: string; incrementDate: Date | undefined }) => void;
  initial?: Company;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [rent, setRent] = useState(initial?.rent ?? "");
  const [incrementDate, setIncrementDate] = useState<Date | undefined>(initial?.incrementDate);
  const [errors, setErrors] = useState<{ name?: string; rent?: string }>({});

  if (!open) return null;

  const handleSave = () => {
    const errs: { name?: string; rent?: string } = {};
    if (!name.trim()) errs.name = "Company name is required";
    if (!rent.trim()) errs.rent = "Monthly rent is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    onSave({ name: name.trim(), rent: rent.trim(), incrementDate });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card rounded-xl card-shadow border border-border w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-card-foreground">
            {initial ? "Edit Company" : "Add Company"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Company Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
              placeholder="Enter company name"
              className={`w-full px-3 py-2.5 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring ${errors.name ? "border-destructive" : "border-input"}`}
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Monthly Rent (₹) <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={rent}
              onChange={(e) => { setRent(e.target.value); setErrors((p) => ({ ...p, rent: undefined })); }}
              placeholder="e.g. 18,500"
              className={`w-full px-3 py-2.5 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring ${errors.rent ? "border-destructive" : "border-input"}`}
            />
            {errors.rent && <p className="text-xs text-destructive mt-1">{errors.rent}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Increment Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !incrementDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {incrementDate ? format(incrementDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={incrementDate}
                  onSelect={setIncrementDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            {initial ? "Save Changes" : "Add Company"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const { toast } = useToast();

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (c: Company) => { setEditing(c); setModalOpen(true); };

  const handleSave = (data: { name: string; rent: string; incrementDate: Date | undefined }) => {
    if (editing) {
      setCompanies((prev) => prev.map((c) => (c.id === editing.id ? { ...c, ...data } : c)));
      toast({ title: "Company updated", description: `${data.name} has been updated.` });
    } else {
      setCompanies((prev) => [...prev, { id: Date.now(), ...data }]);
      toast({ title: "Company added", description: `${data.name} has been added.` });
    }
    setModalOpen(false);
  };

  const handleDelete = (c: Company) => {
    setCompanies((prev) => prev.filter((x) => x.id !== c.id));
    toast({ title: "Company removed", description: `${c.name} has been removed.` });
  };

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
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border bg-muted/30">
                <th className="px-6 py-3.5 font-medium">Company Name</th>
                <th className="px-6 py-3.5 font-medium">Monthly Rent</th>
                <th className="px-6 py-3.5 font-medium">Increment Date</th>
                <th className="px-6 py-3.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-card-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    {c.name}
                  </td>
                  <td className="px-6 py-4 font-semibold text-card-foreground">₹{c.rent}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {c.incrementDate ? format(c.incrementDate, "MMM dd, yyyy") : "—"}
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
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
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

      <CompanyModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        initial={editing ?? undefined}
      />
    </DashboardLayout>
  );
}
