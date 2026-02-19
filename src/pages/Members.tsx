import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Users, X } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const members = [
  { id: 1, name: "John Carter", invoicesSent: 42, revenue: 52400 },
  { id: 2, name: "Sarah Chen", invoicesSent: 38, revenue: 46800 },
  { id: 3, name: "Mike Ross", invoicesSent: 35, revenue: 41200 },
  { id: 4, name: "Emily Watson", invoicesSent: 28, revenue: 32100 },
  { id: 5, name: "David Kim", invoicesSent: 13, revenue: 18500 },
];

const memberDetails: Record<number, { companies: Array<{ name: string; revenue: number }>; invoices: Array<{ id: string; company: string; amount: string; date: string }> }> = {
  1: {
    companies: [
      { name: "Apex Logistics", revenue: 18500 },
      { name: "CargoHub Inc.", revenue: 15200 },
      { name: "FrostCold Logistics", revenue: 10200 },
      { name: "Others", revenue: 8500 },
    ],
    invoices: [
      { id: "INV-2024-156", company: "Apex Logistics", amount: "$4,200", date: "Feb 18, 2026" },
      { id: "INV-2024-154", company: "CargoHub Inc.", amount: "$5,100", date: "Feb 16, 2026" },
      { id: "INV-2024-151", company: "FrostCold Logistics", amount: "$8,500", date: "Feb 13, 2026" },
    ],
  },
  2: {
    companies: [
      { name: "BlueLine Storage", revenue: 22000 },
      { name: "EastPort Shipping", revenue: 14800 },
      { name: "Others", revenue: 10000 },
    ],
    invoices: [
      { id: "INV-2024-155", company: "BlueLine Storage", amount: "$3,800", date: "Feb 17, 2026" },
      { id: "INV-2024-152", company: "EastPort Shipping", amount: "$3,400", date: "Feb 14, 2026" },
    ],
  },
};

const COLORS = ["hsl(217, 71%, 45%)", "hsl(152, 55%, 42%)", "hsl(38, 92%, 50%)", "hsl(280, 60%, 55%)"];

export default function Members() {
  const [selectedMember, setSelectedMember] = useState<number | null>(null);

  const detail = selectedMember ? memberDetails[selectedMember] : null;
  const member = members.find((m) => m.id === selectedMember);

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Members</h1>
          <p className="text-sm text-muted-foreground mt-1">Track revenue attribution by team member</p>
        </div>

        <div className="flex gap-6">
          {/* Table */}
          <div className={`${selectedMember ? "flex-1" : "w-full"} transition-all`}>
            <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border bg-muted/30">
                    <th className="px-6 py-3.5 font-medium">Member</th>
                    <th className="px-6 py-3.5 font-medium">Invoices Sent</th>
                    <th className="px-6 py-3.5 font-medium">Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedMember(m.id)}
                      className={`border-b border-border/50 last:border-0 cursor-pointer transition-colors ${
                        selectedMember === m.id ? "bg-primary/5" : "hover:bg-muted/30"
                      }`}
                    >
                      <td className="px-6 py-4 font-medium text-card-foreground flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                          {m.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        {m.name}
                      </td>
                      <td className="px-6 py-4 text-card-foreground">{m.invoicesSent}</td>
                      <td className="px-6 py-4 font-semibold text-card-foreground">${m.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Slide panel */}
          {selectedMember && detail && (
            <div className="w-[400px] bg-card rounded-xl card-shadow border border-border p-6 animate-slide-in-right">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold text-card-foreground">{member?.name}</h3>
                <button onClick={() => setSelectedMember(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-lg bg-primary/5 mb-6">
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-card-foreground">${member?.revenue.toLocaleString()}</p>
              </div>

              {/* Pie chart */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-card-foreground mb-3">Revenue Distribution</h4>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={detail.companies} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={70} strokeWidth={2}>
                        {detail.companies.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  {detail.companies.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      {c.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent invoices */}
              <div>
                <h4 className="text-sm font-semibold text-card-foreground mb-3">Recent Invoices</h4>
                <div className="space-y-2">
                  {detail.invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                      <div>
                        <p className="font-medium text-card-foreground">{inv.id}</p>
                        <p className="text-xs text-muted-foreground">{inv.company} · {inv.date}</p>
                      </div>
                      <span className="font-semibold text-card-foreground">{inv.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
