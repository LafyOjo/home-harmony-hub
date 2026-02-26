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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { FileSignature, Check, Upload } from "lucide-react";
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
      const { error } = await supabase.from("contracts").update({
        tenant_signed_at: new Date().toISOString(),
        tenant_signature_name: sigName,
        status: "tenant_signed",
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

  const statusColor = (s: string) => {
    switch (s) {
      case "fully_signed": return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
      case "tenant_signed": case "landlord_signed": return "bg-primary/15 text-primary";
      case "sent": return "bg-amber-500/15 text-amber-600 border-amber-500/30";
      case "expired": case "cancelled": return "bg-destructive/15 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold mb-1">Contracts & Leases</h1>
        <p className="text-muted-foreground">View, sign, and manage your tenancy agreements</p>
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
                  {(c as any).is_uploaded && <Badge variant="outline" className="mt-1 text-xs">Uploaded Document</Badge>}
                </div>
                <Badge className={statusColor(c.status)}>{c.status.replace(/_/g, " ")}</Badge>
              </div>

              {/* Lease content preview */}
              {(c as any).lease_content && (
                <details className="mb-3">
                  <summary className="text-sm text-primary cursor-pointer hover:underline">View Lease Agreement</summary>
                  <div className="mt-2 bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto border border-border">
                    {(c as any).lease_content}
                  </div>
                </details>
              )}

              <div className="flex items-center gap-4 text-sm">
                <span className={c.tenant_signed_at ? "text-emerald-600" : "text-muted-foreground"}>
                  {c.tenant_signed_at
                    ? `✓ You signed ${format(parseISO(c.tenant_signed_at), "d MMM")}${(c as any).tenant_signature_name ? ` as "${(c as any).tenant_signature_name}"` : ""}`
                    : "Awaiting your signature"}
                </span>
                <span className={c.landlord_signed_at ? "text-emerald-600" : "text-muted-foreground"}>
                  {c.landlord_signed_at
                    ? `✓ Landlord signed ${format(parseISO(c.landlord_signed_at), "d MMM")}`
                    : "Awaiting landlord signature"}
                </span>
              </div>

              {c.status === "sent" && !c.tenant_signed_at && (
                <Button className="mt-3" onClick={() => setSigningId(c.id)}>
                  <Check className="w-4 h-4 mr-2" /> Sign Contract
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
    </div>
  );
}
