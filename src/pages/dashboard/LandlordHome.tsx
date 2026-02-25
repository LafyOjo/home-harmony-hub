import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, List, Plus, ArrowRight, Users, Wrench, ShieldCheck, TrendingUp, PoundSterling, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, ResponsiveContainer } from "recharts";

const CHART_COLORS = [
  "hsl(174, 62%, 28%)",   // primary
  "hsl(36, 90%, 55%)",    // accent
  "hsl(152, 60%, 38%)",   // success
  "hsl(0, 72%, 51%)",     // destructive
  "hsl(200, 10%, 46%)",   // muted
  "hsl(38, 92%, 50%)",    // warning
];

export default function LandlordHome() {
  const { user } = useAuth();

  const { data: listings } = useQuery({
    queryKey: ["landlord-listings", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*").eq("owner_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: tenancies } = useQuery({
    queryKey: ["landlord-tenancies", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("tenancies").select("*").eq("landlord_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: payments } = useQuery({
    queryKey: ["landlord-payments", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("rent_payments").select("*, tenancies!inner(landlord_id)");
      return (data || []).filter((p: any) => p.tenancies?.landlord_id === user?.id);
    },
    enabled: !!user,
  });

  const { data: maintenanceReqs } = useQuery({
    queryKey: ["landlord-maintenance", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("maintenance_requests").select("*, tenancies!inner(landlord_id)");
      return (data || []).filter((m: any) => m.tenancies?.landlord_id === user?.id);
    },
    enabled: !!user,
  });

  const { data: applications } = useQuery({
    queryKey: ["landlord-applications", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("applications").select("*, listings!inner(owner_id)");
      return (data || []).filter((a: any) => a.listings?.owner_id === user?.id);
    },
    enabled: !!user,
  });

  // Stats
  const activeListings = listings?.filter(l => l.is_active).length || 0;
  const activeTenancies = tenancies?.filter(t => t.status === "active").length || 0;
  const totalApplicants = applications?.length || 0;
  const totalCollected = payments?.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.paid_amount || 0), 0) || 0;
  const overduePayments = payments?.filter((p: any) => p.status === "overdue").length || 0;
  const openMaintenance = maintenanceReqs?.filter((m: any) => m.status !== "completed").length || 0;

  // Chart data: monthly rent collected
  const monthlyRent = (() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      months[key] = 0;
    }
    payments?.filter((p: any) => p.status === "paid" && p.paid_date).forEach((p: any) => {
      const d = new Date(p.paid_date);
      const key = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      if (key in months) months[key] += Number(p.paid_amount || 0);
    });
    return Object.entries(months).map(([month, amount]) => ({ month, amount }));
  })();

  // Pipeline chart
  const pipelineData = (() => {
    const statuses = ["submitted", "reviewed", "shortlisted", "offered", "accepted", "rejected"];
    return statuses.map(s => ({
      status: s.charAt(0).toUpperCase() + s.slice(1),
      count: applications?.filter((a: any) => a.status === s).length || 0,
    }));
  })();

  // Maintenance by status
  const maintenanceData = (() => {
    const statuses = ["reported", "in_progress", "scheduled", "completed"];
    return statuses.map(s => ({
      name: s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()),
      value: maintenanceReqs?.filter((m: any) => m.status === s).length || 0,
    })).filter(d => d.value > 0);
  })();

  const rentChartConfig = { amount: { label: "Collected (£)", color: "hsl(174, 62%, 28%)" } };
  const pipelineChartConfig = { count: { label: "Applicants", color: "hsl(36, 90%, 55%)" } };

  return (
    <div className="max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold mb-1">Dashboard</h1>
        <p className="text-muted-foreground mb-8">{user?.email}</p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {[
          { label: "Active Listings", value: activeListings, color: "text-primary" },
          { label: "Applicants", value: totalApplicants, color: "text-accent" },
          { label: "Active Tenancies", value: activeTenancies, color: "text-success" },
          { label: "Rent Collected", value: `£${totalCollected.toLocaleString()}`, color: "text-primary" },
          { label: "Overdue Payments", value: overduePayments, color: overduePayments > 0 ? "text-destructive" : "text-muted-foreground" },
          { label: "Open Repairs", value: openMaintenance, color: openMaintenance > 0 ? "text-warning" : "text-muted-foreground" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={`font-display text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Rent Collection */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-display text-sm font-semibold">Rent Collection (6 months)</h3>
          </div>
          <ChartContainer config={rentChartConfig} className="h-[220px] w-full">
            <BarChart data={monthlyRent}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(200, 10%, 46%)" }} />
              <YAxis tick={{ fill: "hsl(200, 10%, 46%)" }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="amount" fill="hsl(174, 62%, 28%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        {/* Pipeline */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <List className="w-4 h-4 text-accent" />
            <h3 className="font-display text-sm font-semibold">Application Pipeline</h3>
          </div>
          <ChartContainer config={pipelineChartConfig} className="h-[220px] w-full">
            <BarChart data={pipelineData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fill: "hsl(200, 10%, 46%)" }} />
              <YAxis type="category" dataKey="status" width={80} tick={{ fill: "hsl(200, 10%, 46%)", fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="hsl(36, 90%, 55%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>

      {/* Maintenance Pie + Alerts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-display text-sm font-semibold">Maintenance Overview</h3>
          </div>
          {maintenanceData.length > 0 ? (
            <div className="h-[200px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={maintenanceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {maintenanceData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No maintenance requests yet</p>
          )}
        </div>

        {/* Alerts */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h3 className="font-display text-sm font-semibold">Alerts</h3>
          </div>
          <div className="space-y-3">
            {overduePayments > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10">
                <PoundSterling className="w-4 h-4 text-destructive" />
                <span className="text-sm">{overduePayments} overdue rent payment{overduePayments > 1 ? "s" : ""}</span>
              </div>
            )}
            {openMaintenance > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10">
                <Wrench className="w-4 h-4 text-warning" />
                <span className="text-sm">{openMaintenance} open maintenance request{openMaintenance > 1 ? "s" : ""}</span>
              </div>
            )}
            {overduePayments === 0 && openMaintenance === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No active alerts — all clear ✓</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="font-display text-lg font-semibold mb-4">Quick Actions</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { to: "/dashboard/listings/new", icon: Plus, label: "Add Property", desc: "Register a new property listing", color: "bg-primary/10 text-primary" },
          { to: "/dashboard/pipeline", icon: List, label: "View Pipeline", desc: "Review applicants", color: "bg-accent/20 text-accent" },
          { to: "/dashboard/tenancies", icon: Users, label: "Manage Tenancies", desc: "Payments, utilities & more", color: "bg-success/10 text-success" },
          { to: "/dashboard/workers", icon: Wrench, label: "Workers & Fixers", desc: "Manage maintenance team", color: "bg-muted text-muted-foreground" },
          { to: "/dashboard/landlord-verification", icon: ShieldCheck, label: "Verification", desc: "Verify ID & properties", color: "bg-primary/10 text-primary" },
          { to: "/dashboard/listings", icon: Building2, label: "My Listings", desc: "View all properties", color: "bg-accent/10 text-accent" },
        ].map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors group"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color}`}>
              <action.icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{action.label}</p>
              <p className="text-xs text-muted-foreground">{action.desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
