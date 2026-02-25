import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Home, CalendarDays, PoundSterling, AlertTriangle, CheckCircle } from "lucide-react";
import { format, differenceInMonths, parseISO } from "date-fns";

export default function TenantTenancy() {
  const { user } = useAuth();

  const { data: tenancy, isLoading: tenancyLoading } = useQuery({
    queryKey: ["tenant-tenancy", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenancies")
        .select("*")
        .eq("tenant_id", user!.id)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: payments } = useQuery({
    queryKey: ["tenant-payments", tenancy?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rent_payments")
        .select("*")
        .eq("tenancy_id", tenancy!.id)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!tenancy,
  });

  const { data: listing } = useQuery({
    queryKey: ["tenancy-listing", tenancy?.listing_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("title, address, postcode")
        .eq("id", tenancy!.listing_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenancy,
  });

  if (tenancyLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  if (!tenancy) {
    return (
      <div className="max-w-3xl">
        <h1 className="font-display text-3xl font-bold mb-2">My Tenancy</h1>
        <Card className="p-8 text-center">
          <Home className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No active tenancy found. Once your application is accepted, your tenancy details will appear here.</p>
        </Card>
      </div>
    );
  }

  const totalRent = Number(tenancy.rent_pcm) * differenceInMonths(parseISO(tenancy.end_date), parseISO(tenancy.start_date));
  const paidPayments = payments?.filter(p => p.status === "paid") ?? [];
  const totalPaid = paidPayments.reduce((sum, p) => sum + Number(p.paid_amount || p.amount), 0);
  const overduePayments = payments?.filter(p => p.status === "overdue") ?? [];
  const upcomingPayments = payments?.filter(p => p.status === "upcoming") ?? [];
  const partialPayments = payments?.filter(p => p.status === "partial") ?? [];
  const outstanding = totalRent - totalPaid;
  const totalPayments = payments?.length ?? 0;
  const paymentsLeft = totalPayments - paidPayments.length;
  const progressPct = totalPayments > 0 ? (paidPayments.length / totalPayments) * 100 : 0;

  const statusColor = (s: string) => {
    switch (s) {
      case "paid": return "bg-success text-success-foreground";
      case "overdue": return "bg-destructive text-destructive-foreground";
      case "partial": return "bg-warning text-warning-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold mb-1">My Tenancy</h1>
        <p className="text-muted-foreground">{listing?.title} — {listing?.address}, {listing?.postcode}</p>
      </motion.div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Monthly Rent</p>
          <p className="font-display text-2xl font-bold">£{Number(tenancy.rent_pcm).toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
          <p className="font-display text-2xl font-bold text-success">£{totalPaid.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
          <p className="font-display text-2xl font-bold text-destructive">£{outstanding.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Payments Left</p>
          <p className="font-display text-2xl font-bold">{paymentsLeft}</p>
        </Card>
      </div>

      {/* Progress */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Tenancy Progress</span>
          <span className="text-sm text-muted-foreground">{paidPayments.length}/{totalPayments} payments</span>
        </div>
        <Progress value={progressPct} className="h-3" />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{format(parseISO(tenancy.start_date), "d MMM yyyy")}</span>
          <span>{format(parseISO(tenancy.end_date), "d MMM yyyy")}</span>
        </div>
      </Card>

      {/* Alerts */}
      {overduePayments.length > 0 && (
        <Card className="p-4 border-destructive/50 bg-destructive/5">
          <div className="flex items-center gap-2 text-destructive font-medium">
            <AlertTriangle className="w-4 h-4" />
            {overduePayments.length} overdue payment{overduePayments.length > 1 ? "s" : ""} — £{overduePayments.reduce((s, p) => s + Number(p.amount) - Number(p.paid_amount || 0), 0).toLocaleString()} outstanding
          </div>
        </Card>
      )}

      {partialPayments.length > 0 && (
        <Card className="p-4 border-warning/50 bg-warning/5">
          <div className="flex items-center gap-2 text-warning font-medium">
            <AlertTriangle className="w-4 h-4" />
            {partialPayments.length} partial payment{partialPayments.length > 1 ? "s" : ""} requiring top-up
          </div>
        </Card>
      )}

      {/* Payment schedule */}
      <div>
        <h2 className="font-display text-lg font-semibold mb-3">Payment Schedule</h2>
        <div className="space-y-2">
          {payments?.map((p) => (
            <Card key={p.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${p.status === 'paid' ? 'bg-success/10' : p.status === 'overdue' ? 'bg-destructive/10' : 'bg-muted'}`}>
                  {p.status === "paid" ? <CheckCircle className="w-4 h-4 text-success" /> : 
                   p.status === "overdue" ? <AlertTriangle className="w-4 h-4 text-destructive" /> :
                   <CalendarDays className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{format(parseISO(p.due_date), "d MMMM yyyy")}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.status === "paid" && p.paid_date ? `Paid ${format(parseISO(p.paid_date), "d MMM")}` : p.status === "partial" ? `£${Number(p.paid_amount).toLocaleString()} of £${Number(p.amount).toLocaleString()} paid` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">£{Number(p.amount).toLocaleString()}</span>
                <Badge className={statusColor(p.status)}>{p.status}</Badge>
              </div>
            </Card>
          ))}
          {(!payments || payments.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">No payment records yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
