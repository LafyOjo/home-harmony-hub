import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { User, FileText, Send, Inbox, ArrowRight, PoundSterling, Zap, Wrench, ShieldCheck, TrendingDown, AlertTriangle, CalendarCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const CHART_COLORS = [
  "hsl(174, 62%, 28%)",
  "hsl(36, 90%, 55%)",
  "hsl(152, 60%, 38%)",
  "hsl(0, 72%, 51%)",
  "hsl(200, 10%, 46%)",
];

const quickActions = [
  { to: "/dashboard/tenancy", icon: PoundSterling, label: "My Tenancy", desc: "Rent, payments & balance" },
  { to: "/dashboard/utilities", icon: Zap, label: "Utilities", desc: "Bills & utility payments" },
  { to: "/dashboard/maintenance", icon: Wrench, label: "Maintenance", desc: "Report & track repairs" },
  { to: "/dashboard/verification", icon: ShieldCheck, label: "Verification", desc: "Verify your identity" },
  { to: "/dashboard/profile", icon: User, label: "Complete Profile", desc: "Fill in your details" },
  { to: "/dashboard/documents", icon: FileText, label: "Upload Documents", desc: "ID, payslips & more" },
  { to: "/dashboard/references", icon: Send, label: "Request References", desc: "Employer & landlord" },
  { to: "/dashboard/applications", icon: Inbox, label: "My Applications", desc: "Track your progress" },
];

export default function TenantHome() {
  const { user } = useAuth();

  const { data: tenancies } = useQuery({
    queryKey: ["tenant-tenancies", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("tenancies").select("*").eq("tenant_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const activeTenancy = tenancies?.find(t => t.status === "active");

  const { data: payments } = useQuery({
    queryKey: ["tenant-payments", activeTenancy?.id],
    queryFn: async () => {
      const { data } = await supabase.from("rent_payments").select("*").eq("tenancy_id", activeTenancy!.id).order("due_date", { ascending: true });
      return data || [];
    },
    enabled: !!activeTenancy,
  });

  const { data: utilities } = useQuery({
    queryKey: ["tenant-utilities", activeTenancy?.id],
    queryFn: async () => {
      const { data } = await supabase.from("utilities").select("*").eq("tenancy_id", activeTenancy!.id);
      return data || [];
    },
    enabled: !!activeTenancy,
  });

  const { data: maintenanceReqs } = useQuery({
    queryKey: ["tenant-maintenance", activeTenancy?.id],
    queryFn: async () => {
      const { data } = await supabase.from("maintenance_requests").select("*").eq("tenancy_id", activeTenancy!.id);
      return data || [];
    },
    enabled: !!activeTenancy,
  });

  // Stats
  const totalRent = payments?.reduce((s, p) => s + Number(p.amount), 0) || 0;
  const totalPaid = payments?.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.paid_amount || 0), 0) || 0;
  const outstanding = totalRent - totalPaid;
  const paymentsLeft = payments?.filter(p => p.status !== "paid").length || 0;
  const overdueCount = payments?.filter(p => p.status === "overdue").length || 0;
  const utilityTotal = utilities?.reduce((s, u) => s + Number(u.amount || 0), 0) || 0;
  const openRepairs = maintenanceReqs?.filter(m => m.status !== "completed").length || 0;

  // Payment history chart (last 6 months)
  const paymentChart = (() => {
    const months: Record<string, { paid: number; due: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      months[key] = { paid: 0, due: 0 };
    }
    payments?.forEach(p => {
      const d = new Date(p.due_date);
      const key = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      if (key in months) {
        months[key].due += Number(p.amount);
        if (p.status === "paid") months[key].paid += Number(p.paid_amount || 0);
      }
    });
    return Object.entries(months).map(([month, v]) => ({ month, ...v }));
  })();

  // Utilities breakdown
  const utilityBreakdown = (() => {
    const byType: Record<string, number> = {};
    utilities?.forEach(u => {
      const t = u.utility_type;
      byType[t] = (byType[t] || 0) + Number(u.amount || 0);
    });
    return Object.entries(byType).map(([name, value]) => ({ name: name.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()), value }));
  })();

  const rentChartConfig = {
    paid: { label: "Paid (£)", color: "hsl(152, 60%, 38%)" },
    due: { label: "Due (£)", color: "hsl(200, 10%, 46%)" },
  };

  return (
    <div className="max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold mb-1">Welcome back</h1>
        <p className="text-muted-foreground mb-8">{user?.email}</p>
      </motion.div>

      {/* KPI Cards */}
      {activeTenancy && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Outstanding", value: `£${outstanding.toLocaleString()}`, color: outstanding > 0 ? "text-destructive" : "text-success" },
            { label: "Payments Left", value: paymentsLeft, color: "text-primary" },
            { label: "Utility Bills", value: `£${utilityTotal.toLocaleString()}`, color: "text-accent" },
            { label: "Open Repairs", value: openRepairs, color: openRepairs > 0 ? "text-warning" : "text-muted-foreground" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={`font-display text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      {activeTenancy && (
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Rent Payments */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-4 h-4 text-primary" />
              <h3 className="font-display text-sm font-semibold">Rent Payments (6 months)</h3>
            </div>
            <ChartContainer config={rentChartConfig} className="h-[220px] w-full">
              <BarChart data={paymentChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fill: "hsl(200, 10%, 46%)" }} />
                <YAxis tick={{ fill: "hsl(200, 10%, 46%)" }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="due" fill="hsl(200, 10%, 46%)" radius={[4, 4, 0, 0]} opacity={0.3} />
                <Bar dataKey="paid" fill="hsl(152, 60%, 38%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>

          {/* Utilities Pie */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-accent" />
              <h3 className="font-display text-sm font-semibold">Utilities Breakdown</h3>
            </div>
            {utilityBreakdown.length > 0 ? (
              <div className="h-[220px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={utilityBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: £${value}`}>
                      {utilityBreakdown.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No utility data yet</p>
            )}
          </div>
        </div>
      )}

      {/* Alerts */}
      {activeTenancy && (overdueCount > 0 || openRepairs > 0) && (
        <div className="bg-card border border-border rounded-xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h3 className="font-display text-sm font-semibold">Alerts</h3>
          </div>
          <div className="space-y-2">
            {overdueCount > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10">
                <PoundSterling className="w-4 h-4 text-destructive" />
                <span className="text-sm">{overdueCount} overdue rent payment{overdueCount > 1 ? "s" : ""} — please make payment ASAP</span>
              </div>
            )}
            {openRepairs > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10">
                <Wrench className="w-4 h-4 text-warning" />
                <span className="text-sm">{openRepairs} maintenance request{openRepairs > 1 ? "s" : ""} in progress</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile bar */}
      {!activeTenancy && (
        <div className="bg-card border border-border rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Profile Completeness</span>
            <span className="text-sm text-muted-foreground">25%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: "25%" }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Complete your profile to generate your Tenant Pack</p>
        </div>
      )}

      <h2 className="font-display text-lg font-semibold mb-4">Quick Actions</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {quickActions.map((action, i) => (
          <motion.div key={action.to} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Link
              to={action.to}
              className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <action.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
