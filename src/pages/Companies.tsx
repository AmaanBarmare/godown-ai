import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Building2, Search, ChevronRight } from "lucide-react";

const companies = [
  { id: 1, name: "Apex Logistics", warehouses: 4, rent: 18500, status: "Active" },
  { id: 2, name: "BlueLine Storage", warehouses: 3, rent: 15200, status: "Active" },
  { id: 3, name: "CargoHub Inc.", warehouses: 5, rent: 13800, status: "Notice" },
  { id: 4, name: "Delta Freight", warehouses: 2, rent: 12400, status: "Active" },
  { id: 5, name: "EastPort Shipping", warehouses: 3, rent: 11000, status: "Active" },
  { id: 6, name: "FrostCold Logistics", warehouses: 1, rent: 8500, status: "Closed" },
  { id: 7, name: "GlobalWare Solutions", warehouses: 6, rent: 22000, status: "Active" },
  { id: 8, name: "HarborPoint Storage", warehouses: 2, rent: 9800, status: "Active" },
];

const companyDetails: Record<number, Array<{ warehouse: string; rent: number; incrementDate: string; status: string }>> = {
  1: [
    { warehouse: "WH-A1", rent: 5000, incrementDate: "Mar 15, 2026", status: "Active" },
    { warehouse: "WH-A2", rent: 4500, incrementDate: "Jun 01, 2026", status: "Active" },
    { warehouse: "WH-B1", rent: 5000, incrementDate: "Mar 15, 2026", status: "Active" },
    { warehouse: "WH-C3", rent: 4000, incrementDate: "Sep 01, 2026", status: "Active" },
  ],
  2: [
    { warehouse: "WH-D1", rent: 5200, incrementDate: "Apr 01, 2026", status: "Active" },
    { warehouse: "WH-D2", rent: 5000, incrementDate: "Apr 01, 2026", status: "Active" },
    { warehouse: "WH-E1", rent: 5000, incrementDate: "Jul 01, 2026", status: "Active" },
  ],
};

const statusColors: Record<string, string> = {
  Active: "bg-success/10 text-success",
  Notice: "bg-warning/10 text-warning",
  Closed: "bg-muted text-muted-foreground",
};

export default function Companies() {
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const selected = companies.find((c) => c.id === selectedCompany);
  const details = selectedCompany ? companyDetails[selectedCompany] || [] : [];

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Companies</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your tenant companies and warehouses</p>
        </div>

        {!selectedCompany ? (
          <>
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
                    <th className="px-6 py-3.5 font-medium">Warehouses</th>
                    <th className="px-6 py-3.5 font-medium">Monthly Rent</th>
                    <th className="px-6 py-3.5 font-medium">Status</th>
                    <th className="px-6 py-3.5 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCompany(c.id)}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-card-foreground flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        {c.name}
                      </td>
                      <td className="px-6 py-4 text-card-foreground">{c.warehouses}</td>
                      <td className="px-6 py-4 font-semibold text-card-foreground">${c.rent.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[c.status]}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => setSelectedCompany(null)}
              className="text-sm text-primary hover:underline mb-4 flex items-center gap-1"
            >
              ← Back to Companies
            </button>
            <div className="bg-card rounded-xl card-shadow border border-border p-6 mb-6">
              <div className="flex items-center gap-3 mb-1">
                <Building2 className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-card-foreground">{selected?.name}</h2>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[selected?.status || "Active"]}`}>
                  {selected?.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{selected?.warehouses} warehouses · ${selected?.rent.toLocaleString()}/month</p>
            </div>

            <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border bg-muted/30">
                    <th className="px-6 py-3.5 font-medium">Warehouse</th>
                    <th className="px-6 py-3.5 font-medium">Current Rent</th>
                    <th className="px-6 py-3.5 font-medium">Increment Date</th>
                    <th className="px-6 py-3.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {details.length > 0 ? details.map((d, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="px-6 py-4 font-medium text-card-foreground">{d.warehouse}</td>
                      <td className="px-6 py-4 font-semibold text-card-foreground">${d.rent.toLocaleString()}</td>
                      <td className="px-6 py-4 text-muted-foreground">{d.incrementDate}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-success/10 text-success">{d.status}</span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No warehouse details available</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
