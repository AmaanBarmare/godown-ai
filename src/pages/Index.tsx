import { DashboardLayout } from "@/components/DashboardLayout";
import {
  DollarSign,
  Building2,
  Send,
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useInvoices } from "@/hooks/use-invoices";
import { useEmailMappings } from "@/hooks/use-email-mappings";

const statusColors: Record<string, string> = {
  Sent: "bg-success/10 text-success",
  Pending: "bg-warning/10 text-warning",
  Failed: "bg-destructive/10 text-destructive",
};

const Index = () => {
  const { data: invoices = [] } = useInvoices();
  const { data: mappings = [] } = useEmailMappings();

  // Compute KPIs from real data
  const totalRevenue = invoices.reduce((sum, inv) => {
    const num = parseFloat(inv.amount.replace(/[^0-9.-]/g, ""));
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  const totalCompanies = mappings.length;
  const invoicesSent = invoices.filter((i) => i.status === "Sent").length;

  const kpis = [
    { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign },
    { label: "Total Companies", value: String(totalCompanies), icon: Building2 },
    { label: "Invoices Sent", value: String(invoicesSent), icon: Send },
  ];

  // Group invoices by month for chart
  const revenueByMonth: Record<string, number> = {};
  invoices.forEach((inv) => {
    const date = new Date(inv.created_at);
    const key = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const num = parseFloat(inv.amount.replace(/[^0-9.-]/g, ""));
    if (!isNaN(num)) revenueByMonth[key] = (revenueByMonth[key] || 0) + num;
  });

  const revenueData = Object.entries(revenueByMonth)
    .map(([month, revenue]) => ({ month, revenue }))
    .slice(-7);

  // Top companies by total invoiced
  const companyTotals: Record<string, number> = {};
  invoices.forEach((inv) => {
    const num = parseFloat(inv.amount.replace(/[^0-9.-]/g, ""));
    if (!isNaN(num)) companyTotals[inv.company] = (companyTotals[inv.company] || 0) + num;
  });
  const topCompanies = Object.entries(companyTotals)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Recent invoices (already sorted desc by created_at)
  const recentInvoices = invoices.slice(0, 5);

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Executive overview of your warehouse rental business</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-card rounded-xl p-5 card-shadow border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <kpi.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-bold text-card-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-card rounded-xl p-6 card-shadow border border-border">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold text-card-foreground">Monthly Revenue</h2>
                <p className="text-xs text-muted-foreground">Based on sent invoices</p>
              </div>
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div className="h-[260px]">
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(217, 71%, 45%)" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="hsl(217, 71%, 45%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 90%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 50%)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 50%)" tickFormatter={(v) => `$${v / 1000}k`} />
                    <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(217, 71%, 45%)" strokeWidth={2} fill="url(#revenueGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No invoice data yet. Send your first invoice to see revenue trends.
                </div>
              )}
            </div>
          </div>

          {/* Top Companies */}
          <div className="bg-card rounded-xl p-6 card-shadow border border-border">
            <h2 className="text-base font-semibold text-card-foreground mb-4">Top Companies</h2>
            <div className="space-y-4">
              {topCompanies.length > 0 ? topCompanies.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-card-foreground">{c.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-card-foreground">${c.revenue.toLocaleString()}</span>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-card rounded-xl p-6 card-shadow border border-border">
          <h2 className="text-base font-semibold text-card-foreground mb-4">Recent Invoices</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-3 font-medium">Company</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Sent To</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.length > 0 ? recentInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3 font-medium text-card-foreground">{inv.company}</td>
                    <td className="py-3 font-semibold text-card-foreground">{inv.amount}</td>
                    <td className="py-3 text-muted-foreground">{inv.recipient_email}</td>
                    <td className="py-3 text-muted-foreground">{inv.invoice_date}</td>
                    <td className="py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[inv.status] || ""}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No invoices sent yet. Upload one in Invoice Sender to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
