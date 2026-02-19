import { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Upload, FileText, Sparkles, CheckCircle, Send, X } from "lucide-react";

type UploadState = "idle" | "uploading" | "preview" | "sending" | "success";

const InvoiceSender = () => {
  const [state, setState] = useState<UploadState>("idle");
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState("");

  const mockInvoice = {
    company: "Apex Logistics",
    amount: "$4,200.00",
    date: "Feb 19, 2026",
    email: "billing@apexlogistics.com",
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setFileName(file.name);
      setState("uploading");
      setTimeout(() => setState("preview"), 1500);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setState("uploading");
      setTimeout(() => setState("preview"), 1500);
    }
  };

  const handleSend = () => {
    setState("sending");
    setTimeout(() => setState("success"), 2000);
  };

  const handleReset = () => {
    setState("idle");
    setFileName("");
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Invoice Sender</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload invoices and let AI handle the rest</p>
        </div>

        <div className="max-w-2xl mx-auto">
          {state === "idle" && (
            <div className="space-y-6">
              {/* Big CTA */}
              <label className="block">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                    dragActive
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileSelect} className="hidden" />
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">Upload & Send Invoice</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Drag & drop your invoice PDF or image, or click to browse
                      </p>
                    </div>
                    <span className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                      Choose File
                    </span>
                  </div>
                </div>
              </label>

              {/* How it works */}
              <div className="bg-card rounded-xl p-6 card-shadow border border-border">
                <h3 className="text-sm font-semibold text-card-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> How AI Invoice Sending Works
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { step: "1", title: "Upload", desc: "Drop your invoice PDF or image" },
                    { step: "2", title: "AI Reads", desc: "Detects company, amount & date" },
                    { step: "3", title: "Auto-Send", desc: "Matches email & sends instantly" },
                  ].map((s) => (
                    <div key={s.step} className="text-center p-4 rounded-lg bg-muted/50">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center mx-auto mb-2">
                        {s.step}
                      </div>
                      <p className="text-sm font-medium text-card-foreground">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {state === "uploading" && (
            <div className="bg-card rounded-xl p-12 card-shadow border border-border text-center">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-4" />
              <p className="text-base font-semibold text-card-foreground">Processing Invoice...</p>
              <p className="text-sm text-muted-foreground mt-1">AI is reading {fileName}</p>
            </div>
          )}

          {state === "preview" && (
            <div className="space-y-4">
              <div className="bg-card rounded-xl p-6 card-shadow border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-card-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> AI Detection Results
                  </h3>
                  <button onClick={handleReset} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-card-foreground">{fileName}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Company", value: mockInvoice.company },
                    { label: "Amount", value: mockInvoice.amount },
                    { label: "Date", value: mockInvoice.date },
                    { label: "Recipient", value: mockInvoice.email },
                  ].map((f) => (
                    <div key={f.label} className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">{f.label}</p>
                      <p className="text-sm font-semibold text-card-foreground mt-0.5">{f.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={handleSend}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> Send Invoice
              </button>
            </div>
          )}

          {state === "sending" && (
            <div className="bg-card rounded-xl p-12 card-shadow border border-border text-center">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-4" />
              <p className="text-base font-semibold text-card-foreground">Sending Invoice...</p>
              <p className="text-sm text-muted-foreground mt-1">Delivering to {mockInvoice.email}</p>
            </div>
          )}

          {state === "success" && (
            <div className="bg-card rounded-xl p-10 card-shadow border border-border text-center">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-lg font-bold text-card-foreground mb-1">Invoice Sent Successfully!</h3>
              <div className="text-sm text-muted-foreground space-y-1 mb-6">
                <p>Sent to: <span className="text-card-foreground font-medium">{mockInvoice.email}</span></p>
                <p>Amount: <span className="text-card-foreground font-medium">{mockInvoice.amount}</span></p>
                <p>Timestamp: <span className="text-card-foreground font-medium">Feb 19, 2026 at 10:42 AM</span></p>
              </div>
              <button
                onClick={handleReset}
                className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Send Another Invoice
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InvoiceSender;
