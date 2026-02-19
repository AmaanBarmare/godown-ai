import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Building2, Search } from "lucide-react";

const companies = [
  { id: 1, name: "Apex Logistics", rent: 18500, incrementDate: "Mar 15, 2026", status: "Active" },
  { id: 2, name: "BlueLine Storage", rent: 15200, incrementDate: "Apr 01, 2026", status: "Active" },
  { id: 3, name: "CargoHub Inc.", rent: 13800, incrementDate: "May 10, 2026", status: "Notice" },
  { id: 4, name: "Delta Freight", rent: 12400, incrementDate: "Jun 01, 2026", status: "Active" },
  { id: 5, name: "EastPort Shipping", rent: 11000, incrementDate: "Jul 15, 2026", status: "Active" },
  { id: 6, name: "FrostCold Logistics", rent: 8500, incrementDate: "—", status: "Closed" },
  { id: 7, name: "GlobalWare Solutions", rent: 22000, incrementDate: "Aug 01, 2026", status: "Active" },
  { id: 8, name: "HarborPoint Storage", rent: 9800, incrementDate: "Sep 01, 2026", status: "Active" },
];

const statusColors: Record<string, string> = {
  Active: "bg-success/10 text-success",
  Notice: "bg-warning/10 text-warning",
  Closed: "bg-muted text-muted-foreground",
};

export default function Companies() {
  const [search, setSearch] = useState("");

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Companies</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your tenant companies</p>
        </div>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-card-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border bg-muted/30">
                <th className="px-6 py-3.5 font-medium">Company Name</th>
                <th className="px-6 py-3.5 font-medium">Monthly Rent</th>
                <th className="px-6 py-3.5 font-medium">Increment Date</th>
                <th className="px-6 py-3.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-card-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    {c.name}
                  </td>
                  <td className="px-6 py-4 font-semibold text-card-foreground">${c.rent.toLocaleString()}</td>
                  <td className="px-6 py-4 text-muted-foreground">{c.incrementDate}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
