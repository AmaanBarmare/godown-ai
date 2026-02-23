import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Search } from "lucide-react";
import { useInvoices } from "@/hooks/use-invoices";

const statusColors: Record<string, string> = {
  Sent: "bg-success/10 text-success",
  Pending: "bg-warning/10 text-warning",
  Failed: "bg-destructive/10 text-destructive",
};

export default function InvoiceHistory() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const { data: invoices = [], isLoading } = useInvoices();

  const filtered = invoices.filter((inv) => {
    const matchSearch = inv.company.toLowerCase().includes(search.toLowerCase()) || inv.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Invoice History</h1>
          <p className="text-sm text-muted-foreground mt-1">Complete audit log of all invoices sent</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-card-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            {["All", "Sent", "Pending", "Failed"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-card-foreground border border-border hover:bg-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border bg-muted/30">
                  <th className="px-6 py-3.5 font-medium">Company</th>
                  <th className="px-6 py-3.5 font-medium">Amount</th>
                  <th className="px-6 py-3.5 font-medium">Date</th>
                  <th className="px-6 py-3.5 font-medium">Sent To</th>
                  <th className="px-6 py-3.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : filtered.length > 0 ? filtered.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-card-foreground">{inv.company}</td>
                    <td className="px-6 py-4 font-semibold text-card-foreground">{inv.amount}</td>
                    <td className="px-6 py-4 text-muted-foreground">{inv.invoice_date}</td>
                    <td className="px-6 py-4 text-muted-foreground">{inv.recipient_email}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[inv.status] || ""}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No invoices found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
