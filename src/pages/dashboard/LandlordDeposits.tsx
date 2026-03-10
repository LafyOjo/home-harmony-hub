import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Shield, Plus, AlertTriangle, CheckCircle2, Clock, Undo2 } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

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
  tenancies: { listings: { title: string } | null; profiles: null } | null;
  tenant_name?: string;
};

const statusConfig: Record<string, { color: string; icon: any }> = {
  pending: { color: "bg-warning/10 text-warning", icon: Clock },
  protected: { color: "bg-emerald-500/10 text-emerald-600", icon: Shield },
  return_requested: { color: "bg-primary/10 text-primary", icon: Undo2 },
  returned: { color: "bg-muted text-muted-foreground", icon: CheckCircle2 },
  disputed: { color: "bg-destructive/10 text-destructive", icon: AlertTriangle },
};

export default function LandlordDeposits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [deposits, setDeposits] = useState<DepositProtection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form
  const [selectedTenancy, setSelectedTenancy] = useState("");
  const [tenancies, setTenancies] = useState<any[]>([]);
  const [schemeRef, setSchemeRef] = useState("");
  const [schemeName, setSchemeName] = useState("DPS");
  const [amount, setAmount] = useState("");

  const fetchAll = async () => {
    if (!user) return;
    const { data: tenancyData } = await supabase
      .from("tenancies")
      .select("id, deposit, listing_id, tenant_id, listings(title)")
      .eq("landlord_id", user.id);
    setTenancies(tenancyData || []);

    const tenancyIds = tenancyData?.map(t => t.id) || [];
    if (tenancyIds.length === 0) { setLoading(false); return; }

    const { data } = await (supabase as any)
      .from("deposit_protections")
      .select("*")
      .in("tenancy_id", tenancyIds)
      .order("created_at", { ascending: false });

    // Get tenant names
    const tenantIds = [...new Set(tenancyData?.map(t => t.tenant_id) || [])];
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", tenantIds);
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    const tenancyMap = new Map(tenancyData?.map(t => [t.id, t]) || []);

    setDeposits((data || []).map((d: any) => {
      const tenancy = tenancyMap.get(d.tenancy_id);
      const profile = tenancy ? profileMap.get(tenancy.tenant_id) : null;
      return { ...d, tenant_name: profile?.full_name || profile?.email || "Tenant", tenancies: tenancy };
    }));
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [user]);

  const createProtection = async () => {
    if (!selectedTenancy || !amount) return;
    const { error } = await (supabase as any).from("deposit_protections").insert({
      tenancy_id: selectedTenancy,
      scheme_name: schemeName,
      scheme_reference: schemeRef || null,
      deposit_amount: parseFloat(amount),
      status: schemeRef ? "protected" : "pending",
      protected_date: schemeRef ? new Date().toISOString().split("T")[0] : null,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Deposit protection created" }); setDialogOpen(false); fetchAll(); }
  };

  const markProtected = async (id: string, ref: string) => {
    if (!ref.trim()) return;
    const { error } = await (supabase as any).from("deposit_protections").update({
      status: "protected",
      scheme_reference: ref,
      protected_date: new Date().toISOString().split("T")[0],
    }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Marked as protected" }); fetchAll(); }
  };

  const servePrescribedInfo = async (id: string) => {
    const { error } = await (supabase as any).from("deposit_protections").update({
      prescribed_info_served_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Prescribed information served" }); fetchAll(); }
  };

  const approveReturn = async (id: string, returnAmount: number) => {
    const { error } = await (supabase as any).from("deposit_protections").update({
      status: "returned",
      return_amount: returnAmount,
      return_approved_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Deposit return approved" }); fetchAll(); }
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Deposit Protection</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Register Deposit</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Register Deposit Protection</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tenancy</Label>
                <select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background" value={selectedTenancy} onChange={e => setSelectedTenancy(e.target.value)}>
                  <option value="">Select tenancy...</option>
                  {tenancies.map(t => (
                    <option key={t.id} value={t.id}>{(t.listings as any)?.title} (£{t.deposit || 0})</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Scheme</Label>
                <select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background" value={schemeName} onChange={e => setSchemeName(e.target.value)}>
                  <option value="DPS">Deposit Protection Service (DPS)</option>
                  <option value="MyDeposits">MyDeposits</option>
                  <option value="TDS">Tenancy Deposit Scheme (TDS)</option>
                </select>
              </div>
              <div>
                <Label>Deposit Amount (£)</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="1200" />
              </div>
              <div>
                <Label>Scheme Reference (optional — add later if pending)</Label>
                <Input value={schemeRef} onChange={e => setSchemeRef(e.target.value)} placeholder="DPS-12345678" />
              </div>
              <Button onClick={createProtection} className="w-full">Register</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* UK compliance warning */}
      <Card className="p-4 mb-6 border-warning/30 bg-warning/5">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">UK Legal Requirement</p>
            <p className="text-muted-foreground">Deposits must be protected in a government-approved scheme within 30 days of receipt. Prescribed information must be served to the tenant. Failure to comply may result in penalties of 1–3× the deposit amount.</p>
          </div>
        </div>
      </Card>

      {deposits.length === 0 ? (
        <Card className="p-8 text-center">
          <Shield className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No deposit protections registered yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {deposits.map(d => {
            const config = statusConfig[d.status] || statusConfig.pending;
            const StatusIcon = config.icon;
            return (
              <Card key={d.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{(d.tenancies as any)?.listings?.title || "Property"}</p>
                    <p className="text-sm text-muted-foreground">{d.tenant_name} • £{d.deposit_amount}</p>
                  </div>
                  <Badge className={config.color} variant="secondary">
                    <StatusIcon className="w-3 h-3 mr-1" /> {d.status.replace("_", " ")}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
                  <span>Scheme: {d.scheme_name}</span>
                  <span>Ref: {d.scheme_reference || "—"}</span>
                  <span>Protected: {d.protected_date ? format(new Date(d.protected_date), "dd MMM yyyy") : "Not yet"}</span>
                  <span>Prescribed info: {d.prescribed_info_served_at ? format(new Date(d.prescribed_info_served_at), "dd MMM yyyy") : "Not served"}</span>
                </div>

                {/* Actions based on status */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {d.status === "pending" && (
                    <ProtectDialog depositId={d.id} onProtect={markProtected} />
                  )}
                  {d.status === "protected" && !d.prescribed_info_served_at && (
                    <Button size="sm" variant="outline" onClick={() => servePrescribedInfo(d.id)}>
                      Mark Prescribed Info Served
                    </Button>
                  )}
                  {d.status === "return_requested" && (
                    <Button size="sm" onClick={() => approveReturn(d.id, d.return_amount || d.deposit_amount)}>
                      Approve Return (£{d.return_amount || d.deposit_amount})
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProtectDialog({ depositId, onProtect }: { depositId: string; onProtect: (id: string, ref: string) => void }) {
  const [ref, setRef] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Mark as Protected</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Enter Scheme Reference</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={ref} onChange={e => setRef(e.target.value)} placeholder="DPS-12345678" />
          <Button onClick={() => { onProtect(depositId, ref); setOpen(false); }} disabled={!ref.trim()} className="w-full">
            Confirm Protection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
