import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, RefreshCw, AlertTriangle, ScrollText, CheckCircle2 } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

const LANDLORD_POLICIES = [
  { type: "no_smoking", label: "No Smoking Policy", description: "Smoking is prohibited inside the property and communal areas." },
  { type: "no_pets", label: "Pet Policy", description: "No pets are allowed without prior written consent from the landlord." },
  { type: "no_subletting", label: "No Subletting Policy", description: "The property must not be sublet or shared with anyone not named on the lease." },
  { type: "quiet_hours", label: "Quiet Hours Policy", description: "Quiet hours are observed between 11pm and 7am." },
  { type: "maintenance_reporting", label: "Maintenance Reporting", description: "All maintenance issues must be reported within 48 hours of discovery." },
  { type: "property_inspection", label: "Property Inspection Consent", description: "The landlord may conduct inspections with 24 hours written notice." },
];

export default function TenantPolicies() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tenancy } = useQuery({
    queryKey: ["tenant-tenancy-active", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("tenancies").select("id, end_date, listings(title)").eq("tenant_id", user!.id).eq("status", "active").maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: consents } = useQuery({
    queryKey: ["tenant-policy-consents", tenancy?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("policy_consents").select("*").eq("tenancy_id", tenancy!.id).eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!tenancy && !!user,
  });

  const { data: renewals } = useQuery({
    queryKey: ["tenant-renewals", tenancy?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("renewal_proposals").select("*").eq("tenancy_id", tenancy!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenancy,
  });

  const { data: notices } = useQuery({
    queryKey: ["tenant-notices", tenancy?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("termination_notices").select("*").eq("tenancy_id", tenancy!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenancy,
  });

  const consentMutation = useMutation({
    mutationFn: async (policyType: string) => {
      const existing = (consents as any[])?.find((c: any) => c.policy_type === policyType);
      if (existing) {
        await (supabase as any).from("policy_consents").update({
          consented: true,
          consented_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await (supabase as any).from("policy_consents").insert({
          tenancy_id: tenancy!.id,
          user_id: user!.id,
          policy_type: policyType,
          consented: true,
          consented_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-policy-consents"] });
      toast({ title: "Policy consent recorded" });
    },
  });

  const respondRenewalMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await (supabase as any).from("renewal_proposals").update({
        status,
        responded_at: new Date().toISOString(),
      }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-renewals"] });
      toast({ title: "Renewal response submitted" });
    },
  });

  const acknowledgeNoticeMutation = useMutation({
    mutationFn: async (noticeId: string) => {
      await (supabase as any).from("termination_notices").update({
        acknowledged_at: new Date().toISOString(),
        status: "acknowledged",
      }).eq("id", noticeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-notices"] });
      toast({ title: "Notice acknowledged" });
    },
  });

  const daysUntilExpiry = tenancy ? differenceInDays(parseISO(tenancy.end_date), new Date()) : null;
  const consentedTypes = new Set((consents as any[])?.filter((c: any) => c.consented).map((c: any) => c.policy_type) || []);

  if (!tenancy) {
    return (
      <div className="max-w-3xl">
        <h1 className="font-display text-3xl font-bold mb-4">Lease Management</h1>
        <Card className="p-8 text-center"><p className="text-muted-foreground">No active tenancy.</p></Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold mb-1">Lease Management</h1>
        <p className="text-muted-foreground">Renewals, policies, and notices for {(tenancy.listings as any)?.title}</p>
      </motion.div>

      {/* Lease Expiry Alert */}
      {daysUntilExpiry !== null && daysUntilExpiry <= 90 && (
        <Card className={`p-4 border-l-4 ${daysUntilExpiry <= 30 ? "border-l-destructive bg-destructive/5" : "border-l-amber-500 bg-amber-500/5"}`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-5 h-5 ${daysUntilExpiry <= 30 ? "text-destructive" : "text-amber-500"}`} />
            <div>
              <p className="font-medium">Lease expires in {daysUntilExpiry} days</p>
              <p className="text-sm text-muted-foreground">Expiry: {format(parseISO(tenancy.end_date), "d MMMM yyyy")}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Renewal Proposals */}
      {(renewals as any[])?.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" /> Renewal Proposals
          </h2>
          {(renewals as any[]).map((r: any) => (
            <Card key={r.id} className="p-4 mb-2">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">Renewal Proposal</p>
                  <p className="text-sm text-muted-foreground">
                    New rent: £{r.new_rent_pcm}/mo · {format(parseISO(r.new_start_date), "d MMM yyyy")} – {format(parseISO(r.new_end_date), "d MMM yyyy")}
                  </p>
                  {r.notes && <p className="text-sm mt-1">{r.notes}</p>}
                </div>
                <Badge className={r.status === "accepted" ? "bg-emerald-500/15 text-emerald-600" : r.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-600"}>
                  {r.status}
                </Badge>
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => respondRenewalMutation.mutate({ id: r.id, status: "accepted" })}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => respondRenewalMutation.mutate({ id: r.id, status: "rejected" })}>
                    Decline
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Termination Notices */}
      {(notices as any[])?.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-destructive" /> Notices
          </h2>
          {(notices as any[]).map((n: any) => (
            <Card key={n.id} className="p-4 mb-2 border-l-4 border-l-destructive">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium capitalize">{n.notice_type.replace(/_/g, " ")} Notice</p>
                  <p className="text-sm text-muted-foreground">
                    Issued: {format(parseISO(n.notice_date), "d MMM yyyy")} · Effective: {format(parseISO(n.effective_date), "d MMM yyyy")}
                  </p>
                  {n.reason && <p className="text-sm mt-1">{n.reason}</p>}
                </div>
                <Badge className={n.status === "acknowledged" ? "bg-muted text-muted-foreground" : "bg-destructive/15 text-destructive"}>
                  {n.status}
                </Badge>
              </div>
              {n.status === "issued" && !n.acknowledged_at && (
                <Button size="sm" variant="outline" onClick={() => acknowledgeNoticeMutation.mutate(n.id)}>
                  Acknowledge Receipt
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Policy Consents */}
      <div>
        <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" /> Landlord Policies
        </h2>
        <p className="text-sm text-muted-foreground mb-4">Review and consent to your landlord's property policies.</p>
        <div className="space-y-3">
          {LANDLORD_POLICIES.map(policy => {
            const consented = consentedTypes.has(policy.type);
            return (
              <Card key={policy.type} className={`p-4 ${consented ? "border-emerald-500/30 bg-emerald-500/5" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{policy.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{policy.description}</p>
                  </div>
                  {consented ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Consented
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => consentMutation.mutate(policy.type)}
                      disabled={consentMutation.isPending}
                    >
                      Accept
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
