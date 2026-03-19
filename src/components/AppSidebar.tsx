import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FilePlus,
  Bell,
  CheckCircle,
  History,
  UserPlus,
  LogOut,
} from "lucide-react";

const navItems = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Companies", path: "/companies", icon: Building2 },
  { title: "Members", path: "/members", icon: Users },
  { title: "Invoice Generator", path: "/invoice-generator", icon: FilePlus },
  { title: "Invoice History", path: "/invoice-history", icon: History },
  { title: "Payment Reminder", path: "/payment-reminder", icon: Bell },
  { title: "Payment Confirmation", path: "/payment-confirmation", icon: CheckCircle },
  { title: "Email Settings", path: "/settings", icon: Settings },
];

const adminNavItems = [
  { title: "Team", path: "/team", icon: UserPlus },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { userProfile, signOut } = useAuth();

  const allNavItems = [
    ...navItems,
    ...(userProfile?.role === "admin" ? adminNavItems : []),
  ];

  return (
    <aside
      className={`flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ${
        collapsed ? "w-[68px]" : "w-[260px]"
      } min-h-screen`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary shrink-0">
          <Sparkles className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-bold text-sidebar-accent-foreground tracking-tight">
              GodownAI
            </h1>
            <p className="text-[11px] text-sidebar-foreground/60">AI-powered invoicing</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {allNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User info + sign out */}
      {userProfile && (
        <div className="border-t border-sidebar-border px-3 py-3">
          {!collapsed && (
            <p className="text-xs text-sidebar-foreground/60 truncate mb-2">
              {userProfile.email}
            </p>
          )}
          <button
            onClick={signOut}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-sidebar-border text-sidebar-foreground/60 hover:text-sidebar-accent-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
