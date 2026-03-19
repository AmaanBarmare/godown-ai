import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCompanies } from "@/hooks/use-companies";
import { useMembers } from "@/hooks/use-members";
import { useEmailMappings } from "@/hooks/use-email-mappings";
import { useInvoices, useAddInvoice } from "@/hooks/use-invoices";
import { storage, db } from "@/integrations/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/integrations/firebase/config";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Company } from "@/integrations/firebase/types";
import type { Member } from "@/integrations/firebase/types";

function detectGstType(companyGst: string, memberGst: string): { type: "IGST" | "CGST+SGST"; rate: number } {
  const companyState = companyGst.substring(0, 2);
  const memberState = memberGst.substring(0, 2);
  if (companyState === memberState) {
    return { type: "CGST+SGST", rate: 18 };
  }
  return { type: "IGST", rate: 18 };
}

function generateInvoiceNumber(count: number): string {
  return `INV-${String(count + 1).padStart(3, "0")}`;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function InvoiceGenerator() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: companies = [] } = useCompanies();
  const { data: members = [] } = useMembers();
  const { data: emailMappings = [] } = useEmailMappings();
  const { data: invoices = [] } = useInvoices();
  const addInvoice = useAddInvoice();

  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth());
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());
  const [warehouseAddress, setWarehouseAddress] = useState("");
  const [areaSqft, setAreaSqft] = useState(0);
  const [ratePerSqft, setRatePerSqft] = useState(0);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [sending, setSending] = useState(false);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const selectedMember = members.find((m) => m.id === selectedMemberId);

  // Auto-generate invoice number from counter doc (syncs with auto-generated invoices)
  useEffect(() => {
    async function fetchInvoiceNumber() {
      try {
        const counterDoc = await getDoc(doc(db, "counters", "invoice_count"));
        if (counterDoc.exists()) {
          const count = counterDoc.data().count as number;
          setInvoiceNumber(generateInvoiceNumber(count));
        } else {
          setInvoiceNumber(generateInvoiceNumber(invoices.length));
        }
      } catch {
        setInvoiceNumber(generateInvoiceNumber(invoices.length));
      }
    }
    fetchInvoiceNumber();
  }, [invoices.length]);

  // Auto-fill from selected company
  useEffect(() => {
    if (selectedCompany) {
      setWarehouseAddress(selectedCompany.warehouse_location);
      setAreaSqft(selectedCompany.area_sqft);
      setRatePerSqft(selectedCompany.rate_per_sqft);
      // Find email mapping for this company
      const mapping = emailMappings.find(
        (m) => m.company.toLowerCase() === selectedCompany.company_name.toLowerCase()
      );
      if (mapping) {
        setRecipientEmail(mapping.primary_email);
        setSenderEmail(mapping.sender_email || "");
        setCc(mapping.cc || "");
        setBcc(mapping.bcc || "");
      }
      // Auto-select linked member if configured
      if (selectedCompany.member_id) {
        setSelectedMemberId(selectedCompany.member_id);
      }
    }
  }, [selectedCompanyId, selectedCompany, emailMappings]);

  const baseAmount = areaSqft * ratePerSqft;
  const gstInfo = selectedCompany && selectedMember
    ? detectGstType(selectedCompany.gst_number, selectedMember.gst_number)
    : { type: "IGST" as const, rate: 18 };
  const gstAmount = Math.round(baseAmount * gstInfo.rate / 100);
  const totalAmount = baseAmount + gstAmount;
  const invoicePeriod = `${months[periodMonth]} ${periodYear}`;

  const dueDate = useMemo(() => {
    if (!selectedCompany) return "";
    const d = new Date(periodYear, periodMonth + 1, selectedCompany.rent_due_day);
    return d.toISOString().split("T")[0];
  }, [selectedCompany, periodMonth, periodYear]);

  const generatePdf = (): jsPDF => {
    const doc = new jsPDF();

    // Header - Member (landlord) info
    if (selectedMember) {
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(selectedMember.name, 14, 20);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(selectedMember.address, 14, 27);
      doc.text(`GST: ${selectedMember.gst_number}`, 14, 33);
    }

    // Invoice metadata
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", 150, 20);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice No: ${invoiceNumber}`, 150, 28);
    doc.text(`Date: ${format(invoiceDate, "dd MMM yyyy")}`, 150, 34);
    doc.text(`Period: ${invoicePeriod}`, 150, 40);
    if (dueDate) doc.text(`Due Date: ${format(new Date(dueDate), "dd MMM yyyy")}`, 150, 46);

    // Divider
    doc.setDrawColor(200);
    doc.line(14, 52, 196, 52);

    // Tenant block
    if (selectedCompany) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Bill To:", 14, 60);
      doc.setFont("helvetica", "normal");
      doc.text(selectedCompany.company_name, 14, 66);
      doc.text(`Signing Authority: ${selectedCompany.signing_authority}`, 14, 72);
      doc.text(`GST: ${selectedCompany.gst_number}`, 14, 78);
      doc.text(selectedCompany.registered_address, 14, 84);
    }

    // Line items table
    autoTable(doc, {
      startY: 94,
      head: [["Description", "Area (sq.ft.)", "Rate/sq.ft. (₹)", "Amount (₹)"]],
      body: [
        [
          `Warehouse Rent - ${invoicePeriod}`,
          areaSqft.toLocaleString("en-IN"),
          ratePerSqft.toLocaleString("en-IN"),
          baseAmount.toLocaleString("en-IN"),
        ],
      ],
      theme: "grid",
      headStyles: { fillColor: [41, 65, 148] },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 5;

    // GST row
    doc.setFontSize(10);
    if (gstInfo.type === "CGST+SGST") {
      doc.text(`CGST (9%): ₹${(gstAmount / 2).toLocaleString("en-IN")}`, 130, finalY);
      doc.text(`SGST (9%): ₹${(gstAmount / 2).toLocaleString("en-IN")}`, 130, finalY + 6);
    } else {
      doc.text(`IGST (18%): ₹${gstAmount.toLocaleString("en-IN")}`, 130, finalY);
    }

    const totalY = gstInfo.type === "CGST+SGST" ? finalY + 14 : finalY + 8;
    doc.setFont("helvetica", "bold");
    doc.text(`Total Payable: ₹${totalAmount.toLocaleString("en-IN")}`, 130, totalY);

    // Payment instructions
    if (selectedMember) {
      const payY = totalY + 16;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Payment Details:", 14, payY);
      doc.setFont("helvetica", "normal");
      doc.text(`Bank: ${selectedMember.bank_name}`, 14, payY + 6);
      doc.text(`Branch: ${selectedMember.branch}`, 14, payY + 12);
      doc.text(`IFSC: ${selectedMember.ifsc_code}`, 14, payY + 18);
      doc.text(`Account No: ${selectedMember.account_number}`, 14, payY + 24);
    }

    return doc;
  };

  const handleSubmit = async () => {
    if (!selectedCompany || !selectedMember) {
      toast({ title: "Error", description: "Please select a company and member", variant: "destructive" });
      return;
    }
    if (!recipientEmail) {
      toast({ title: "Error", description: "Recipient email is required", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      // Generate PDF
      const doc = generatePdf();
      const pdfBlob = doc.output("blob");

      // Upload to Firebase Storage
      const filePath = `invoices/${invoiceNumber}.pdf`;
      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, pdfBlob);

      // Call Cloud Function to send email
      const sendInvoice = httpsCallable(functions, "sendInvoice");
      await sendInvoice({
        invoiceData: {
          invoice_number: invoiceNumber,
          invoice_period: invoicePeriod,
          company: selectedCompany.company_name,
          base_amount: baseAmount,
          gst_type: gstInfo.type,
          gst_rate: gstInfo.rate,
          gst_amount: gstAmount,
          total_amount: totalAmount,
          due_date: dueDate,
        },
        filePath,
        recipientEmail,
        senderEmail,
        cc,
        bcc,
      });

      // Save invoice to Firestore
      await addInvoice.mutateAsync({
        company: selectedCompany.company_name,
        amount: `₹${totalAmount.toLocaleString("en-IN")}`,
        invoice_date: invoiceDate.toISOString().split("T")[0],
        recipient_email: recipientEmail,
        sender_email: senderEmail,
        cc,
        bcc,
        file_name: `${invoiceNumber}.pdf`,
        status: "Sent",
        invoice_number: invoiceNumber,
        invoice_period: invoicePeriod,
        member_id: selectedMember.id,
        base_amount: baseAmount,
        gst_type: gstInfo.type,
        gst_rate: gstInfo.rate,
        gst_amount: gstAmount,
        total_amount: totalAmount,
        due_date: dueDate,
      });

      toast({ title: "Invoice sent!", description: `${invoiceNumber} sent to ${recipientEmail}` });
      navigate("/invoice-history");
    } catch (e) {
      console.error(e);
      const anyErr = e as any;
      const code = typeof anyErr?.code === "string" ? anyErr.code : undefined;
      const message = typeof anyErr?.message === "string" ? anyErr.message : undefined;
      toast({
        title: "Error",
        description: code ? `${code}: ${message ?? "Request failed"}` : (message ?? "Failed to send invoice"),
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Invoice Generator</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate and send invoices to tenants</p>
        </div>

        <div className="bg-card rounded-xl card-shadow border border-border p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Selector */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Company <span className="text-destructive">*</span>
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select company...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            </div>

            {/* Member Selector */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Member / Payee <span className="text-destructive">*</span>
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select member...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Invoice Number */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Invoice Number</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Invoice Date */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Invoice Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(invoiceDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={invoiceDate} onSelect={(d) => d && setInvoiceDate(d)} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            {/* Invoice Period */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Invoice Period</label>
              <div className="flex gap-2">
                <select
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(Number(e.target.value))}
                  className="flex-1 px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {months.map((m, i) => (
                    <option key={m} value={i}>{m}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={periodYear}
                  onChange={(e) => setPeriodYear(Number(e.target.value))}
                  className="w-24 px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Warehouse Address */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Warehouse Address</label>
              <textarea
                value={warehouseAddress}
                onChange={(e) => setWarehouseAddress(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {/* Area & Rate */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Area (sq.ft.)</label>
              <input
                type="number"
                value={areaSqft || ""}
                onChange={(e) => setAreaSqft(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Rate per sq.ft. (₹)</label>
              <input
                type="number"
                value={ratePerSqft || ""}
                onChange={(e) => setRatePerSqft(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Computed fields */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Base Amount</label>
              <div className="w-full px-3 py-2.5 rounded-lg border border-input bg-muted/30 text-foreground text-sm">
                ₹{baseAmount.toLocaleString("en-IN")}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">GST Type</label>
              <div className="w-full px-3 py-2.5 rounded-lg border border-input bg-muted/30 text-foreground text-sm">
                {selectedCompany && selectedMember ? (
                  gstInfo.type === "CGST+SGST"
                    ? "CGST 9% + SGST 9% (Intra-state)"
                    : "IGST 18% (Inter-state)"
                ) : "Select company & member"}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">GST Amount</label>
              <div className="w-full px-3 py-2.5 rounded-lg border border-input bg-muted/30 text-foreground text-sm">
                ₹{gstAmount.toLocaleString("en-IN")}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Total Payable</label>
              <div className="w-full px-3 py-2.5 rounded-lg border border-input bg-muted/30 text-foreground text-sm font-semibold">
                ₹{totalAmount.toLocaleString("en-IN")}
              </div>
            </div>

            {dueDate && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Due Date</label>
                <div className="w-full px-3 py-2.5 rounded-lg border border-input bg-muted/30 text-foreground text-sm">
                  {format(new Date(dueDate), "dd MMM yyyy")}
                </div>
              </div>
            )}
          </div>

          {/* Email section */}
          <div className="border-t border-border mt-6 pt-6">
            <p className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wide">Email Details</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Sender Email</label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Recipient Email <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">CC</label>
                <input
                  type="email"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">BCC</label>
                <input
                  type="email"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                const doc = generatePdf();
                doc.save(`${invoiceNumber}.pdf`);
              }}
              disabled={!selectedCompany || !selectedMember}
            >
              Preview PDF
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={sending || !selectedCompany || !selectedMember || !recipientEmail}
            >
              {sending ? "Sending..." : "Generate & Send"}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
