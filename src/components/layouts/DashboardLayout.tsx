import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Home, User, FileText, Send, Inbox, Building2, List, LogOut, Bell, Menu, X,
  PoundSterling, Zap, MessageSquare, Wrench, FileSignature, ShieldCheck, Users,
} from "lucide-react";
import { useState } from "react";

const tenantNav = [
  { to: "/dashboard", icon: Home, label: "Home" },
  { to: "/dashboard/tenancy", icon: PoundSterling, label: "My Tenancy" },
  { to: "/dashboard/utilities", icon: Zap, label: "Utilities" },
  { to: "/dashboard/complaints", icon: MessageSquare, label: "Complaints" },
  { to: "/dashboard/maintenance", icon: Wrench, label: "Maintenance" },
  { to: "/dashboard/contracts", icon: FileSignature, label: "Contracts" },
  { to: "/dashboard/profile", icon: User, label: "Profile" },
  { to: "/dashboard/documents", icon: FileText, label: "Documents" },
  { to: "/dashboard/references", icon: Send, label: "References" },
  { to: "/dashboard/applications", icon: Inbox, label: "Applications" },
  { to: "/dashboard/verification", icon: ShieldCheck, label: "Verification" },
];

const landlordNav = [
  { to: "/dashboard", icon: Home, label: "Home" },
  { to: "/dashboard/tenancies", icon: Users, label: "Tenancies" },
  { to: "/dashboard/listings", icon: Building2, label: "Listings" },
  { to: "/dashboard/pipeline", icon: List, label: "Pipeline" },
  { to: "/dashboard/workers", icon: Wrench, label: "Workers" },
  { to: "/dashboard/landlord-verification", icon: ShieldCheck, label: "Verification" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { role, signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = role === "landlord" || role === "agent" ? landlordNav : tenantNav;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card p-4">
        <Link to="/" className="font-display text-xl font-bold text-primary mb-8">
          TenantVault
        </Link>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2 truncate">{user?.email}</p>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col">
        <header className="lg:hidden flex items-center justify-between border-b border-border bg-card px-4 h-14">
          <Link to="/" className="font-display text-lg font-bold text-primary">TenantVault</Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </header>

        {/* Mobile nav overlay */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-background/95 backdrop-blur-sm pt-14">
            <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
              {nav.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium ${
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
              <Button variant="ghost" className="w-full justify-start gap-3 mt-4" onClick={handleSignOut}>
                <LogOut className="w-5 h-5" /> Sign out
              </Button>
            </nav>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
