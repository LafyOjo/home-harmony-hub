import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { FileSignature, Check, Download, RefreshCw, Calendar, PoundSterling, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

export default function TenantContracts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [signingId, setSigningId] = useState<string | null>(null);
  const [sigName, setSigName] = useState("");
  const [sigConsent, setSigConsent] = useState(false);
  const [filter, setFilter] = useState("all");
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [renewalNotes, setRenewalNotes] = useState("");

  const { data: tenancy } = useQuery({
    queryKey: ["tenant-tenancy-active", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenancies")
        .select("id, rent_pcm, deposit, start_date, end_date, listing_id, landlord_id, listings(title, address)")
        .eq("tenant_id", user!.id)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: contracts } = useQuery({
    queryKey: ["tenant-contracts", tenancy?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("tenancy_id", tenancy!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenancy,
  });

  const signMutation = useMutation({
    mutationFn: async (contractId: string) => {
      const contract = contracts?.find(c => c.id === contractId);
      const newStatus = contract?.landlord_signed_at ? "fully_signed" : "tenant_signed";
      const { error } = await supabase.from("contracts").update({
        tenant_signed_at: new Date().toISOString(),
        tenant_signature_name: sigName,
        status: newStatus,
      } as any).eq("id", contractId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-contracts"] });
      toast({ title: "Contract signed successfully" });
      setSigningId(null);
      setSigName("");
      setSigConsent(false);
    },
  });

  const renewalMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("renewal_proposals").insert({
        tenancy_id: tenancy!.id,
        proposed_by: user!.id,
        new_rent_pcm: tenancy!.rent_pcm,
        new_start_date: tenancy!.end_date,
        new_end_date: format(new Date(new Date(tenancy!.end_date).getTime() + 365 * 86400000), "yyyy-MM-dd"),
        notes: renewalNotes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Renewal request sent to landlord" });
      setRenewalOpen(false);
      setRenewalNotes("");
    },
  });

  const downloadContract = async (storageKey: string, fileName: string) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(storageKey, 300);
    if (error || !data?.signedUrl) {
      toast({ title: "Download failed", variant: "destructive" });
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = fileName;
    a.click();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "fully_signed": return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
      case "tenant_signed": case "landlord_signed": return "bg-primary/15 text-primary";
      case "sent": return "bg-amber-500/15 text-amber-600 border-amber-500/30";
      case "expired": case "cancelled": return "bg-destructive/15 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const filtered = contracts?.filter(c => {
    if (filter === "active") return c.status === "fully_signed";
    if (filter === "pending") return ["sent", "tenant_signed", "landlord_signed"].includes(c.status);
    if (filter === "expired") return ["expired", "cancelled"].includes(c.status);
    return true;
  });

  return (
    <div className="max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold mb-1">Contracts & Leases</h1>
        <p className="text-muted-foreground">View, sign, and manage your tenancy agreements</p>
      </motion.div>

      {!tenancy ? (
        <Card className="p-8 text-center"><p className="text-muted-foreground">No active tenancy.</p></Card>
      ) : (
        <>
          {/* Key Terms Summary */}
          <Card className="p-5">
            <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Current Tenancy Terms</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><PoundSterling className="w-3.5 h-3.5" />Monthly Rent</div>
                <p className="font-bold text-lg">£{Number(tenancy.rent_pcm).toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><PoundSterling className="w-3.5 h-3.5" />Deposit</div>
                <p className="font-bold text-lg">£{tenancy.deposit ? Number(tenancy.deposit).toLocaleString() : "N/A"}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Calendar className="w-3.5 h-3.5" />Duration</div>
                <p className="font-bold text-sm">{format(parseISO(tenancy.start_date), "d MMM yy")} – {format(parseISO(tenancy.end_date), "d MMM yy")}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="w-3.5 h-3.5" />End / Renewal</div>
                <p className="font-bold text-sm">{format(parseISO(tenancy.end_date), "d MMM yyyy")}</p>
              </div>
            </div>
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={() => setRenewalOpen(true)}>
                <RefreshCw className="w-4 h-4 mr-2" /> Request Renewal
              </Button>
            </div>
          </Card>

          {/* Filters */}
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="expired">Expired</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Contract List */}
          <div className="space-y-3">
            {filtered?.map(c => (
              <Card key={c.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {c.contract_type} · {c.valid_from && c.valid_to ? `${format(parseISO(c.valid_from), "d MMM yyyy")} – ${format(parseISO(c.valid_to), "d MMM yyyy")}` : "Dates TBC"}
                    </p>
                    {c.is_uploaded && <Badge variant="outline" className="mt-1 text-xs">Uploaded Document</Badge>}
                  </div>
                  <Badge className={statusColor(c.status)}>{c.status.replace(/_/g, " ")}</Badge>
                </div>

                {/* Lease content preview */}
                {c.lease_content && (
                  <details className="mb-3">
                    <summary className="text-sm text-primary cursor-pointer hover:underline">View Lease Agreement</summary>
                    <div className="mt-2 bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto border border-border">
                      {c.lease_content}
                    </div>
                  </details>
                )}

                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <span className={c.tenant_signed_at ? "text-emerald-600" : "text-muted-foreground"}>
                    {c.tenant_signed_at
                      ? `✓ You signed ${format(parseISO(c.tenant_signed_at), "d MMM")}${c.tenant_signature_name ? ` as "${c.tenant_signature_name}"` : ""}`
                      : "Awaiting your signature"}
                  </span>
                  <span className={c.landlord_signed_at ? "text-emerald-600" : "text-muted-foreground"}>
                    {c.landlord_signed_at
                      ? `✓ Landlord signed ${format(parseISO(c.landlord_signed_at), "d MMM")}`
                      : "Awaiting landlord signature"}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {c.status === "sent" && !c.tenant_signed_at && (
                    <Button onClick={() => setSigningId(c.id)}>
                      <Check className="w-4 h-4 mr-2" /> Sign Contract
                    </Button>
                  )}
                  {c.storage_key && (
                    <Button variant="outline" size="sm" onClick={() => downloadContract(c.storage_key!, c.title + ".pdf")}>
                      <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                  )}
                </div>
              </Card>
            ))}
            {(!filtered || filtered.length === 0) && (
              <Card className="p-8 text-center">
                <FileSignature className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No contracts found.</p>
              </Card>
            )}
          </div>
        </>
      )}

      {/* E-Signature Dialog */}
      <Dialog open={!!signingId} onOpenChange={open => { if (!open) { setSigningId(null); setSigName(""); setSigConsent(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Contract</DialogTitle>
            <DialogDescription>
              Type your full legal name below to electronically sign this contract. This constitutes a legally binding signature.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Full Legal Name *</Label>
              <Input
                value={sigName}
                onChange={e => setSigName(e.target.value)}
                placeholder="Enter your full legal name"
                className="font-serif text-lg"
              />
              {sigName && (
                <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Signature Preview</p>
                  <p className="font-serif text-2xl italic text-foreground">{sigName}</p>
                </div>
              )}
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={sigConsent} onCheckedChange={v => setSigConsent(v === true)} className="mt-0.5" />
              <span className="text-sm text-muted-foreground">
                I confirm that I have read and understood the terms of this agreement. By typing my name above, I agree that this electronic signature is legally binding and equivalent to a handwritten signature.
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSigningId(null)}>Cancel</Button>
            <Button
              onClick={() => signingId && signMutation.mutate(signingId)}
              disabled={!sigName.trim() || !sigConsent || signMutation.isPending}
            >
              {signMutation.isPending ? "Signing..." : "Sign & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renewal Request Dialog */}
      <Dialog open={renewalOpen} onOpenChange={setRenewalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Lease Renewal</DialogTitle>
            <DialogDescription>
              Submit a renewal request to your landlord. They will review and may propose updated terms.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={renewalNotes}
                onChange={e => setRenewalNotes(e.target.value)}
                placeholder="Any preferences or comments for your landlord..."
                rows={3}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Current lease ends {tenancy?.end_date ? format(parseISO(tenancy.end_date), "d MMMM yyyy") : "N/A"}. 
              The renewal request will default to extending by 12 months at the current rent of £{tenancy?.rent_pcm ? Number(tenancy.rent_pcm).toLocaleString() : "—"}/mo.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewalOpen(false)}>Cancel</Button>
            <Button onClick={() => renewalMutation.mutate()} disabled={renewalMutation.isPending}>
              {renewalMutation.isPending ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
