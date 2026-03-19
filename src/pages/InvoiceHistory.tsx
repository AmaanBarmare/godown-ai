import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Search, Eye, Download, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useInvoices } from "@/hooks/use-invoices";
import { storage } from "@/integrations/firebase/config";
import { ref, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";
import type { Invoice } from "@/integrations/firebase/types";

const statusColors: Record<string, string> = {
  Sent: "bg-success/10 text-success",
  Pending: "bg-warning/10 text-warning",
  Paid: "bg-primary/10 text-primary",
  Failed: "bg-destructive/10 text-destructive",
};

export default function InvoiceHistory() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const { data: invoices = [], isLoading } = useInvoices();

  const handleViewInvoice = async (inv: Invoice) => {
    if (!inv.file_name) {
      toast.error("No PDF file associated with this invoice");
      return;
    }
    setSelectedInvoice(inv);
    setPdfLoading(true);
    try {
      const fileRef = ref(storage, `invoices/${inv.file_name}`);
      const url = await getDownloadURL(fileRef);
      setPdfUrl(url);
    } catch {
      toast.error("Failed to load invoice PDF");
      setSelectedInvoice(null);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleCloseViewer = () => {
    setSelectedInvoice(null);
    setPdfUrl(null);
  };

  const handleDownload = () => {
    if (pdfUrl && selectedInvoice) {
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.target = "_blank";
      a.download = selectedInvoice.file_name || "invoice.pdf";
      a.click();
    }
  };

  const filtered = invoices.filter((inv) => {
    const matchSearch =
      inv.company.toLowerCase().includes(search.toLowerCase()) ||
      (inv.invoice_number || "").toLowerCase().includes(search.toLowerCase()) ||
      inv.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Invoice History</h1>
          <p className="text-sm text-muted-foreground mt-1">Complete audit log of all invoices</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by company or invoice number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-card-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            {["All", "Sent", "Pending", "Paid", "Failed"].map((s) => (
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
                  <th className="px-6 py-3.5 font-medium">Invoice No.</th>
                  <th className="px-6 py-3.5 font-medium">Company</th>
                  <th className="px-6 py-3.5 font-medium">Period</th>
                  <th className="px-6 py-3.5 font-medium">Amount</th>
                  <th className="px-6 py-3.5 font-medium">Sent Date</th>
                  <th className="px-6 py-3.5 font-medium">Due Date</th>
                  <th className="px-6 py-3.5 font-medium">Status</th>
                  <th className="px-6 py-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : filtered.length > 0 ? filtered.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-card-foreground">{inv.invoice_number || "—"}</td>
                    <td className="px-6 py-4 text-card-foreground">{inv.company}</td>
                    <td className="px-6 py-4 text-muted-foreground">{inv.invoice_period || "—"}</td>
                    <td className="px-6 py-4 font-semibold text-card-foreground">
                      {inv.total_amount ? `₹${inv.total_amount.toLocaleString("en-IN")}` : inv.amount}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {inv.created_at ? format(new Date(inv.created_at), "dd MMM yyyy") : inv.invoice_date}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {inv.due_date ? format(new Date(inv.due_date), "dd MMM yyyy") : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[inv.status] || ""}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleViewInvoice(inv)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        title="View Invoice PDF"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">No invoices found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PDF Viewer Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div>
                  <h2 className="text-lg font-semibold text-card-foreground">
                    {selectedInvoice.invoice_number || "Invoice"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedInvoice.company} — {selectedInvoice.invoice_period || ""}
                    {selectedInvoice.total_amount ? ` — ₹${selectedInvoice.total_amount.toLocaleString("en-IN")}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {pdfUrl && (
                    <button
                      onClick={handleDownload}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  )}
                  <button
                    onClick={handleCloseViewer}
                    className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {/* PDF Content */}
              <div className="flex-1 overflow-hidden">
                {pdfLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : pdfUrl ? (
                  <iframe
                    src={pdfUrl}
                    className="w-full h-full"
                    title={`Invoice ${selectedInvoice.invoice_number}`}
                  />
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
