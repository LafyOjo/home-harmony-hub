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
  AreaChart, Area, ResponsiveContainer, Legend,
} from "recharts";
import {
  PoundSterling, TrendingDown, CheckCircle, AlertTriangle, Calendar,
  Receipt, CreditCard, Download, Home, FileText, Bell,
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";

const COLORS = [
  "hsl(174, 62%, 28%)", "hsl(36, 90%, 55%)", "hsl(152, 60%, 38%)",
  "hsl(0, 72%, 51%)", "hsl(200, 10%, 46%)",
];

const fmtCurrency = (v: number) => `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function TenantAccounting() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payingId, setPayingId] = useState<string | null>(null);

  const { data: tenancy } = useQuery({
    queryKey: ["ta-tenancy", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("tenancies").select("*").eq("tenant_id", user!.id).eq("status", "active").maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: payments } = useQuery({
    queryKey: ["ta-payments", tenancy?.id],
    queryFn: async () => {
      const { data } = await supabase.from("rent_payments").select("*").eq("tenancy_id", tenancy!.id).order("due_date", { ascending: true });
      return data || [];
    },
    enabled: !!tenancy,
  });

  const { data: utilities } = useQuery({
    queryKey: ["ta-utilities", tenancy?.id],
    queryFn: async () => {
      const { data } = await supabase.from("utilities").select("*").eq("tenancy_id", tenancy!.id);
      return data || [];
    },
    enabled: !!tenancy,
  });

  const { data: listing } = useQuery({
    queryKey: ["ta-listing", tenancy?.listing_id],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("title, address").eq("id", tenancy!.listing_id).single();
      return data;
    },
    enabled: !!tenancy,
  });

  // Stripe pay handler
  const handlePayNow = async (paymentId: string) => {
    setPayingId(paymentId);
    try {
      const { data, error } = await supabase.functions.invoke("create-rent-checkout", {
        body: { paymentId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: "Payment failed", description: err.message || "Unable to create checkout session", variant: "destructive" });
    } finally {
      setPayingId(null);
    }
  };

  // KPIs
  const totalPaid = payments?.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.paid_amount || 0), 0) || 0;
  const totalDue = payments?.reduce((s, p) => s + Number(p.amount), 0) || 0;
  const outstanding = totalDue - totalPaid;
  const overdueCount = payments?.filter(p => p.status === "overdue").length || 0;
  const totalLateFees = payments?.reduce((s, p) => s + Number(p.late_fee || 0), 0) || 0;
  const nextPayment = payments?.find(p => p.status === "upcoming" || p.status === "overdue");
  const totalSpent = totalPaid + (utilities?.reduce((s, u) => s + Number(u.amount || 0), 0) || 0);

  // Upcoming / overdue reminders
  const reminders = useMemo(() => {
    if (!payments) return [];
    return payments
      .filter(p => p.status === "upcoming" || p.status === "overdue")
      .slice(0, 5)
      .map(p => {
        const days = differenceInDays(parseISO(p.due_date), new Date());
        return { ...p, daysUntil: days };
      });
  }, [payments]);

  // Monthly spending chart
  const monthlySpending = useMemo(() => {
    const months: Record<string, { rent: number; utilities: number }> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months[format(d, "MMM yy")] = { rent: 0, utilities: 0 };
    }
    payments?.filter(p => p.status === "paid").forEach(p => {
      const key = format(new Date(p.due_date), "MMM yy");
      if (key in months) months[key].rent += Number(p.paid_amount || 0);
    });
    utilities?.forEach(u => {
      if (!u.due_date) return;
      const key = format(new Date(u.due_date), "MMM yy");
      if (key in months) months[key].utilities += Number(u.amount || 0);
    });
    return Object.entries(months).map(([month, v]) => ({ month, ...v }));
  }, [payments, utilities]);

  // Spending breakdown (pie)
  const spendingBreakdown = useMemo(() => {
    const rent = totalPaid;
    const utilityTotal = utilities?.reduce((s, u) => s + Number(u.amount || 0), 0) || 0;
    const fees = totalLateFees;
    return [
      { name: "Rent", value: rent },
      { name: "Utilities", value: utilityTotal },
      ...(fees > 0 ? [{ name: "Late Fees", value: fees }] : []),
    ].filter(d => d.value > 0);
  }, [totalPaid, utilities, totalLateFees]);

  // Cumulative payments
  const cumulativeData = useMemo(() => {
    let cum = 0;
    return (payments || []).map(p => {
      if (p.status === "paid") cum += Number(p.paid_amount || 0);
      return { date: format(parseISO(p.due_date), "MMM yy"), cumulative: cum, amount: Number(p.amount) };
    });
  }, [payments]);

  const chartConfig = {
    rent: { label: "Rent (£)", color: "hsl(174, 62%, 28%)" },
    utilities: { label: "Utilities (£)", color: "hsl(36, 90%, 55%)" },
    cumulative: { label: "Total Paid (£)", color: "hsl(152, 60%, 38%)" },
  };

  const exportCSV = () => {
    const headers = "Date,Amount,Late Fee,Status,Paid On,Method\n";
    const rows = (payments || []).map(p =>
      `${p.due_date},${p.amount},${p.late_fee || 0},${p.status},${p.paid_date || ""},${p.payment_method || ""}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `payment-history-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    // Use browser print as lightweight PDF export
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const rows = (payments || []).map(p =>
      `<tr><td>${p.due_date}</td><td style="text-align:right">${fmtCurrency(Number(p.amount))}</td><td style="text-align:right">${Number(p.late_fee || 0) > 0 ? fmtCurrency(Number(p.late_fee)) : "—"}</td><td>${p.status}</td><td>${p.paid_date || "—"}</td><td>${p.payment_method || "—"}</td></tr>`
    ).join("");
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Payment Report</title><style>body{font-family:system-ui;padding:2rem}table{width:100%;border-collapse:collapse;margin-top:1rem}th,td{padding:8px 12px;border-bottom:1px solid #ddd;text-align:left;font-size:13px}th{background:#f5f5f5;font-weight:600}h1{font-size:1.5rem}h2{font-size:1rem;color:#666;margin-top:0.25rem}.stats{display:flex;gap:2rem;margin:1rem 0}.stat{}.stat-label{font-size:12px;color:#666}.stat-val{font-size:1.25rem;font-weight:700}</style></head><body>`);
    printWindow.document.write(`<h1>Payment History</h1><h2>${listing?.title || ""} — ${listing?.address || ""}</h2>`);
    printWindow.document.write(`<div class="stats"><div class="stat"><div class="stat-label">Total Paid</div><div class="stat-val">${fmtCurrency(totalPaid)}</div></div><div class="stat"><div class="stat-label">Outstanding</div><div class="stat-val">${fmtCurrency(outstanding)}</div></div><div class="stat"><div class="stat-label">Late Fees</div><div class="stat-val">${fmtCurrency(totalLateFees)}</div></div></div>`);
    printWindow.document.write(`<table><thead><tr><th>Due Date</th><th style="text-align:right">Amount</th><th style="text-align:right">Late Fee</th><th>Status</th><th>Paid On</th><th>Method</th></tr></thead><tbody>${rows}</tbody></table>`);
    printWindow.document.write(`<p style="margin-top:2rem;font-size:11px;color:#999">Generated on ${format(new Date(), "d MMMM yyyy 'at' HH:mm")}</p></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  if (!tenancy) {
    return (
      <div className="max-w-3xl">
        <h1 className="font-display text-3xl font-bold mb-2">Payment History</h1>
        <Card className="p-8 text-center">
          <Home className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No active tenancy found.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">Payment History</h1>
          <p className="text-muted-foreground">{listing?.title} — {listing?.address}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-3 h-3 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <FileText className="w-3 h-3 mr-1" /> PDF
          </Button>
        </div>
      </motion.div>

      {/* Payment Reminders */}
      {reminders.length > 0 && (
        <Card className={`p-4 border-l-4 ${reminders.some(r => r.status === "overdue") ? "border-l-destructive bg-destructive/5" : "border-l-amber-500 bg-amber-500/5"}`}>
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-sm mb-2">Payment Reminders</p>
              <div className="space-y-2">
                {reminders.map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <span className={r.status === "overdue" ? "text-destructive font-medium" : "text-foreground"}>
                        {fmtCurrency(Number(r.amount) + Number(r.late_fee || 0))}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {r.status === "overdue"
                          ? `overdue by ${Math.abs(r.daysUntil)} days`
                          : r.daysUntil === 0 ? "due today"
                          : r.daysUntil === 1 ? "due tomorrow"
                          : `due in ${r.daysUntil} days`}
                        {" "}({format(parseISO(r.due_date), "d MMM")})
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handlePayNow(r.id)}
                      disabled={payingId === r.id}
                    >
                      <CreditCard className="w-3.5 h-3.5 mr-1" />
                      {payingId === r.id ? "Loading..." : "Pay Now"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Paid", value: fmtCurrency(totalPaid), color: "text-success" },
          { label: "Outstanding", value: fmtCurrency(outstanding), color: outstanding > 0 ? "text-destructive" : "text-success" },
          { label: "Late Fees", value: fmtCurrency(totalLateFees), color: totalLateFees > 0 ? "text-amber-600" : "text-muted-foreground" },
          { label: "Total Spending", value: fmtCurrency(totalSpent), color: "text-primary" },
          { label: "Next Due", value: nextPayment ? format(parseISO(nextPayment.due_date), "d MMM") : "—", color: "text-foreground" },
        ].map(stat => (
          <Card key={stat.label} className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
            <p className={`font-display text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Full History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="p-5 lg:col-span-2">
              <h3 className="font-display text-sm font-semibold mb-4">Monthly Spending</h3>
              <ChartContainer config={chartConfig} className="h-[260px] w-full">
                <BarChart data={monthlySpending}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(200,10%,46%)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(200,10%,46%)" }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="rent" stackId="a" fill="hsl(174,62%,28%)" radius={[0,0,0,0]} />
                  <Bar dataKey="utilities" stackId="a" fill="hsl(36,90%,55%)" radius={[4,4,0,0]} />
                </BarChart>
              </ChartContainer>
            </Card>

            <Card className="p-5">
              <h3 className="font-display text-sm font-semibold mb-4">Spending Breakdown</h3>
              {spendingBreakdown.length > 0 ? (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={spendingBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({ name, value }) => `${name}: ${fmtCurrency(value)}`}>
                        {spendingBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">No data yet</p>
              )}
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="font-display text-sm font-semibold mb-4">Cumulative Rent Paid</h3>
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <AreaChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fill: "hsl(200,10%,46%)", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(200,10%,46%)" }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="cumulative" fill="hsl(152,60%,38%)" fillOpacity={0.15} stroke="hsl(152,60%,38%)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="p-5">
            <h3 className="font-display text-sm font-semibold mb-4">All Payments</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-medium text-muted-foreground">Due Date</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Amount</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Late Fee</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Paid On</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Method</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Receipt</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payments?.map(p => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="py-2">{format(parseISO(p.due_date), "d MMM yyyy")}</td>
                      <td className="py-2 text-right font-medium">{fmtCurrency(Number(p.amount))}</td>
                      <td className="py-2 text-right">{Number(p.late_fee || 0) > 0 ? fmtCurrency(Number(p.late_fee)) : "—"}</td>
                      <td className="py-2">
                        <Badge variant={p.status === "paid" ? "default" : p.status === "overdue" ? "destructive" : "secondary"} className="text-xs">
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-muted-foreground">{p.paid_date ? format(parseISO(p.paid_date), "d MMM yyyy") : "—"}</td>
                      <td className="py-2 text-muted-foreground">{p.payment_method || "—"}</td>
                      <td className="py-2">
                        {p.receipt_url ? (
                          <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                            <Receipt className="w-3 h-3" /> View
                          </a>
                        ) : "—"}
                      </td>
                      <td className="py-2 text-right">
                        {(p.status === "upcoming" || p.status === "overdue") && (
                          <Button size="sm" variant="outline" onClick={() => handlePayNow(p.id)} disabled={payingId === p.id}>
                            <CreditCard className="w-3.5 h-3.5 mr-1" /> {payingId === p.id ? "..." : "Pay"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
