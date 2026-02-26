import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell,
  LineChart, Line, AreaChart, Area, ResponsiveContainer, Legend,
} from "recharts";
import {
  PoundSterling, TrendingUp, TrendingDown, Building2, Users, Wrench,
  Download, FileText, AlertTriangle, CheckCircle, Calendar, Percent,
} from "lucide-react";
import { format, parseISO, startOfMonth, subMonths, isWithinInterval } from "date-fns";
import { useState, useMemo } from "react";

const COLORS = [
  "hsl(174, 62%, 28%)", "hsl(36, 90%, 55%)", "hsl(152, 60%, 38%)",
  "hsl(0, 72%, 51%)", "hsl(200, 10%, 46%)", "hsl(38, 92%, 50%)",
  "hsl(260, 50%, 55%)", "hsl(190, 70%, 42%)",
];

type Period = "3m" | "6m" | "12m" | "all";

export default function LandlordAccounting() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("12m");

  const { data: tenancies } = useQuery({
    queryKey: ["ll-acc-tenancies", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("tenancies").select("*").eq("landlord_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: listings } = useQuery({
    queryKey: ["ll-acc-listings", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*").eq("owner_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: allPayments } = useQuery({
    queryKey: ["ll-acc-payments", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("rent_payments").select("*, tenancies!inner(landlord_id, listing_id)");
      return (data || []).filter((p: any) => p.tenancies?.landlord_id === user?.id);
    },
    enabled: !!user,
  });

  const { data: maintenanceReqs } = useQuery({
    queryKey: ["ll-acc-maintenance", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("maintenance_requests").select("*, tenancies!inner(landlord_id)");
      return (data || []).filter((m: any) => m.tenancies?.landlord_id === user?.id);
    },
    enabled: !!user,
  });

  // Filter by period
  const cutoffDate = useMemo(() => {
    if (period === "all") return null;
    const months = period === "3m" ? 3 : period === "6m" ? 6 : 12;
    return subMonths(new Date(), months);
  }, [period]);

  const payments = useMemo(() => {
    if (!allPayments) return [];
    if (!cutoffDate) return allPayments;
    return allPayments.filter(p => new Date(p.due_date) >= cutoffDate);
  }, [allPayments, cutoffDate]);

  // KPIs
  const totalIncome = payments.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.paid_amount || 0), 0);
  const totalOutstanding = payments.filter((p: any) => p.status !== "paid").reduce((s: number, p: any) => s + Number(p.amount) - Number(p.paid_amount || 0), 0);
  const totalLateFees = payments.reduce((s: number, p: any) => s + Number((p as any).late_fee || 0), 0);
  const overdueAmount = payments.filter((p: any) => p.status === "overdue").reduce((s: number, p: any) => s + Number(p.amount) - Number(p.paid_amount || 0) + Number((p as any).late_fee || 0), 0);

  const activeTenancies = tenancies?.filter(t => t.status === "active").length || 0;
  const totalUnits = listings?.length || 0;
  const occupancyRate = totalUnits > 0 ? Math.round((activeTenancies / totalUnits) * 100) : 0;
  const annualProjectedIncome = tenancies?.filter(t => t.status === "active").reduce((s, t) => s + Number(t.rent_pcm) * 12, 0) || 0;

  // Monthly income vs outstanding chart
  const monthlyData = useMemo(() => {
    const months: Record<string, { income: number; outstanding: number; lateFees: number }> = {};
    const monthCount = period === "3m" ? 3 : period === "6m" ? 6 : period === "12m" ? 12 : 24;
    const now = new Date();
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = format(d, "MMM yy");
      months[key] = { income: 0, outstanding: 0, lateFees: 0 };
    }
    payments.forEach((p: any) => {
      const d = new Date(p.due_date);
      const key = format(d, "MMM yy");
      if (key in months) {
        if (p.status === "paid") months[key].income += Number(p.paid_amount || 0);
        else months[key].outstanding += Number(p.amount) - Number(p.paid_amount || 0);
        months[key].lateFees += Number((p as any).late_fee || 0);
      }
    });
    return Object.entries(months).map(([month, v]) => ({ month, ...v }));
  }, [payments, period]);

  // Income by property
  const incomeByProperty = useMemo(() => {
    const byListing: Record<string, { name: string; income: number; outstanding: number }> = {};
    payments.forEach((p: any) => {
      const lid = p.tenancies?.listing_id;
      if (!lid) return;
      const listing = listings?.find(l => l.id === lid);
      if (!byListing[lid]) byListing[lid] = { name: listing?.title || "Unknown", income: 0, outstanding: 0 };
      if (p.status === "paid") byListing[lid].income += Number(p.paid_amount || 0);
      else byListing[lid].outstanding += Number(p.amount) - Number(p.paid_amount || 0);
    });
    return Object.values(byListing);
  }, [payments, listings]);

  // Payment status breakdown
  const statusBreakdown = useMemo(() => {
    const counts = { paid: 0, upcoming: 0, overdue: 0, partial: 0 };
    payments.forEach((p: any) => {
      if (p.status in counts) counts[p.status as keyof typeof counts]++;
    });
    return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1), value,
    }));
  }, [payments]);

  // Occupancy over time (simplified)
  const occupancyData = useMemo(() => {
    if (!tenancies || !listings) return [];
    const now = new Date();
    const monthCount = period === "3m" ? 3 : period === "6m" ? 6 : period === "12m" ? 12 : 24;
    return Array.from({ length: monthCount }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (monthCount - 1 - i), 1);
      const active = tenancies.filter(t => {
        const start = new Date(t.start_date);
        const end = new Date(t.end_date);
        return start <= d && end >= d;
      }).length;
      return { month: format(d, "MMM yy"), rate: totalUnits > 0 ? Math.round((active / totalUnits) * 100) : 0 };
    });
  }, [tenancies, listings, totalUnits, period]);

  // Tax summary (simple UK-style)
  const taxYear = useMemo(() => {
    const allPaid = allPayments?.filter((p: any) => p.status === "paid") || [];
    const grossIncome = allPaid.reduce((s: number, p: any) => s + Number(p.paid_amount || 0), 0);
    const lateFees = allPaid.reduce((s: number, p: any) => s + Number((p as any).late_fee || 0), 0);
    return {
      grossRentalIncome: grossIncome,
      lateFeeIncome: lateFees,
      totalIncome: grossIncome + lateFees,
      // Placeholder allowance
      personalAllowance: 1000,
      taxableIncome: Math.max(0, grossIncome + lateFees - 1000),
    };
  }, [allPayments]);

  const exportCSV = () => {
    const headers = "Date,Property,Amount,Status,Late Fee,Payment Method,Reference\n";
    const rows = (allPayments || []).map((p: any) => {
      const listing = listings?.find(l => l.id === p.tenancies?.listing_id);
      return `${p.due_date},${(listing?.title || "").replace(/,/g, "")},${p.amount},${p.status},${(p as any).late_fee || 0},${p.payment_method || ""},${p.reference || ""}`;
    }).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartConfig = {
    income: { label: "Income (£)", color: "hsl(152, 60%, 38%)" },
    outstanding: { label: "Outstanding (£)", color: "hsl(0, 72%, 51%)" },
    lateFees: { label: "Late Fees (£)", color: "hsl(38, 92%, 50%)" },
    rate: { label: "Occupancy %", color: "hsl(174, 62%, 28%)" },
  };

  return (
    <div className="max-w-6xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">Accounting & Reports</h1>
          <p className="text-muted-foreground">Financial overview across all properties</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-0.5">
            {(["3m", "6m", "12m", "all"] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                {p === "all" ? "All" : p.toUpperCase()}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-3 h-3 mr-1" /> Export CSV
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {[
          { label: "Total Income", value: `£${totalIncome.toLocaleString()}`, icon: TrendingUp, color: "text-success" },
          { label: "Outstanding", value: `£${totalOutstanding.toLocaleString()}`, icon: TrendingDown, color: totalOutstanding > 0 ? "text-destructive" : "text-success" },
          { label: "Late Fees", value: `£${totalLateFees.toLocaleString()}`, icon: AlertTriangle, color: "text-warning" },
          { label: "Occupancy", value: `${occupancyRate}%`, icon: Building2, color: "text-primary" },
          { label: "Projected Annual", value: `£${annualProjectedIncome.toLocaleString()}`, icon: Calendar, color: "text-primary" },
          { label: "Overdue", value: `£${overdueAmount.toLocaleString()}`, icon: PoundSterling, color: overdueAmount > 0 ? "text-destructive" : "text-success" },
        ].map(stat => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
            <p className={`font-display text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="income" className="space-y-4">
        <TabsList>
          <TabsTrigger value="income">Income & Expenses</TabsTrigger>
          <TabsTrigger value="properties">By Property</TabsTrigger>
          <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
          <TabsTrigger value="tax">Tax Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="income" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Monthly income chart */}
            <Card className="p-5 lg:col-span-2">
              <h3 className="font-display text-sm font-semibold mb-4">Monthly Income vs Outstanding</h3>
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(200,10%,46%)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(200,10%,46%)" }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="income" fill="hsl(152,60%,38%)" radius={[4,4,0,0]} />
                  <Bar dataKey="outstanding" fill="hsl(0,72%,51%)" radius={[4,4,0,0]} opacity={0.7} />
                  <Bar dataKey="lateFees" fill="hsl(38,92%,50%)" radius={[4,4,0,0]} opacity={0.7} />
                </BarChart>
              </ChartContainer>
            </Card>

            {/* Payment status pie */}
            <Card className="p-5">
              <h3 className="font-display text-sm font-semibold mb-4">Payment Status</h3>
              {statusBreakdown.length > 0 ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                        {statusBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">No payment data</p>
              )}
            </Card>
          </div>

          {/* Recent transactions */}
          <Card className="p-5">
            <h3 className="font-display text-sm font-semibold mb-4">Recent Transactions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Property</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Amount</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Late Fee</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.slice(0, 20).map((p: any) => {
                    const listing = listings?.find(l => l.id === p.tenancies?.listing_id);
                    return (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="py-2">{format(parseISO(p.due_date), "d MMM yyyy")}</td>
                        <td className="py-2">{listing?.title || "—"}</td>
                        <td className="py-2 text-right font-medium">£{Number(p.amount).toLocaleString()}</td>
                        <td className="py-2 text-right">{Number((p as any).late_fee || 0) > 0 ? `£${Number((p as any).late_fee).toLocaleString()}` : "—"}</td>
                        <td className="py-2">
                          <Badge variant={p.status === "paid" ? "default" : p.status === "overdue" ? "destructive" : "secondary"} className="text-xs">
                            {p.status}
                          </Badge>
                        </td>
                        <td className="py-2 text-muted-foreground">{p.payment_method || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="properties" className="space-y-6">
          <Card className="p-5">
            <h3 className="font-display text-sm font-semibold mb-4">Income by Property</h3>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={incomeByProperty} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fill: "hsl(200,10%,46%)" }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fill: "hsl(200,10%,46%)", fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="income" fill="hsl(152,60%,38%)" radius={[0,4,4,0]} />
                <Bar dataKey="outstanding" fill="hsl(0,72%,51%)" radius={[0,4,4,0]} opacity={0.6} />
              </BarChart>
            </ChartContainer>
          </Card>

          {/* Per-property cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {incomeByProperty.map(prop => (
              <Card key={prop.name} className="p-4">
                <h4 className="font-medium text-sm mb-2 truncate">{prop.name}</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Income</span>
                  <span className="text-success font-medium">£{prop.income.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Outstanding</span>
                  <span className={prop.outstanding > 0 ? "text-destructive font-medium" : "text-muted-foreground"}>£{prop.outstanding.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-border mt-2 pt-2">
                  <span className="text-muted-foreground">Yield</span>
                  <span className="font-medium">{prop.income > 0 ? `£${(prop.income / 12).toFixed(0)}/mo avg` : "—"}</span>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="occupancy" className="space-y-6">
          <Card className="p-5">
            <h3 className="font-display text-sm font-semibold mb-4">Occupancy Rate Over Time</h3>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <AreaChart data={occupancyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fill: "hsl(200,10%,46%)", fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "hsl(200,10%,46%)" }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="rate" fill="hsl(174,62%,28%)" fillOpacity={0.15} stroke="hsl(174,62%,28%)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </Card>

          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Units</p>
              <p className="font-display text-2xl font-bold">{totalUnits}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Currently Occupied</p>
              <p className="font-display text-2xl font-bold text-success">{activeTenancies}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Vacant</p>
              <p className="font-display text-2xl font-bold text-warning">{totalUnits - activeTenancies}</p>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tax" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="font-display text-lg font-semibold">Tax Year Summary (All Time)</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <span className="text-sm text-muted-foreground">Gross Rental Income</span>
                  <span className="font-medium">£{taxYear.grossRentalIncome.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <span className="text-sm text-muted-foreground">Late Fee Income</span>
                  <span className="font-medium">£{taxYear.lateFeeIncome.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <span className="text-sm font-medium">Total Income</span>
                  <span className="font-bold text-lg">£{taxYear.totalIncome.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <span className="text-sm text-muted-foreground">Property Income Allowance</span>
                  <span className="font-medium text-success">-£{taxYear.personalAllowance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-semibold">Taxable Income</span>
                  <span className="font-bold text-lg text-primary">£{taxYear.taxableIncome.toLocaleString()}</span>
                </div>
              </div>
              <div className="bg-muted/50 rounded-xl p-5">
                <p className="text-sm font-medium mb-3">Notes</p>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li>• This is a simplified summary. Consult your accountant for accurate tax returns.</li>
                  <li>• The £1,000 property income allowance may apply if you have no deductible expenses.</li>
                  <li>• Maintenance costs, mortgage interest, and other allowable expenses are not tracked here yet.</li>
                  <li>• Export CSV data for your accountant using the button above.</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
