import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useInvoices, useUpdateInvoiceStatus } from "@/hooks/use-invoices";
import { useMembers } from "@/hooks/use-members";
import type { Invoice } from "@/integrations/firebase/types";

function PaymentModal({
  open,
  onClose,
  invoice,
  defaultBank,
  onConfirm,
  confirming,
}: {
  open: boolean;
  onClose: () => void;
  invoice: Invoice;
  defaultBank: string;
  onConfirm: (data: {
    payment_received: number;
    tds_amount: number;
    receipt_date: string;
    bank_received_into: string;
  }) => void;
  confirming: boolean;
}) {
  const [amountReceived, setAmountReceived] = useState(0);
  const [tdsAmount, setTdsAmount] = useState(0);
  const [receiptDate, setReceiptDate] = useState<Date>(new Date());
  const [bankReceivedInto, setBankReceivedInto] = useState(defaultBank);
  const [error, setError] = useState("");

  if (!open) return null;

  const totalReconciled = amountReceived + tdsAmount;
  const reconciles = totalReconciled === (invoice.total_amount || 0);

  const handleConfirm = () => {
    if (!reconciles) {
      setError(`Amount received (₹${amountReceived.toLocaleString("en-IN")}) + TDS (₹${tdsAmount.toLocaleString("en-IN")}) = ₹${totalReconciled.toLocaleString("en-IN")} does not match invoice total ₹${(invoice.total_amount || 0).toLocaleString("en-IN")}`);
      return;
    }
    setError("");
    onConfirm({
      payment_received: amountReceived,
      tds_amount: tdsAmount,
      receipt_date: receiptDate.toISOString().split("T")[0],
      bank_received_into: bankReceivedInto,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card rounded-xl card-shadow border border-border w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-card-foreground">Log Payment</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Invoice Reference</label>
            <div className="w-full px-3 py-2.5 rounded-lg border border-input bg-muted/30 text-foreground text-sm">
              {invoice.invoice_number} — {invoice.company} — ₹{(invoice.total_amount || 0).toLocaleString("en-IN")}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Amount Received After TDS (₹) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              value={amountReceived || ""}
              onChange={(e) => { setAmountReceived(Number(e.target.value)); setError(""); }}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              TDS Amount Deducted (₹) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              value={tdsAmount || ""}
              onChange={(e) => { setTdsAmount(Number(e.target.value)); setError(""); }}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Total Reconciled</label>
            <div className={`w-full px-3 py-2.5 rounded-lg border text-sm font-semibold ${reconciles ? "border-success/50 bg-success/5 text-success" : "border-destructive/50 bg-destructive/5 text-destructive"}`}>
              ₹{totalReconciled.toLocaleString("en-IN")}
              {reconciles ? " ✓ Matches" : ` ≠ ₹${(invoice.total_amount || 0).toLocaleString("en-IN")}`}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Date of Receipt</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(receiptDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={receiptDate} onSelect={(d) => d && setReceiptDate(d)} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Bank Received Into</label>
            <input
              type="text"
              value={bankReceivedInto}
              onChange={(e) => setBankReceivedInto(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming || !reconciles}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {confirming ? "Confirming..." : "Confirm Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentConfirmation() {
  const { data: invoices = [], isLoading } = useInvoices();
  const { data: members = [] } = useMembers();
  const updateStatus = useUpdateInvoiceStatus();
  const { toast } = useToast();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const awaitingPayment = invoices.filter((inv) => inv.status === "Sent" || inv.status === "Pending");
  const paidInvoices = invoices.filter((inv) => inv.status === "Paid");

  const getDefaultBank = () => {
    if (members.length > 0) return members[0].bank_name;
    return "";
  };

  const handleConfirm = async (data: {
    payment_received: number;
    tds_amount: number;
    receipt_date: string;
    bank_received_into: string;
  }) => {
    if (!selectedInvoice) return;
    try {
      await updateStatus.mutateAsync({
        id: selectedInvoice.id,
        status: "Paid",
        payment_received: data.payment_received,
        tds_amount: data.tds_amount,
        receipt_date: data.receipt_date,
        bank_received_into: data.bank_received_into,
        confirmed_at: new Date().toISOString(),
      });
      toast({ title: "Payment confirmed", description: `Invoice ${selectedInvoice.invoice_number} marked as Paid.` });
      setSelectedInvoice(null);
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to confirm payment", variant: "destructive" });
    }
  };

  const statusColors: Record<string, string> = {
    Sent: "bg-success/10 text-success",
    Pending: "bg-warning/10 text-warning",
    Paid: "bg-primary/10 text-primary",
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Payment Confirmation</h1>
          <p className="text-sm text-muted-foreground mt-1">Log payments and reconcile TDS deductions</p>
        </div>

        {/* Awaiting payment */}
        <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-card-foreground">Awaiting Payment</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border bg-muted/30">
                  <th className="px-6 py-3.5 font-medium">Invoice No.</th>
                  <th className="px-6 py-3.5 font-medium">Company</th>
                  <th className="px-6 py-3.5 font-medium">Period</th>
                  <th className="px-6 py-3.5 font-medium">Amount</th>
                  <th className="px-6 py-3.5 font-medium">Status</th>
                  <th className="px-6 py-3.5 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : awaitingPayment.length > 0 ? awaitingPayment.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                    <td className="px-6 py-4 font-medium text-card-foreground">{inv.invoice_number}</td>
                    <td className="px-6 py-4 text-card-foreground">{inv.company}</td>
                    <td className="px-6 py-4 text-muted-foreground">{inv.invoice_period}</td>
                    <td className="px-6 py-4 font-semibold text-card-foreground">₹{(inv.total_amount || 0).toLocaleString("en-IN")}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[inv.status] || ""}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
                      >
                        Log Payment
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No invoices awaiting payment.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recently paid */}
        {paidInvoices.length > 0 && (
          <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-card-foreground">Recently Paid</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border bg-muted/30">
                    <th className="px-6 py-3.5 font-medium">Invoice No.</th>
                    <th className="px-6 py-3.5 font-medium">Company</th>
                    <th className="px-6 py-3.5 font-medium">Total</th>
                    <th className="px-6 py-3.5 font-medium">Received</th>
                    <th className="px-6 py-3.5 font-medium">TDS</th>
                    <th className="px-6 py-3.5 font-medium">Confirmed</th>
                  </tr>
                </thead>
                <tbody>
                  {paidInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/50 last:border-0">
                      <td className="px-6 py-4 font-medium text-card-foreground">{inv.invoice_number}</td>
                      <td className="px-6 py-4 text-card-foreground">{inv.company}</td>
                      <td className="px-6 py-4 text-card-foreground">₹{(inv.total_amount || 0).toLocaleString("en-IN")}</td>
                      <td className="px-6 py-4 text-success font-medium">₹{(inv.payment_received || 0).toLocaleString("en-IN")}</td>
                      <td className="px-6 py-4 text-muted-foreground">₹{(inv.tds_amount || 0).toLocaleString("en-IN")}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {inv.confirmed_at ? format(new Date(inv.confirmed_at), "dd MMM yyyy") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {selectedInvoice && (
        <PaymentModal
          open={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          invoice={selectedInvoice}
          defaultBank={getDefaultBank()}
          onConfirm={handleConfirm}
          confirming={updateStatus.isPending}
        />
      )}
    </DashboardLayout>
  );
}
