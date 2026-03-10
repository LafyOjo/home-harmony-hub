import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

type DepositProtection = {
  id: string;
  tenancy_id: string;
  scheme_name: string;
  scheme_reference: string | null;
  deposit_amount: number;
  protected_date: string | null;
  status: string;
  prescribed_info_served_at: string | null;
  return_requested_at: string | null;
  return_amount: number | null;
  return_approved_at: string | null;
  return_reason: string | null;
  deductions: any[];
  dispute_raised: boolean;
};

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  protected: "bg-emerald-500/10 text-emerald-600",
  return_requested: "bg-primary/10 text-primary",
  returned: "bg-muted text-muted-foreground",
  disputed: "bg-destructive/10 text-destructive",
};

export default function TenantDeposit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [deposits, setDeposits] = useState<DepositProtection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeposits = async () => {
    if (!user) return;
    const { data: tenancies } = await supabase
      .from("tenancies")
      .select("id")
      .eq("tenant_id", user.id);

    const ids = tenancies?.map(t => t.id) || [];
    if (ids.length === 0) { setLoading(false); return; }

    const { data } = await (supabase as any)
      .from("deposit_protections")
      .select("*")
      .in("tenancy_id", ids)
      .order("created_at", { ascending: false });

    setDeposits(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchDeposits(); }, [user]);

  const requestReturn = async (id: string, reason: string, amount: number) => {
    const { error } = await (supabase as any).from("deposit_protections").update({
      status: "return_requested",
      return_requested_at: new Date().toISOString(),
      return_reason: reason,
      return_amount: amount,
    }).eq("id", id);

    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Return requested" }); fetchDeposits(); }
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold mb-6">Deposit Protection</h1>

      {deposits.length === 0 ? (
        <Card className="p-8 text-center">
          <Shield className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No deposit records found.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {deposits.map(d => (
            <Card key={d.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-display text-lg font-bold">£{d.deposit_amount}</p>
                  <p className="text-sm text-muted-foreground">{d.scheme_name} {d.scheme_reference && `• Ref: ${d.scheme_reference}`}</p>
                </div>
                <Badge className={statusColors[d.status] || ""} variant="secondary">
                  {d.status.replace("_", " ")}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {d.protected_date ? (
                    <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Protected on {format(new Date(d.protected_date), "dd MMM yyyy")}</>
                  ) : (
                    <><AlertTriangle className="w-4 h-4 text-warning" /> Not yet protected — contact your landlord</>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {d.prescribed_info_served_at ? (
                    <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Prescribed information received {format(new Date(d.prescribed_info_served_at), "dd MMM yyyy")}</>
                  ) : (
                    <><Clock className="w-4 h-4 text-muted-foreground" /> Prescribed information not yet served</>
                  )}
                </div>
                {d.return_approved_at && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Return of £{d.return_amount} approved on {format(new Date(d.return_approved_at), "dd MMM yyyy")}
                  </div>
                )}
              </div>

              {d.status === "protected" && (
                <ReturnRequestForm depositId={d.id} maxAmount={d.deposit_amount} onSubmit={requestReturn} />
              )}

              {/* Deductions */}
              {Array.isArray(d.deductions) && d.deductions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Deductions</p>
                  {d.deductions.map((ded: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{ded.reason}</span>
                      <span className="text-destructive">-£{ded.amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}

          {/* Know your rights */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <h3 className="font-medium text-sm mb-2">Know Your Rights</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Your deposit must be protected in a government-approved scheme within 30 days</li>
              <li>• Your landlord must provide you with prescribed information about the scheme</li>
              <li>• Your deposit should be returned within 10 days of agreement on deductions</li>
              <li>• If you dispute deductions, you can use the scheme's free dispute resolution</li>
              <li>• If your deposit isn't protected, you may claim 1–3× the deposit in court</li>
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

function ReturnRequestForm({ depositId, maxAmount, onSubmit }: { depositId: string; maxAmount: number; onSubmit: (id: string, reason: string, amount: number) => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState(maxAmount.toString());

  if (!open) return (
    <Button variant="outline" size="sm" className="mt-3" onClick={() => setOpen(true)}>
      Request Deposit Return
    </Button>
  );

  return (
    <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-3">
      <div>
        <Label className="text-xs">Return Amount (£)</Label>
        <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} max={maxAmount} />
      </div>
      <div>
        <Label className="text-xs">Reason / Notes</Label>
        <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="End of tenancy, requesting full return" rows={2} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => { onSubmit(depositId, reason, parseFloat(amount)); setOpen(false); }}>
          Submit Request
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
