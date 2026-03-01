import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Building2, FileText, Home, PoundSterling, ShieldCheck,
  Wrench, MessageSquare, TrendingUp, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

interface Stats {
  totalUsers: number;
  usersByRole: { role: string; count: number }[];
  totalListings: number;
  activeListings: number;
  totalApplications: number;
  applicationsByStatus: { status: string; count: number }[];
  totalTenancies: number;
  activeTenancies: number;
  totalPayments: number;
  totalRevenue: number;
  paidPayments: number;
  overduePayments: number;
  pendingVerifications: number;
  totalMaintenanceRequests: number;
  openMaintenanceRequests: number;
  totalComplaints: number;
  openComplaints: number;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 55%)",
  "hsl(340, 65%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(45, 80%, 55%)",
  "hsl(280, 55%, 55%)",
  "hsl(20, 70%, 55%)",
];

export default function AdminAnalytics() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [
          rolesRes,
          listingsRes,
          applicationsRes,
          tenanciesRes,
          paymentsRes,
          verificationsRes,
          maintenanceRes,
          complaintsRes,
        ] = await Promise.all([
          supabase.from("user_roles").select("role"),
          supabase.from("listings").select("id, is_active"),
          supabase.from("applications").select("id, status"),
          supabase.from("tenancies").select("id, status"),
          supabase.from("rent_payments").select("id, status, amount, paid_amount"),
          supabase.from("verification_requests").select("id, status"),
          supabase.from("maintenance_requests").select("id, status"),
          supabase.from("complaints").select("id, status"),
        ]);

        const roles = rolesRes.data ?? [];
        const roleCount: Record<string, number> = {};
        roles.forEach((r) => {
          roleCount[r.role] = (roleCount[r.role] || 0) + 1;
        });

        const listings = listingsRes.data ?? [];
        const applications = applicationsRes.data ?? [];
        const statusCount: Record<string, number> = {};
        applications.forEach((a) => {
          const s = a.status ?? "draft";
          statusCount[s] = (statusCount[s] || 0) + 1;
        });

        const tenancies = tenanciesRes.data ?? [];
        const payments = paymentsRes.data ?? [];
        const verifications = verificationsRes.data ?? [];
        const maintenance = maintenanceRes.data ?? [];
        const complaints = complaintsRes.data ?? [];

        setStats({
          totalUsers: roles.length,
          usersByRole: Object.entries(roleCount).map(([role, count]) => ({ role, count })),
          totalListings: listings.length,
          activeListings: listings.filter((l) => l.is_active).length,
          totalApplications: applications.length,
          applicationsByStatus: Object.entries(statusCount).map(([status, count]) => ({ status, count })),
          totalTenancies: tenancies.length,
          activeTenancies: tenancies.filter((t) => t.status === "active").length,
          totalPayments: payments.length,
          totalRevenue: payments
            .filter((p) => p.status === "paid")
            .reduce((sum, p) => sum + Number(p.paid_amount ?? p.amount ?? 0), 0),
          paidPayments: payments.filter((p) => p.status === "paid").length,
          overduePayments: payments.filter((p) => p.status === "overdue").length,
          pendingVerifications: verifications.filter((v) => v.status === "pending").length,
          totalMaintenanceRequests: maintenance.length,
          openMaintenanceRequests: maintenance.filter((m) => !["completed", "cancelled"].includes(m.status)).length,
          totalComplaints: complaints.length,
          openComplaints: complaints.filter((c) => c.status === "open").length,
        });
      } catch (err) {
        console.error("Failed to load admin stats", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Admin Analytics</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-16" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return <p className="text-muted-foreground">Unable to load analytics.</p>;

  const kpis = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-600" },
    { label: "Active Listings", value: `${stats.activeListings} / ${stats.totalListings}`, icon: Building2, color: "text-emerald-600" },
    { label: "Applications", value: stats.totalApplications, icon: FileText, color: "text-violet-600" },
    { label: "Active Tenancies", value: `${stats.activeTenancies} / ${stats.totalTenancies}`, icon: Home, color: "text-amber-600" },
    { label: "Revenue Collected", value: `£${stats.totalRevenue.toLocaleString()}`, icon: PoundSterling, color: "text-green-600" },
    { label: "Overdue Payments", value: stats.overduePayments, icon: TrendingUp, color: "text-red-600" },
    { label: "Pending Verifications", value: stats.pendingVerifications, icon: ShieldCheck, color: "text-orange-600" },
    { label: "Open Maintenance", value: stats.openMaintenanceRequests, icon: Wrench, color: "text-cyan-600" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Analytics</h1>
        <p className="text-muted-foreground mt-1">Platform-wide overview and key metrics</p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Users by role */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Users by Role</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.usersByRole}
                  dataKey="count"
                  nameKey="role"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ role, count }) => `${role} (${count})`}
                >
                  {stats.usersByRole.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Applications by status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Applications by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.applicationsByStatus}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Complaints</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.openComplaints} <span className="text-sm font-normal text-muted-foreground">open / {stats.totalComplaints} total</span></p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.paidPayments} <span className="text-sm font-normal text-muted-foreground">paid / {stats.totalPayments} total</span></p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Wrench className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.openMaintenanceRequests} <span className="text-sm font-normal text-muted-foreground">open / {stats.totalMaintenanceRequests} total</span></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
