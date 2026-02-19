import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Bell, TrendingUp, AlertTriangle, Clock, BarChart3 } from "lucide-react";

interface AlertItem {
  id: number;
  title: string;
  description: string;
  icon: typeof Bell;
  enabled: boolean;
  category: string;
}

const initialAlerts: AlertItem[] = [
  { id: 1, title: "Upcoming Rent Increments", description: "Get notified 30 days before any rent increment is due", icon: TrendingUp, enabled: true, category: "Rent" },
  { id: 2, title: "Invoice Not Sent", description: "Alert when a scheduled invoice hasn't been sent by the expected date", icon: AlertTriangle, enabled: true, category: "Invoice" },
  { id: 3, title: "Payment Delay Alert", description: "Notify when a payment is overdue by more than 7 days", icon: Clock, enabled: false, category: "Payment" },
  { id: 4, title: "Monthly Revenue Summary", description: "Receive an automated monthly summary of revenue, invoices, and trends", icon: BarChart3, enabled: true, category: "Report" },
];

export default function Alerts() {
  const [alerts, setAlerts] = useState(initialAlerts);

  const toggleAlert = (id: number) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Alerts & Automation</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage proactive alerts and automated workflows</p>
        </div>

        <div className="space-y-4 max-w-3xl">
          {alerts.map((alert) => (
            <div key={alert.id} className="bg-card rounded-xl card-shadow border border-border p-5 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${alert.enabled ? "bg-primary/10" : "bg-muted"}`}>
                <alert.icon className={`w-5 h-5 ${alert.enabled ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-card-foreground">{alert.title}</h3>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{alert.category}</span>
                </div>
                <p className="text-xs text-muted-foreground">{alert.description}</p>
              </div>
              <button
                onClick={() => toggleAlert(alert.id)}
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 mt-1 ${alert.enabled ? "bg-success" : "bg-muted"}`}
              >
                <div className={`w-5 h-5 rounded-full bg-card absolute top-0.5 transition-transform ${alert.enabled ? "translate-x-[22px]" : "translate-x-0.5"}`} />
              </button>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-8 p-5 rounded-xl bg-muted/50 border border-border max-w-3xl">
          <h3 className="text-sm font-semibold text-foreground mb-2">How Automations Work</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            When enabled, alerts are checked daily. Notifications are sent to configured admin email addresses.
            Revenue summaries are generated on the 1st of each month. You can customize alert timing and recipients
            in the Email & AI Settings section.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
