import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Home, User, FileText, Send, Inbox, Building2, List, LogOut, Menu, X,
  PoundSterling, Zap, MessageSquare, Wrench, FileSignature, ShieldCheck, Users, ScrollText, BarChart3, LineChart, Shield,
} from "lucide-react";
import { useState } from "react";
import NotificationBell from "@/components/NotificationBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import OnboardingTour from "@/components/OnboardingTour";

const tenantNav = [
  { to: "/dashboard", icon: Home, labelKey: "nav.home" },
  { to: "/dashboard/tenancy", icon: PoundSterling, labelKey: "nav.myTenancy" },
  { to: "/dashboard/utilities", icon: Zap, labelKey: "nav.utilities" },
  { to: "/dashboard/complaints", icon: MessageSquare, labelKey: "nav.complaints" },
  { to: "/dashboard/maintenance", icon: Wrench, labelKey: "nav.maintenance" },
  { to: "/dashboard/contracts", icon: FileSignature, labelKey: "nav.contracts" },
  { to: "/dashboard/policies", icon: ScrollText, labelKey: "nav.policies" },
  { to: "/dashboard/accounting", icon: BarChart3, labelKey: "nav.accounting" },
  { to: "/dashboard/profile", icon: User, labelKey: "nav.profile" },
  { to: "/dashboard/references", icon: Send, labelKey: "nav.references" },
  { to: "/dashboard/applications", icon: Inbox, labelKey: "nav.applications" },
  { to: "/dashboard/verification", icon: ShieldCheck, labelKey: "nav.verification" },
  { to: "/dashboard/privacy", icon: Shield, labelKey: "nav.privacy" },
];

const landlordNav = [
  { to: "/dashboard", icon: Home, labelKey: "nav.home" },
  { to: "/dashboard/tenancies", icon: Users, labelKey: "nav.tenancies" },
  { to: "/dashboard/listings", icon: Building2, labelKey: "nav.listings" },
  { to: "/dashboard/pipeline", icon: List, labelKey: "nav.pipeline" },
  { to: "/dashboard/landlord-applications", icon: Inbox, labelKey: "nav.applications" },
  { to: "/dashboard/accounting", icon: BarChart3, labelKey: "nav.accounting" },
  { to: "/dashboard/landlord-utilities", icon: Zap, labelKey: "nav.utilities" },
  { to: "/dashboard/landlord-complaints", icon: MessageSquare, labelKey: "nav.complaints" },
  { to: "/dashboard/landlord-contracts", icon: FileSignature, labelKey: "nav.contracts" },
  { to: "/dashboard/workers", icon: Wrench, labelKey: "nav.workers" },
  { to: "/dashboard/landlord-maintenance", icon: Wrench, labelKey: "nav.maintenance" },
  { to: "/dashboard/landlord-policies", icon: ScrollText, labelKey: "nav.policies" },
  { to: "/dashboard/landlord-verification", icon: ShieldCheck, labelKey: "nav.verification" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { role, signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const adminNav = [
    { to: "/dashboard/admin/analytics", icon: LineChart, labelKey: "nav.analytics" },
    { to: "/dashboard/admin/verifications", icon: ShieldCheck, labelKey: "nav.verification" },
  ];

  const baseNav = role === "landlord" || role === "agent" ? landlordNav : tenantNav;
  const nav = role === "admin" ? adminNav : baseNav;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Skip to content */}
      <a
        href="#dashboard-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md"
      >
        {t("common.skipToContent")}
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-e border-border bg-card p-4" aria-label={t("a11y.mainNavigation")}>
        <Link to="/" className="font-display text-xl font-bold text-primary mb-8">
          {t("common.appName")}
        </Link>
        <nav className="flex-1 space-y-1 overflow-y-auto" aria-label={t("a11y.mainNavigation")}>
          {nav.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" aria-hidden="true" />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
        <div className="pt-4 border-t border-border" aria-label={t("a11y.userMenu")}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground truncate flex-1">{user?.email}</p>
            <LanguageSwitcher />
            <NotificationBell />
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" aria-hidden="true" /> {t("common.signOut")}
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col">
        <header className="lg:hidden flex items-center justify-between border-b border-border bg-card px-4 h-14">
          <Link to="/" className="font-display text-lg font-bold text-primary">{t("common.appName")}</Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? t("a11y.closeMenu") : t("a11y.openMenu")}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </header>

        {/* Mobile nav overlay */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-background/95 backdrop-blur-sm pt-14" role="dialog" aria-label={t("a11y.mobileMenu")}>
            <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-3.5rem)]" aria-label={t("a11y.mainNavigation")}>
              {nav.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium ${
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <item.icon className="w-5 h-5" aria-hidden="true" />
                    {t(item.labelKey)}
                  </Link>
                );
              })}
              <Button variant="ghost" className="w-full justify-start gap-3 mt-4" onClick={handleSignOut}>
                <LogOut className="w-5 h-5" aria-hidden="true" /> {t("common.signOut")}
              </Button>
            </nav>
          </div>
        )}

        <main id="dashboard-content" className="flex-1 p-4 lg:p-8 overflow-auto" role="main">
          {children}
        </main>
        <OnboardingTour />
      </div>
    </div>
  );
}
