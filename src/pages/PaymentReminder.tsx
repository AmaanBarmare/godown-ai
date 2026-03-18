import { DashboardLayout } from "@/components/DashboardLayout";
import { useInvoices, useUpdateInvoiceStatus } from "@/hooks/use-invoices";
import { useCompanies } from "@/hooks/use-companies";
import { useEmailMappings } from "@/hooks/use-email-mappings";
import { useToast } from "@/hooks/use-toast";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/integrations/firebase/config";
import { format, differenceInDays } from "date-fns";
import { useState } from "react";

export default function PaymentReminder() {
  const { data: invoices = [], isLoading } = useInvoices();
  const { data: companies = [] } = useCompanies();
  const { data: emailMappings = [] } = useEmailMappings();
  const updateStatus = useUpdateInvoiceStatus();
  const { toast } = useToast();
  const [sendingId, setSendingId] = useState<string | null>(null);

  const today = new Date();

  const sentInvoices = invoices.filter((inv) => inv.status === "Sent");
  const pendingInvoices = invoices.filter((inv) => inv.status === "Pending");

  const getCompanyBufferDays = (companyName: string): number => {
    const company = companies.find((c) => c.company_name.toLowerCase() === companyName.toLowerCase());
    return company?.reminder_buffer_days ?? 5;
  };

  const isReminderAvailable = (inv: { due_date: string; company: string }) => {
    if (!inv.due_date) return true;
    const dueDate = new Date(inv.due_date);
    const bufferDays = getCompanyBufferDays(inv.company);
    const availableDate = new Date(dueDate);
    availableDate.setDate(availableDate.getDate() + bufferDays);
    return today >= availableDate;
  };

  const getAvailableDate = (inv: { due_date: string; company: string }) => {
    if (!inv.due_date) return null;
    const dueDate = new Date(inv.due_date);
    const bufferDays = getCompanyBufferDays(inv.company);
    const availableDate = new Date(dueDate);
    availableDate.setDate(availableDate.getDate() + bufferDays);
    return availableDate;
  };

  const getDaysOverdue = (dueDate: string) => {
    if (!dueDate) return 0;
    return Math.max(0, differenceInDays(today, new Date(dueDate)));
  };

  const handleSendReminder = async (inv: typeof invoices[0]) => {
    setSendingId(inv.id);
    try {
      const mapping = emailMappings.find(
        (m) => m.company.toLowerCase() === inv.company.toLowerCase()
      );

      const sendPaymentReminder = httpsCallable(functions, "sendPaymentReminder");
      await sendPaymentReminder({
        invoiceId: inv.id,
        recipientEmail: inv.recipient_email,
        senderEmail: inv.sender_email || mapping?.sender_email || "",
        invoiceNumber: inv.invoice_number,
        amount: inv.total_amount,
        dueDate: inv.due_date,
        companyName: inv.company,
      });

      await updateStatus.mutateAsync({
        id: inv.id,
        status: "Pending",
        reminder_sent_at: new Date().toISOString(),
      });

      toast({ title: "Reminder sent", description: `Payment reminder sent for ${inv.invoice_number}` });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to send reminder", variant: "destructive" });
    } finally {
      setSendingId(null);
    }
  };

  const statusColors: Record<string, string> = {
    Sent: "bg-success/10 text-success",
    Pending: "bg-warning/10 text-warning",
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Payment Reminder</h1>
          <p className="text-sm text-muted-foreground mt-1">Send payment reminders for overdue invoices</p>
        </div>

        {/* Sent invoices awaiting payment */}
        <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-card-foreground">Invoices Awaiting Payment</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border bg-muted/30">
                  <th className="px-6 py-3.5 font-medium">Company</th>
                  <th className="px-6 py-3.5 font-medium">Invoice</th>
                  <th className="px-6 py-3.5 font-medium">Amount</th>
                  <th className="px-6 py-3.5 font-medium">Due Date</th>
                  <th className="px-6 py-3.5 font-medium">Days Overdue</th>
                  <th className="px-6 py-3.5 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : sentInvoices.length > 0 ? sentInvoices.map((inv) => {
                  const available = isReminderAvailable(inv);
                  const availDate = getAvailableDate(inv);
                  const daysOverdue = getDaysOverdue(inv.due_date);
                  return (
                    <tr key={inv.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                      <td className="px-6 py-4 font-medium text-card-foreground">{inv.company}</td>
                      <td className="px-6 py-4 text-card-foreground">
                        {inv.invoice_number} <span className="text-muted-foreground">({inv.invoice_period})</span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-card-foreground">₹{inv.total_amount?.toLocaleString("en-IN")}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {inv.due_date ? format(new Date(inv.due_date), "dd MMM yyyy") : "—"}
                      </td>
                      <td className="px-6 py-4">
                        {daysOverdue > 0 ? (
                          <span className="text-destructive font-medium">{daysOverdue} days</span>
                        ) : (
                          <span className="text-muted-foreground">Not yet due</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {available ? (
                          <button
                            onClick={() => handleSendReminder(inv)}
                            disabled={sendingId === inv.id}
                            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50"
                          >
                            {sendingId === inv.id ? "Sending..." : "Send Reminder"}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Available on {availDate ? format(availDate, "dd MMM") : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No sent invoices awaiting payment.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending invoices (reminder already sent) */}
        <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-card-foreground">Reminders Sent</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border bg-muted/30">
                  <th className="px-6 py-3.5 font-medium">Company</th>
                  <th className="px-6 py-3.5 font-medium">Invoice</th>
                  <th className="px-6 py-3.5 font-medium">Amount</th>
                  <th className="px-6 py-3.5 font-medium">Reminder Sent</th>
                  <th className="px-6 py-3.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {pendingInvoices.length > 0 ? pendingInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/50 last:border-0">
                    <td className="px-6 py-4 font-medium text-card-foreground">{inv.company}</td>
                    <td className="px-6 py-4 text-card-foreground">{inv.invoice_number}</td>
                    <td className="px-6 py-4 font-semibold text-card-foreground">₹{inv.total_amount?.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {inv.reminder_sent_at ? format(new Date(inv.reminder_sent_at), "dd MMM yyyy, HH:mm") : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors["Pending"]}`}>
                        Pending
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No reminders sent yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
