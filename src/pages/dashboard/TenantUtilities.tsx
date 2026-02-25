import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Flame, Droplets, Wifi, Building, Receipt } from "lucide-react";
import { format, parseISO } from "date-fns";

const utilityIcons: Record<string, typeof Zap> = {
  electricity: Zap,
  gas: Flame,
  water: Droplets,
  internet: Wifi,
  council_tax: Building,
  service_charge: Receipt,
  other: Receipt,
};

const utilityLabels: Record<string, string> = {
  electricity: "Electricity",
  gas: "Gas",
  water: "Water",
  internet: "Internet",
  council_tax: "Council Tax",
  service_charge: "Service Charge",
  other: "Other",
};

export default function TenantUtilities() {
  const { user } = useAuth();

  const { data: tenancy } = useQuery({
    queryKey: ["tenant-tenancy-active", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenancies")
        .select("id")
        .eq("tenant_id", user!.id)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: utilities } = useQuery({
    queryKey: ["tenant-utilities", tenancy?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("utilities")
        .select("*")
        .eq("tenancy_id", tenancy!.id)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!tenancy,
  });

  const totalDue = utilities?.filter(u => u.status !== "paid").reduce((s, u) => s + Number(u.amount || 0), 0) ?? 0;
  const totalPaid = utilities?.filter(u => u.status === "paid").reduce((s, u) => s + Number(u.amount || 0), 0) ?? 0;

  const statusColor = (s: string) => {
    switch (s) {
      case "paid": return "bg-success text-success-foreground";
      case "overdue": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold mb-1">Utilities</h1>
        <p className="text-muted-foreground">Track your utility bills and payments</p>
      </motion.div>

      {!tenancy ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No active tenancy. Utilities will appear once you have an active tenancy.</p>
        </Card>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Outstanding</p>
              <p className="font-display text-2xl font-bold text-destructive">£{totalDue.toLocaleString()}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
              <p className="font-display text-2xl font-bold text-success">£{totalPaid.toLocaleString()}</p>
            </Card>
          </div>

          <div className="space-y-3">
            {utilities?.map((u) => {
              const Icon = utilityIcons[u.utility_type] || Receipt;
              return (
                <Card key={u.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{utilityLabels[u.utility_type] || u.utility_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.provider_name && `${u.provider_name} · `}
                        {u.due_date ? `Due ${format(parseISO(u.due_date), "d MMM yyyy")}` : "No due date"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">£{Number(u.amount || 0).toLocaleString()}</span>
                    <Badge className={statusColor(u.status)}>{u.status}</Badge>
                  </div>
                </Card>
              );
            })}
            {(!utilities || utilities.length === 0) && (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground text-sm">No utility records yet.</p>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
