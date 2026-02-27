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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileSignature, Plus, Upload, Check, Download } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

export default function LandlordContracts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [signId, setSignId] = useState<string | null>(null);
  const [sigName, setSigName] = useState("");
  const [sigConsent, setSigConsent] = useState(false);

  // Create form
  const [selTenancy, setSelTenancy] = useState("");
  const [title, setTitle] = useState("");
  const [contractType, setContractType] = useState("initial");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [leaseMode, setLeaseMode] = useState<"generate" | "upload">("generate");
  const [leaseContent, setLeaseContent] = useState("");
  const [leaseFile, setLeaseFile] = useState<File | null>(null);

  const { data: tenancies } = useQuery({
    queryKey: ["landlord-tenancies-list", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenancies")
        .select("id, rent_pcm, deposit, start_date, end_date, status, listings(title, address, postcode), profiles!tenancies_tenant_id_fkey(full_name, email)")
        .eq("landlord_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: contracts } = useQuery({
    queryKey: ["landlord-all-contracts", user?.id],
    queryFn: async () => {
      const tenancyIds = tenancies?.map(t => t.id) || [];
      if (!tenancyIds.length) return [];
      const { data, error } = await supabase
        .from("contracts")
        .select("*, tenancies(listings(title, address))")
        .in("tenancy_id", tenancyIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenancies && tenancies.length > 0,
  });

  const generateAST = () => {
    const t = tenancies?.find(t => t.id === selTenancy);
    if (!t) return "";
    const listing = t.listings as any;
    const tenant = (t as any).profiles;
    return `ASSURED SHORTHOLD TENANCY AGREEMENT

This tenancy agreement is made on ${format(new Date(), "d MMMM yyyy")}

PROPERTY: ${listing?.title || ""}
ADDRESS: ${listing?.address || ""}, ${listing?.postcode || ""}

LANDLORD: [Landlord Name]
TENANT: ${tenant?.full_name || "[Tenant Name]"}

TERM: ${validFrom ? format(parseISO(validFrom), "d MMMM yyyy") : "[Start Date]"} to ${validTo ? format(parseISO(validTo), "d MMMM yyyy") : "[End Date]"}

RENT: £${Number(t.rent_pcm).toLocaleString()} per calendar month, payable in advance on the first day of each month.

DEPOSIT: £${t.deposit ? Number(t.deposit).toLocaleString() : "N/A"}, held in accordance with the Tenancy Deposit Scheme.

OBLIGATIONS OF THE TENANT:
1. Pay the rent on time and in full.
2. Keep the property in good condition and report any damage promptly.
3. Not make any alterations without written consent.
4. Not sublet or assign the tenancy without written consent.
5. Allow access for inspections with 24 hours' notice.
6. Return the property in the same condition at the end of the tenancy.

OBLIGATIONS OF THE LANDLORD:
1. Maintain the structure and exterior of the property.
2. Keep installations for gas, water, electricity and sanitation in working order.
3. Provide a valid EPC, gas safety certificate and deposit protection.
4. Give proper notice before any inspections or visits.

TERMINATION:
Either party may terminate this agreement by giving at least two months' written notice, not to end before the fixed term expires.

This agreement is governed by the laws of England and Wales.`;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      let storageKey: string | null = null;
      let content = leaseContent;

      if (leaseMode === "upload" && leaseFile) {
        const key = `${user!.id}/contracts/${Date.now()}-${leaseFile.name}`;
        const { error: upErr } = await supabase.storage.from("documents").upload(key, leaseFile);
        if (upErr) throw upErr;
        storageKey = key;
      } else if (leaseMode === "generate" && !content) {
        content = generateAST();
      }

      const { error } = await supabase.from("contracts").insert({
        tenancy_id: selTenancy,
        title,
        contract_type: contractType,
        valid_from: validFrom || null,
        valid_to: validTo || null,
        status: "sent",
        storage_key: storageKey,
        lease_content: content || null,
        is_uploaded: leaseMode === "upload",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord-all-contracts"] });
      toast({ title: "Contract created & sent to tenant" });
      setCreateOpen(false);
      setTitle(""); setLeaseContent(""); setLeaseFile(null); setSelTenancy("");
    },
  });

  const signMutation = useMutation({
    mutationFn: async (contractId: string) => {
      const contract = contracts?.find(c => c.id === contractId);
      const newStatus = contract?.tenant_signed_at ? "fully_signed" : "landlord_signed";
      const { error } = await supabase.from("contracts").update({
        landlord_signed_at: new Date().toISOString(),
        landlord_signature_name: sigName,
        status: newStatus,
      } as any).eq("id", contractId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord-all-contracts"] });
      toast({ title: "Contract signed" });
      setSignId(null); setSigName(""); setSigConsent(false);
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
    <div className="max-w-5xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">Contracts</h1>
          <p className="text-muted-foreground">Manage lease agreements across all your properties</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Contract
        </Button>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {["all", "active", "pending", "expired"].map(f => {
          const count = contracts?.filter(c => {
            if (f === "active") return c.status === "fully_signed";
            if (f === "pending") return ["sent", "tenant_signed", "landlord_signed"].includes(c.status);
            if (f === "expired") return ["expired", "cancelled"].includes(c.status);
            return true;
          }).length ?? 0;
          return (
            <Card key={f} className={`p-3 cursor-pointer transition-colors ${filter === f ? "border-primary" : ""}`} onClick={() => setFilter(f)}>
              <p className="text-xs text-muted-foreground capitalize">{f === "all" ? "Total" : f}</p>
              <p className="text-2xl font-bold">{count}</p>
            </Card>
          );
        })}
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {filtered?.map(c => {
          const listing = (c.tenancies as any)?.listings;
          return (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {listing?.title || listing?.address || "—"} · <span className="capitalize">{c.contract_type}</span>
                    {c.valid_from && c.valid_to && ` · ${format(parseISO(c.valid_from), "d MMM yy")} – ${format(parseISO(c.valid_to), "d MMM yy")}`}
                  </p>
                  {c.is_uploaded && <Badge variant="outline" className="mt-1 text-xs">Uploaded PDF</Badge>}
                </div>
                <Badge className={statusColor(c.status)}>{c.status.replace(/_/g, " ")}</Badge>
              </div>

              {c.lease_content && (
                <details className="mb-3">
                  <summary className="text-sm text-primary cursor-pointer hover:underline">View Lease Text</summary>
                  <div className="mt-2 bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto border border-border">
                    {c.lease_content}
                  </div>
                </details>
              )}

              <div className="flex items-center gap-4 text-sm flex-wrap">
                <span className={c.tenant_signed_at ? "text-emerald-600" : "text-muted-foreground"}>
                  {c.tenant_signed_at ? `✓ Tenant signed ${format(parseISO(c.tenant_signed_at), "d MMM")}` : "Awaiting tenant"}
                </span>
                <span className={c.landlord_signed_at ? "text-emerald-600" : "text-muted-foreground"}>
                  {c.landlord_signed_at
                    ? `✓ You signed ${format(parseISO(c.landlord_signed_at), "d MMM")}${c.landlord_signature_name ? ` as "${c.landlord_signature_name}"` : ""}`
                    : "Awaiting your signature"}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {!c.landlord_signed_at && (c.status === "sent" || c.status === "tenant_signed") && (
                  <Button size="sm" onClick={() => setSignId(c.id)}>
                    <Check className="w-4 h-4 mr-2" /> Sign
                  </Button>
                )}
                {c.storage_key && (
                  <Button variant="outline" size="sm" onClick={() => downloadContract(c.storage_key!, c.title + ".pdf")}>
                    <Download className="w-4 h-4 mr-2" /> Download
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
        {(!filtered || filtered.length === 0) && (
          <Card className="p-8 text-center">
            <FileSignature className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No contracts found.</p>
          </Card>
        )}
      </div>

      {/* Create Contract Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Contract</DialogTitle>
            <DialogDescription>Generate an AST template or upload a custom PDF to send for signature.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Tenancy *</Label>
              <Select value={selTenancy} onValueChange={setSelTenancy}>
                <SelectTrigger><SelectValue placeholder="Select tenancy" /></SelectTrigger>
                <SelectContent>
                  {tenancies?.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {(t.listings as any)?.title || (t.listings as any)?.address} — £{Number(t.rent_pcm).toLocaleString()}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contract Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Assured Shorthold Tenancy" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={contractType} onValueChange={setContractType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial">Initial</SelectItem>
                    <SelectItem value="renewal">Renewal</SelectItem>
                    <SelectItem value="addendum">Addendum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valid From</Label>
                <Input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} />
              </div>
              <div>
                <Label>Valid To</Label>
                <Input type="date" value={validTo} onChange={e => setValidTo(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant={leaseMode === "generate" ? "default" : "outline"} size="sm" onClick={() => setLeaseMode("generate")}>
                <FileSignature className="w-4 h-4 mr-1" /> Generate AST
              </Button>
              <Button variant={leaseMode === "upload" ? "default" : "outline"} size="sm" onClick={() => setLeaseMode("upload")}>
                <Upload className="w-4 h-4 mr-1" /> Upload PDF
              </Button>
            </div>

            {leaseMode === "generate" ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Lease Content</Label>
                  <Button variant="ghost" size="sm" onClick={() => setLeaseContent(generateAST())} disabled={!selTenancy}>
                    Auto-fill from tenancy
                  </Button>
                </div>
                <Textarea value={leaseContent} onChange={e => setLeaseContent(e.target.value)} rows={12} className="font-mono text-xs" placeholder="Select a tenancy and click 'Auto-fill' or write your own..." />
              </div>
            ) : (
              <div>
                <Label>Upload Contract PDF</Label>
                <Input type="file" accept=".pdf,.doc,.docx" onChange={e => setLeaseFile(e.target.files?.[0] || null)} />
                {leaseFile && <p className="text-xs text-muted-foreground mt-1">{leaseFile.name} ({(leaseFile.size / 1024).toFixed(0)} KB)</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!selTenancy || !title.trim() || createMutation.isPending || (leaseMode === "upload" && !leaseFile)}
            >
              {createMutation.isPending ? "Creating..." : "Create & Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Landlord E-Signature Dialog */}
      <Dialog open={!!signId} onOpenChange={open => { if (!open) { setSignId(null); setSigName(""); setSigConsent(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Contract</DialogTitle>
            <DialogDescription>Type your full legal name to countersign this contract.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Full Legal Name *</Label>
              <Input value={sigName} onChange={e => setSigName(e.target.value)} placeholder="Enter your full legal name" className="font-serif text-lg" />
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
                I confirm this electronic signature is legally binding and equivalent to a handwritten signature.
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignId(null)}>Cancel</Button>
            <Button onClick={() => signId && signMutation.mutate(signId)} disabled={!sigName.trim() || !sigConsent || signMutation.isPending}>
              {signMutation.isPending ? "Signing..." : "Sign & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
