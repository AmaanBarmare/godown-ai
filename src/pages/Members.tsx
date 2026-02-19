import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { X } from "lucide-react";

const members = [
  { id: 1, name: "John Carter", revenue: 52400 },
  { id: 2, name: "Sarah Chen", revenue: 46800 },
  { id: 3, name: "Mike Ross", revenue: 41200 },
  { id: 4, name: "Emily Watson", revenue: 32100 },
  { id: 5, name: "David Kim", revenue: 18500 },
];

const memberDetails: Record<number, { companies: Array<{ name: string; rent: number }> }> = {
  1: {
    companies: [
      { name: "Apex Logistics", rent: 18500 },
      { name: "CargoHub Inc.", rent: 15200 },
      { name: "FrostCold Logistics", rent: 10200 },
      { name: "Delta Freight", rent: 8500 },
    ],
  },
  2: {
    companies: [
      { name: "BlueLine Storage", rent: 22000 },
      { name: "EastPort Shipping", rent: 14800 },
      { name: "HarborPoint Storage", rent: 10000 },
    ],
  },
  3: {
    companies: [
      { name: "GlobalWare Solutions", rent: 22000 },
      { name: "Apex Logistics", rent: 19200 },
    ],
  },
  4: {
    companies: [
      { name: "CargoHub Inc.", rent: 18100 },
      { name: "Delta Freight", rent: 14000 },
    ],
  },
  5: {
    companies: [
      { name: "FrostCold Logistics", rent: 10000 },
      { name: "EastPort Shipping", rent: 8500 },
    ],
  },
};

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

              {/* Company-wise rent breakdown */}
              <div>
                <h4 className="text-sm font-semibold text-card-foreground mb-3">Company-wise Rent</h4>
                <div className="space-y-2">
                  {detail.companies.map((c) => (
                    <div key={c.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                      <span className="font-medium text-card-foreground">{c.name}</span>
                      <span className="font-semibold text-card-foreground">${c.rent.toLocaleString()}</span>
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
