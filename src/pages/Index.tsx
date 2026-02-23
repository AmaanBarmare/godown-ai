import { DashboardLayout } from "@/components/DashboardLayout";
import {
  DollarSign,
  Building2,
  Send,
  
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const kpis = [
  { label: "Total Revenue", value: "$124,500", change: "+12.5%", icon: DollarSign, positive: true },
  { label: "Total Companies", value: "38", change: "+3", icon: Building2, positive: true },
  { label: "Invoices Sent", value: "156", change: "+24", icon: Send, positive: true },
];

const revenueData = [
  { month: "Aug", revenue: 85000 },
  { month: "Sep", revenue: 92000 },
  { month: "Oct", revenue: 98000 },
  { month: "Nov", revenue: 105000 },
  { month: "Dec", revenue: 110000 },
  { month: "Jan", revenue: 118000 },
  { month: "Feb", revenue: 124500 },
];

const topCompanies = [
  { name: "Apex Logistics", revenue: 18500 },
  { name: "BlueLine Storage", revenue: 15200 },
  { name: "CargoHub Inc.", revenue: 13800 },
  { name: "Delta Freight", revenue: 12400 },
  { name: "EastPort Shipping", revenue: 11000 },
];

const recentInvoices = [
  { id: "INV-2024-156", company: "Apex Logistics", amount: "$4,200", date: "Feb 18, 2026", status: "Sent" },
  { id: "INV-2024-155", company: "BlueLine Storage", amount: "$3,800", date: "Feb 17, 2026", status: "Sent" },
  { id: "INV-2024-154", company: "CargoHub Inc.", amount: "$5,100", date: "Feb 16, 2026", status: "Pending" },
  { id: "INV-2024-153", company: "Delta Freight", amount: "$2,900", date: "Feb 15, 2026", status: "Sent" },
  { id: "INV-2024-152", company: "EastPort Shipping", amount: "$3,400", date: "Feb 14, 2026", status: "Overdue" },
];


const statusColors: Record<string, string> = {
  Sent: "bg-success/10 text-success",
  Pending: "bg-warning/10 text-warning",
  Overdue: "bg-destructive/10 text-destructive",
};

const Index = () => {
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
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${kpi.positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  {kpi.change}
                </span>
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
                <p className="text-xs text-muted-foreground">Trending over the last 7 months</p>
              </div>
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div className="h-[260px]">
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
            </div>
          </div>

          {/* Top Companies */}
          <div className="bg-card rounded-xl p-6 card-shadow border border-border">
            <h2 className="text-base font-semibold text-card-foreground mb-4">Top Companies</h2>
            <div className="space-y-4">
              {topCompanies.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-card-foreground">{c.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-card-foreground">${c.revenue.toLocaleString()}</span>
                </div>
              ))}
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
                  <th className="pb-3 font-medium">Invoice</th>
                  <th className="pb-3 font-medium">Company</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3 font-medium text-card-foreground">{inv.id}</td>
                    <td className="py-3 text-card-foreground">{inv.company}</td>
                    <td className="py-3 font-semibold text-card-foreground">{inv.amount}</td>
                    <td className="py-3 text-muted-foreground">{inv.date}</td>
                    <td className="py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[inv.status]}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
