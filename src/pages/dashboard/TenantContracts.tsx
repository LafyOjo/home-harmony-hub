import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileSignature, Check } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function TenantContracts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tenancy } = useQuery({
    queryKey: ["tenant-tenancy-active", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("tenancies").select("id").eq("tenant_id", user!.id).eq("status", "active").maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: contracts } = useQuery({
    queryKey: ["tenant-contracts", tenancy?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("contracts").select("*").eq("tenancy_id", tenancy!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenancy,
  });

  const signMutation = useMutation({
    mutationFn: async (contractId: string) => {
      const { error } = await supabase.from("contracts").update({ tenant_signed_at: new Date().toISOString(), status: "tenant_signed" }).eq("id", contractId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-contracts"] });
      toast({ title: "Contract signed" });
    },
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "fully_signed": return "bg-success text-success-foreground";
      case "tenant_signed": case "landlord_signed": return "bg-primary text-primary-foreground";
      case "sent": return "bg-warning text-warning-foreground";
      case "expired": case "cancelled": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold mb-1">Contracts</h1>
        <p className="text-muted-foreground">View and sign your tenancy contracts</p>
      </motion.div>

      {!tenancy ? (
        <Card className="p-8 text-center"><p className="text-muted-foreground">No active tenancy.</p></Card>
      ) : (
        <div className="space-y-3">
          {contracts?.map(c => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {c.contract_type} · {c.valid_from && c.valid_to ? `${format(parseISO(c.valid_from), "d MMM yyyy")} – ${format(parseISO(c.valid_to), "d MMM yyyy")}` : "Dates TBC"}
                  </p>
                </div>
                <Badge className={statusColor(c.status)}>{c.status.replace("_", " ")}</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className={c.tenant_signed_at ? "text-success" : "text-muted-foreground"}>
                  {c.tenant_signed_at ? `✓ You signed ${format(parseISO(c.tenant_signed_at), "d MMM")}` : "Awaiting your signature"}
                </span>
                <span className={c.landlord_signed_at ? "text-success" : "text-muted-foreground"}>
                  {c.landlord_signed_at ? `✓ Landlord signed ${format(parseISO(c.landlord_signed_at), "d MMM")}` : "Awaiting landlord signature"}
                </span>
              </div>
              {c.status === "sent" && !c.tenant_signed_at && (
                <Button className="mt-3" onClick={() => signMutation.mutate(c.id)} disabled={signMutation.isPending}>
                  <Check className="w-4 h-4 mr-2" />Sign Contract
                </Button>
              )}
            </Card>
          ))}
          {(!contracts || contracts.length === 0) && (
            <Card className="p-8 text-center">
              <FileSignature className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No contracts available.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
