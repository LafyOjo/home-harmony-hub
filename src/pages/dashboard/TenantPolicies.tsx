import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, RefreshCw, AlertTriangle, ScrollText, CheckCircle2, ShieldAlert } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

export default function TenantPolicies() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tenancy } = useQuery({
    queryKey: ["tenant-tenancy-active", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenancies")
        .select("id, end_date, listing_id, listings(title)")
        .eq("tenant_id", user!.id)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch DB-driven policies for this property
  const { data: policies } = useQuery({
    queryKey: ["property-policies", tenancy?.listing_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_policies" as any)
        .select("*")
        .eq("listing_id", tenancy!.listing_id)
        .order("created_at");
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!tenancy,
  });

  const { data: consents } = useQuery({
    queryKey: ["tenant-policy-consents", tenancy?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("policy_consents")
        .select("*")
        .eq("tenancy_id", tenancy!.id)
        .eq("user_id", user!.id);
      return (data || []) as any[];
    },
    enabled: !!tenancy && !!user,
  });

  const { data: renewals } = useQuery({
    queryKey: ["tenant-renewals", tenancy?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("renewal_proposals")
        .select("*")
        .eq("tenancy_id", tenancy!.id)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!tenancy,
  });

  const { data: notices } = useQuery({
    queryKey: ["tenant-notices", tenancy?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("termination_notices")
        .select("*")
        .eq("tenancy_id", tenancy!.id)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!tenancy,
  });

  const consentMutation = useMutation({
    mutationFn: async ({ policyType, policyVersion }: { policyType: string; policyVersion: string }) => {
      const existing = consents?.find((c: any) => c.policy_type === policyType);
      if (existing) {
        await supabase.from("policy_consents").update({
          consented: true,
          consented_at: new Date().toISOString(),
          policy_version: policyVersion,
        }).eq("id", existing.id);
      } else {
        await supabase.from("policy_consents").insert({
          tenancy_id: tenancy!.id,
          user_id: user!.id,
          policy_type: policyType,
          policy_version: policyVersion,
          consented: true,
          consented_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-policy-consents"] });
      toast({ title: "Policy accepted" });
    },
  });

  const respondRenewalMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await supabase.from("renewal_proposals").update({
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
      await supabase.from("termination_notices").update({
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

  // Build consent lookup: policy_type -> consent record
  const consentMap = new Map<string, any>();
  consents?.forEach((c: any) => consentMap.set(c.policy_type, c));

  // Check mandatory policies acceptance
  const mandatoryPolicies = policies?.filter((p: any) => p.is_mandatory) || [];
  const pendingMandatory = mandatoryPolicies.filter((p: any) => {
    const consent = consentMap.get(p.policy_type);
    return !consent || !consent.consented || consent.policy_version !== p.version;
  });

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

      {/* Mandatory policies banner */}
      {pendingMandatory.length > 0 && (
        <Card className="p-4 border-l-4 border-l-destructive bg-destructive/5">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium">Action required: {pendingMandatory.length} mandatory {pendingMandatory.length === 1 ? "policy" : "policies"} need your acceptance</p>
              <p className="text-sm text-muted-foreground">Please review and accept all mandatory policies below to continue using the platform.</p>
            </div>
          </div>
        </Card>
      )}

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
      {renewals?.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" /> Renewal Proposals
          </h2>
          {renewals.map((r: any) => (
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
      {notices?.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-destructive" /> Notices
          </h2>
          {notices.map((n: any) => (
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

      {/* Property Policies */}
      <div>
        <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" /> Property Policies
        </h2>
        <p className="text-sm text-muted-foreground mb-4">Review and accept your landlord's property policies.</p>
        <div className="space-y-3">
          {policies && policies.length > 0 ? (
            policies.map((policy: any) => {
              const consent = consentMap.get(policy.policy_type);
              const accepted = consent?.consented && consent?.policy_version === policy.version;
              const outdated = consent?.consented && consent?.policy_version !== policy.version;
              return (
                <Card key={policy.id} className={`p-4 ${accepted ? "border-emerald-500/30 bg-emerald-500/5" : policy.is_mandatory ? "border-destructive/30" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{policy.title}</p>
                        {policy.is_mandatory && <Badge variant="outline" className="text-xs">Mandatory</Badge>}
                        <span className="text-xs text-muted-foreground">v{policy.version}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{policy.description}</p>
                      {accepted && consent?.consented_at && (
                        <p className="text-xs text-emerald-600 mt-1">
                          Accepted on {format(parseISO(consent.consented_at), "d MMM yyyy 'at' HH:mm")}
                        </p>
                      )}
                      {outdated && (
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠ Policy updated since your last acceptance — please re-accept
                        </p>
                      )}
                    </div>
                    {accepted ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 shrink-0">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Accepted
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant={policy.is_mandatory ? "default" : "outline"}
                        onClick={() => consentMutation.mutate({ policyType: policy.policy_type, policyVersion: policy.version })}
                        disabled={consentMutation.isPending}
                        className="shrink-0"
                      >
                        Accept
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })
          ) : (
            <Card className="p-8 text-center">
              <ShieldCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No policies published for this property yet.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
