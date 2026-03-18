import { DashboardLayout } from "@/components/DashboardLayout";
import {
  DollarSign,
  Building2,
  Send,
  CheckCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useInvoices } from "@/hooks/use-invoices";
import { useCompanies } from "@/hooks/use-companies";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

const statusColors: Record<string, string> = {
  Sent: "bg-success/10 text-success",
  Pending: "bg-warning/10 text-warning",
  Paid: "bg-primary/10 text-primary",
  Failed: "bg-destructive/10 text-destructive",
};

const Index = () => {
  const { data: invoices = [] } = useInvoices();
  const { data: companies = [] } = useCompanies();

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  const thisMonthInvoices = invoices.filter((inv) => {
    const d = new Date(inv.created_at);
    return isWithinInterval(d, { start: currentMonthStart, end: currentMonthEnd });
  });

  // KPIs
  const totalRevenue = thisMonthInvoices
    .filter((i) => i.status === "Paid")
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  const activeCompanies = companies.length;
  const invoicesSentCount = thisMonthInvoices.length;
  const invoicesPaid = invoices.filter((i) => i.status === "Paid").length;
  const invoicesPending = invoices.filter((i) => i.status === "Sent" || i.status === "Pending").length;

  const kpis = [
    { label: "Total Revenue (This Month)", value: `₹${totalRevenue.toLocaleString("en-IN")}`, icon: DollarSign },
    { label: "Active Companies", value: String(activeCompanies), icon: Building2 },
    { label: "Invoices Sent (This Month)", value: String(invoicesSentCount), icon: Send },
    { label: "Invoices Paid", value: String(invoicesPaid), icon: CheckCircle },
    { label: "Invoices Pending", value: String(invoicesPending), icon: Clock },
  ];

  // Monthly revenue chart (last 12 months, Paid invoices)
  const revenueData: { month: string; revenue: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const mStart = startOfMonth(monthDate);
    const mEnd = endOfMonth(monthDate);
    const label = format(monthDate, "MMM yyyy");
    const revenue = invoices
      .filter((inv) => {
        if (inv.status !== "Paid") return false;
        const d = new Date(inv.created_at);
        return isWithinInterval(d, { start: mStart, end: mEnd });
      })
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    revenueData.push({ month: label, revenue });
  }

  // Recent 5 invoices
  const recentInvoices = invoices.slice(0, 5);

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Executive overview of your warehouse rental business</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
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

        {/* Revenue Chart */}
        <div className="bg-card rounded-xl p-6 card-shadow border border-border mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-card-foreground">Monthly Revenue</h2>
              <p className="text-xs text-muted-foreground">Paid invoice amounts by month (last 12 months)</p>
            </div>
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <div className="h-[260px]">
            {revenueData.some((d) => d.revenue > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 90%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 50%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 50%)" tickFormatter={(v) => `₹${(v / 1000).toLocaleString("en-IN")}k`} />
                  <Tooltip formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Revenue"]} />
                  <Bar dataKey="revenue" fill="hsl(217, 71%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No paid invoice data yet.
              </div>
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-card rounded-xl p-6 card-shadow border border-border">
          <h2 className="text-base font-semibold text-card-foreground mb-4">Recent Invoices</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-3 font-medium">Invoice No.</th>
                  <th className="pb-3 font-medium">Company</th>
                  <th className="pb-3 font-medium">Period</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.length > 0 ? recentInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3 font-medium text-card-foreground">{inv.invoice_number || "—"}</td>
                    <td className="py-3 text-card-foreground">{inv.company}</td>
                    <td className="py-3 text-muted-foreground">{inv.invoice_period || "—"}</td>
                    <td className="py-3 font-semibold text-card-foreground">
                      {inv.total_amount ? `₹${inv.total_amount.toLocaleString("en-IN")}` : inv.amount}
                    </td>
                    <td className="py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[inv.status] || ""}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No invoices yet. Generate one in Invoice Generator to get started.
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
