import { useAuth } from "@/contexts/AuthContext";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PoundSterling, Zap, MessageSquare, Wrench, FileSignature, Plus, Users, RefreshCw, ScrollText, ShieldCheck, Upload, Check } from "lucide-react";
import { format, parseISO, differenceInDays, addMonths } from "date-fns";
import { useState } from "react";

export default function LandlordTenancyDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tenancy } = useQuery({
    queryKey: ["tenancy-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenancies").select("*, listings(title, address, postcode)").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: payments } = useQuery({
    queryKey: ["tenancy-payments", id],
    queryFn: async () => {
      const { data } = await supabase.from("rent_payments").select("*").eq("tenancy_id", id!).order("due_date");
      return data;
    },
    enabled: !!id,
  });

  const { data: utilities } = useQuery({
    queryKey: ["tenancy-utilities", id],
    queryFn: async () => {
      const { data } = await supabase.from("utilities").select("*").eq("tenancy_id", id!).order("due_date");
      return data;
    },
    enabled: !!id,
  });

  const { data: complaints } = useQuery({
    queryKey: ["tenancy-complaints", id],
    queryFn: async () => {
      const { data } = await supabase.from("complaints").select("*").eq("tenancy_id", id!).order("created_at", { ascending: false });
      return data;
    },
    enabled: !!id,
  });

  const { data: maintenance } = useQuery({
    queryKey: ["tenancy-maintenance", id],
    queryFn: async () => {
      const { data } = await supabase.from("maintenance_requests").select("*, maintenance_workers(name, phone)").eq("tenancy_id", id!).order("created_at", { ascending: false });
      return data;
    },
    enabled: !!id,
  });

  const { data: contracts } = useQuery({
    queryKey: ["tenancy-contracts", id],
    queryFn: async () => {
      const { data } = await supabase.from("contracts").select("*").eq("tenancy_id", id!).order("created_at", { ascending: false });
      return data;
    },
    enabled: !!id,
  });

  const { data: workers } = useQuery({
    queryKey: ["landlord-workers", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("maintenance_workers").select("*").eq("landlord_id", user!.id);
      return data;
    },
    enabled: !!user,
  });

  // Payment recording
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");

  const addPaymentMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("rent_payments").insert({
        tenancy_id: id!,
        amount: Number(paymentAmount),
        due_date: paymentDueDate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenancy-payments"] });
      toast({ title: "Payment added" });
      setPaymentOpen(false);
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase.from("rent_payments").update({ status: "paid", paid_date: new Date().toISOString().split("T")[0], paid_amount: payments?.find(p => p.id === paymentId)?.amount }).eq("id", paymentId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenancy-payments"] }),
  });

  // Utility adding
  const [utilOpen, setUtilOpen] = useState(false);
  const [utilType, setUtilType] = useState("electricity");
  const [utilProvider, setUtilProvider] = useState("");
  const [utilAmount, setUtilAmount] = useState("");
  const [utilDue, setUtilDue] = useState("");

  const addUtilMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("utilities").insert({
        tenancy_id: id!,
        utility_type: utilType,
        provider_name: utilProvider || null,
        amount: Number(utilAmount),
        due_date: utilDue || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenancy-utilities"] });
      toast({ title: "Utility added" });
      setUtilOpen(false);
    },
  });

  // Complaint response
  const respondComplaintMutation = useMutation({
    mutationFn: async ({ complaintId, response, status }: { complaintId: string; response: string; status: string }) => {
      const { error } = await supabase.from("complaints").update({ response, status, ...(status === "resolved" ? { resolved_at: new Date().toISOString() } : {}) }).eq("id", complaintId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenancy-complaints"] }),
  });

  // Assign worker
  const assignWorkerMutation = useMutation({
    mutationFn: async ({ requestId, workerId }: { requestId: string; workerId: string }) => {
      const { error } = await supabase.from("maintenance_requests").update({ assigned_worker_id: workerId, status: "assigned" }).eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenancy-maintenance"] }),
  });

  // Update maintenance status / scheduling
  const updateMaintenanceMutation = useMutation({
    mutationFn: async ({ requestId, status, scheduled_date, scheduled_time_window, completion_notes }: { requestId: string; status: string; scheduled_date?: string; scheduled_time_window?: string; completion_notes?: string }) => {
      const update: any = { status };
      if (scheduled_date) update.scheduled_date = scheduled_date;
      if (scheduled_time_window) update.scheduled_time_window = scheduled_time_window;
      if (completion_notes) update.completion_notes = completion_notes;
      if (status === "completed") update.completed_at = new Date().toISOString();
      const { error } = await supabase.from("maintenance_requests").update(update).eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenancy-maintenance"] }),
  });

  // Add contract - enhanced with lease generation and upload
  const [contractOpen, setContractOpen] = useState(false);
  const [contractTitle, setContractTitle] = useState("");
  const [contractType, setContractType] = useState("initial");
  const [contractFrom, setContractFrom] = useState("");
  const [contractTo, setContractTo] = useState("");
  const [leaseContent, setLeaseContent] = useState("");
  const [leaseFile, setLeaseFile] = useState<File | null>(null);
  const [leaseMode, setLeaseMode] = useState<"generate" | "upload">("generate");

  // Landlord e-sign
  const [landlordSignId, setLandlordSignId] = useState<string | null>(null);
  const [landlordSigName, setLandlordSigName] = useState("");
  const [landlordSigConsent, setLandlordSigConsent] = useState(false);

  // Renewal proposal
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [renewalRent, setRenewalRent] = useState("");
  const [renewalStart, setRenewalStart] = useState("");
  const [renewalEnd, setRenewalEnd] = useState("");
  const [renewalNotes, setRenewalNotes] = useState("");

  // Termination notice
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeType, setNoticeType] = useState("section_21");
  const [noticeEffective, setNoticeEffective] = useState("");
  const [noticeReason, setNoticeReason] = useState("");

  const generateLeaseText = () => {
    if (!tenancy) return "";
    const listing = tenancy.listings as any;
    return `ASSURED SHORTHOLD TENANCY AGREEMENT

This tenancy agreement is made on ${format(new Date(), "d MMMM yyyy")}

PROPERTY: ${listing?.title || ""}
ADDRESS: ${listing?.address || ""}, ${listing?.postcode || ""}

LANDLORD: [Landlord Name]
TENANT: [Tenant Name]

TERM: ${contractFrom ? format(parseISO(contractFrom), "d MMMM yyyy") : "[Start Date]"} to ${contractTo ? format(parseISO(contractTo), "d MMMM yyyy") : "[End Date]"}

RENT: £${Number(tenancy.rent_pcm).toLocaleString()} per calendar month, payable in advance on the first day of each month.

DEPOSIT: £${tenancy.deposit ? Number(tenancy.deposit).toLocaleString() : "N/A"}, held in accordance with the Tenancy Deposit Scheme.

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

  const addContractMutation = useMutation({
    mutationFn: async () => {
      let storageKey: string | null = null;
      let content = leaseContent;

      if (leaseMode === "upload" && leaseFile) {
        const key = `${user!.id}/contracts/${Date.now()}-${leaseFile.name}`;
        const { error: upErr } = await supabase.storage.from("documents").upload(key, leaseFile);
        if (upErr) throw upErr;
        storageKey = key;
      } else if (leaseMode === "generate" && !content) {
        content = generateLeaseText();
      }

      const { error } = await supabase.from("contracts").insert({
        tenancy_id: id!,
        title: contractTitle,
        contract_type: contractType,
        valid_from: contractFrom || null,
        valid_to: contractTo || null,
        status: "sent",
        storage_key: storageKey,
        lease_content: content || null,
        is_uploaded: leaseMode === "upload",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenancy-contracts"] });
      toast({ title: "Contract created & sent to tenant" });
      setContractOpen(false);
      setContractTitle(""); setLeaseContent(""); setLeaseFile(null);
    },
  });

  const landlordSignMutation = useMutation({
    mutationFn: async (contractId: string) => {
      const contract = contracts?.find(c => c.id === contractId);
      const newStatus = contract?.tenant_signed_at ? "fully_signed" : "landlord_signed";
      const { error } = await supabase.from("contracts").update({
        landlord_signed_at: new Date().toISOString(),
        landlord_signature_name: landlordSigName,
        status: newStatus,
      } as any).eq("id", contractId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenancy-contracts"] });
      toast({ title: "Contract signed" });
      setLandlordSignId(null); setLandlordSigName(""); setLandlordSigConsent(false);
    },
  });

  // Renewals
  const { data: renewals } = useQuery({
    queryKey: ["tenancy-renewals", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("renewal_proposals").select("*").eq("tenancy_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const addRenewalMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("renewal_proposals").insert({
        tenancy_id: id!,
        proposed_by: user!.id,
        new_rent_pcm: parseFloat(renewalRent),
        new_start_date: renewalStart,
        new_end_date: renewalEnd,
        notes: renewalNotes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenancy-renewals"] });
      toast({ title: "Renewal proposal sent" });
      setRenewalOpen(false); setRenewalRent(""); setRenewalNotes("");
    },
  });

  // Termination notices
  const { data: notices } = useQuery({
    queryKey: ["tenancy-notices", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("termination_notices").select("*").eq("tenancy_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const addNoticeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("termination_notices").insert({
        tenancy_id: id!,
        issued_by: user!.id,
        notice_type: noticeType,
        effective_date: noticeEffective,
        reason: noticeReason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenancy-notices"] });
      toast({ title: "Notice issued" });
      setNoticeOpen(false); setNoticeReason("");
    },
  });

  // Policy consents view
  const { data: policyConsents } = useQuery({
    queryKey: ["tenancy-policy-consents", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("policy_consents").select("*").eq("tenancy_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  if (!tenancy) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  const totalPaid = payments?.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.paid_amount || p.amount), 0) ?? 0;
  const totalDue = payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;

  return (
    <div className="max-w-5xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold mb-1">{(tenancy.listings as any)?.title}</h1>
        <p className="text-muted-foreground">{(tenancy.listings as any)?.address} · £{Number(tenancy.rent_pcm).toLocaleString()}/mo</p>
      </motion.div>

      <Tabs defaultValue="payments">
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="payments"><PoundSterling className="w-4 h-4 mr-1 hidden sm:block" />Rent</TabsTrigger>
          <TabsTrigger value="utilities"><Zap className="w-4 h-4 mr-1 hidden sm:block" />Utilities</TabsTrigger>
          <TabsTrigger value="complaints"><MessageSquare className="w-4 h-4 mr-1 hidden sm:block" />Complaints</TabsTrigger>
          <TabsTrigger value="maintenance"><Wrench className="w-4 h-4 mr-1 hidden sm:block" />Repairs</TabsTrigger>
          <TabsTrigger value="contracts"><FileSignature className="w-4 h-4 mr-1 hidden sm:block" />Leases</TabsTrigger>
          <TabsTrigger value="renewals"><RefreshCw className="w-4 h-4 mr-1 hidden sm:block" />Renewals</TabsTrigger>
          <TabsTrigger value="notices"><ScrollText className="w-4 h-4 mr-1 hidden sm:block" />Notices</TabsTrigger>
        </TabsList>

        {/* PAYMENTS TAB */}
        <TabsContent value="payments" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <Card className="p-3"><p className="text-xs text-muted-foreground">Collected</p><p className="font-bold text-success">£{totalPaid.toLocaleString()}</p></Card>
              <Card className="p-3"><p className="text-xs text-muted-foreground">Total Due</p><p className="font-bold">£{totalDue.toLocaleString()}</p></Card>
            </div>
            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Payment</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Payment Record</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <Input type="date" value={paymentDueDate} onChange={e => setPaymentDueDate(e.target.value)} />
                  <Input type="number" placeholder="Amount (£)" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                  <Button className="w-full" onClick={() => addPaymentMutation.mutate()} disabled={!paymentDueDate || !paymentAmount}>Add</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {payments?.map(p => (
            <Card key={p.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{format(parseISO(p.due_date), "d MMM yyyy")}</p>
                <p className="text-xs text-muted-foreground">£{Number(p.amount).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={p.status === "paid" ? "bg-success text-success-foreground" : p.status === "overdue" ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"}>{p.status}</Badge>
                {p.status !== "paid" && <Button size="sm" variant="outline" onClick={() => markPaidMutation.mutate(p.id)}>Mark Paid</Button>}
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* UTILITIES TAB */}
        <TabsContent value="utilities" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={utilOpen} onOpenChange={setUtilOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Utility</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Utility Charge</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <Select value={utilType} onValueChange={setUtilType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["electricity","gas","water","internet","council_tax","service_charge","other"].map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace("_"," ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Provider name" value={utilProvider} onChange={e => setUtilProvider(e.target.value)} />
                  <Input type="number" placeholder="Amount (£)" value={utilAmount} onChange={e => setUtilAmount(e.target.value)} />
                  <Input type="date" value={utilDue} onChange={e => setUtilDue(e.target.value)} />
                  <Button className="w-full" onClick={() => addUtilMutation.mutate()} disabled={!utilAmount}>Add</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {utilities?.map(u => (
            <Card key={u.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium capitalize">{u.utility_type.replace("_"," ")}</p>
                <p className="text-xs text-muted-foreground">{u.provider_name} {u.due_date && `· Due ${format(parseISO(u.due_date), "d MMM yyyy")}`}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">£{Number(u.amount || 0).toLocaleString()}</span>
                <Badge className={u.status === "paid" ? "bg-success text-success-foreground" : u.status === "overdue" ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"}>{u.status}</Badge>
              </div>
            </Card>
          ))}
          {(!utilities || utilities.length === 0) && <p className="text-center text-sm text-muted-foreground py-4">No utilities configured.</p>}
        </TabsContent>

        {/* COMPLAINTS TAB */}
        <TabsContent value="complaints" className="space-y-4 mt-4">
          {complaints?.map(c => (
            <ComplaintCard key={c.id} complaint={c} onRespond={(response, status) => respondComplaintMutation.mutate({ complaintId: c.id, response, status })} />
          ))}
          {(!complaints || complaints.length === 0) && <p className="text-center text-sm text-muted-foreground py-4">No complaints.</p>}
        </TabsContent>

        {/* MAINTENANCE TAB */}
        <TabsContent value="maintenance" className="space-y-4 mt-4">
          {maintenance?.map(m => (
            <MaintenanceCard
              key={m.id}
              request={m}
              workers={workers || []}
              onAssign={(workerId) => assignWorkerMutation.mutate({ requestId: m.id, workerId })}
              onUpdateStatus={(status, extras) => updateMaintenanceMutation.mutate({ requestId: m.id, status, ...extras })}
            />
          ))}
          {(!maintenance || maintenance.length === 0) && <p className="text-center text-sm text-muted-foreground py-4">No maintenance requests.</p>}
        </TabsContent>

        {/* CONTRACTS / LEASES TAB */}
        <TabsContent value="contracts" className="space-y-4 mt-4">
          <div className="flex justify-end gap-2">
            <Dialog open={contractOpen} onOpenChange={o => { setContractOpen(o); if (o) setLeaseContent(generateLeaseText()); }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Create Lease</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Lease Agreement</DialogTitle>
                  <DialogDescription>Generate from template or upload your own document.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <Input placeholder="Lease title" value={contractTitle} onChange={e => setContractTitle(e.target.value)} />
                  <Select value={contractType} onValueChange={setContractType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["initial","renewal","amendment","termination"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="date" placeholder="From" value={contractFrom} onChange={e => setContractFrom(e.target.value)} />
                    <Input type="date" placeholder="To" value={contractTo} onChange={e => setContractTo(e.target.value)} />
                  </div>

                  {/* Mode toggle */}
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant={leaseMode === "generate" ? "default" : "outline"} onClick={() => { setLeaseMode("generate"); setLeaseContent(generateLeaseText()); }}>
                      Generate from Template
                    </Button>
                    <Button type="button" size="sm" variant={leaseMode === "upload" ? "default" : "outline"} onClick={() => setLeaseMode("upload")}>
                      <Upload className="w-4 h-4 mr-1" /> Upload Document
                    </Button>
                  </div>

                  {leaseMode === "generate" ? (
                    <Textarea value={leaseContent} onChange={e => setLeaseContent(e.target.value)} rows={14} className="font-mono text-xs" />
                  ) : (
                    <label className="cursor-pointer">
                      <div className="border border-dashed border-border rounded-lg p-4 text-center text-sm text-muted-foreground hover:border-primary/40">
                        {leaseFile ? leaseFile.name : "Click to upload lease document (PDF, DOCX)"}
                      </div>
                      <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={e => setLeaseFile(e.target.files?.[0] || null)} />
                    </label>
                  )}

                  <Button className="w-full" onClick={() => addContractMutation.mutate()} disabled={!contractTitle || addContractMutation.isPending}>
                    {addContractMutation.isPending ? "Creating..." : "Create & Send to Tenant"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {contracts?.map(c => (
            <Card key={c.id} className="p-4">
              <div className="flex justify-between mb-2">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{c.contract_type} · {c.valid_from && c.valid_to ? `${format(parseISO(c.valid_from), "d MMM yyyy")} – ${format(parseISO(c.valid_to), "d MMM yyyy")}` : "Dates TBC"}</p>
                </div>
                <Badge className={c.status === "fully_signed" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : c.status === "tenant_signed" || c.status === "landlord_signed" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}>
                  {c.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className={c.landlord_signed_at ? "text-emerald-600" : ""}>{c.landlord_signed_at ? `✓ You signed` : "Awaiting your signature"}</span>
                <span className={c.tenant_signed_at ? "text-emerald-600" : ""}>{c.tenant_signed_at ? `✓ Tenant signed` : "Awaiting tenant"}</span>
              </div>
              {!c.landlord_signed_at && (c.status === "sent" || c.status === "tenant_signed") && (
                <Button size="sm" className="mt-2" onClick={() => setLandlordSignId(c.id)}>
                  <Check className="w-4 h-4 mr-1" /> Sign as Landlord
                </Button>
              )}
            </Card>
          ))}
          {(!contracts || contracts.length === 0) && <p className="text-center text-sm text-muted-foreground py-4">No leases.</p>}
        </TabsContent>

        {/* RENEWALS TAB */}
        <TabsContent value="renewals" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={renewalOpen} onOpenChange={setRenewalOpen}>
              <DialogTrigger asChild><Button size="sm"><RefreshCw className="w-4 h-4 mr-1" />Propose Renewal</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Propose Renewal</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <div>
                    <Label>New Monthly Rent (£)</Label>
                    <Input type="number" value={renewalRent} onChange={e => setRenewalRent(e.target.value)} placeholder={String(tenancy?.rent_pcm)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>New Start</Label><Input type="date" value={renewalStart} onChange={e => setRenewalStart(e.target.value)} /></div>
                    <div><Label>New End</Label><Input type="date" value={renewalEnd} onChange={e => setRenewalEnd(e.target.value)} /></div>
                  </div>
                  <div>
                    <Label>Notes (optional)</Label>
                    <Textarea value={renewalNotes} onChange={e => setRenewalNotes(e.target.value)} rows={2} placeholder="Any changes or notes for the tenant..." />
                  </div>
                  <Button className="w-full" onClick={() => addRenewalMutation.mutate()} disabled={!renewalRent || !renewalStart || !renewalEnd}>
                    Send Proposal
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {(renewals as any[])?.map((r: any) => (
            <Card key={r.id} className="p-4">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">£{r.new_rent_pcm}/mo · {format(parseISO(r.new_start_date), "d MMM yyyy")} – {format(parseISO(r.new_end_date), "d MMM yyyy")}</p>
                  {r.notes && <p className="text-sm text-muted-foreground mt-1">{r.notes}</p>}
                </div>
                <Badge className={r.status === "accepted" ? "bg-emerald-500/15 text-emerald-600" : r.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-600"}>
                  {r.status}
                </Badge>
              </div>
            </Card>
          ))}
          {(!renewals || (renewals as any[]).length === 0) && <p className="text-center text-sm text-muted-foreground py-4">No renewal proposals.</p>}
        </TabsContent>

        {/* NOTICES TAB */}
        <TabsContent value="notices" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={noticeOpen} onOpenChange={setNoticeOpen}>
              <DialogTrigger asChild><Button size="sm" variant="destructive"><ScrollText className="w-4 h-4 mr-1" />Issue Notice</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Issue Termination Notice</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <div>
                    <Label>Notice Type</Label>
                    <Select value={noticeType} onValueChange={setNoticeType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="section_21">Section 21 (No-fault)</SelectItem>
                        <SelectItem value="section_8">Section 8 (Grounds-based)</SelectItem>
                        <SelectItem value="mutual">Mutual Agreement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Effective Date</Label>
                    <Input type="date" value={noticeEffective} onChange={e => setNoticeEffective(e.target.value)} />
                  </div>
                  <div>
                    <Label>Reason (optional)</Label>
                    <Textarea value={noticeReason} onChange={e => setNoticeReason(e.target.value)} rows={2} />
                  </div>
                  <Button className="w-full" variant="destructive" onClick={() => addNoticeMutation.mutate()} disabled={!noticeEffective}>
                    Issue Notice
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {(notices as any[])?.map((n: any) => (
            <Card key={n.id} className="p-4 border-l-4 border-l-destructive">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium capitalize">{n.notice_type.replace(/_/g, " ")} Notice</p>
                  <p className="text-sm text-muted-foreground">Effective: {format(parseISO(n.effective_date), "d MMM yyyy")}</p>
                  {n.reason && <p className="text-sm mt-1">{n.reason}</p>}
                </div>
                <Badge className={n.status === "acknowledged" ? "bg-muted text-muted-foreground" : "bg-destructive/15 text-destructive"}>
                  {n.status}
                </Badge>
              </div>
            </Card>
          ))}
          {(!notices || (notices as any[]).length === 0) && <p className="text-center text-sm text-muted-foreground py-4">No notices issued.</p>}

          {/* Policy Consents Overview */}
          <div className="pt-4 border-t border-border">
            <h3 className="font-display text-md font-semibold mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Tenant Policy Consents</h3>
            {(policyConsents as any[])?.length > 0 ? (
              <div className="space-y-2">
                {(policyConsents as any[]).map((pc: any) => (
                  <div key={pc.id} className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
                    <span className="text-sm capitalize">{pc.policy_type.replace(/_/g, " ")}</span>
                    <Badge className={pc.consented ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}>
                      {pc.consented ? `Consented ${pc.consented_at ? format(parseISO(pc.consented_at), "d MMM") : ""}` : "Pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No policy consents recorded yet.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Landlord E-Signature Dialog */}
      <Dialog open={!!landlordSignId} onOpenChange={o => { if (!o) { setLandlordSignId(null); setLandlordSigName(""); setLandlordSigConsent(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign as Landlord</DialogTitle>
            <DialogDescription>Type your full legal name to electronically sign this contract.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Full Legal Name *</Label>
              <Input value={landlordSigName} onChange={e => setLandlordSigName(e.target.value)} placeholder="Enter your full legal name" className="font-serif text-lg" />
              {landlordSigName && (
                <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Signature Preview</p>
                  <p className="font-serif text-2xl italic text-foreground">{landlordSigName}</p>
                </div>
              )}
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={landlordSigConsent} onCheckedChange={v => setLandlordSigConsent(v === true)} className="mt-0.5" />
              <span className="text-sm text-muted-foreground">
                I confirm this electronic signature is legally binding and equivalent to a handwritten signature.
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLandlordSignId(null)}>Cancel</Button>
            <Button onClick={() => landlordSignId && landlordSignMutation.mutate(landlordSignId)} disabled={!landlordSigName.trim() || !landlordSigConsent || landlordSignMutation.isPending}>
              {landlordSignMutation.isPending ? "Signing..." : "Sign & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ComplaintCard({ complaint, onRespond }: { complaint: any; onRespond: (response: string, status: string) => void }) {
  const [response, setResponse] = useState("");
  const [showResponse, setShowResponse] = useState(false);

  return (
    <Card className="p-4">
      <div className="flex justify-between mb-2">
        <div>
          <p className="font-medium">{complaint.subject}</p>
          <p className="text-xs text-muted-foreground capitalize">{complaint.category} · {complaint.priority} · {format(parseISO(complaint.created_at), "d MMM")}</p>
        </div>
        <Badge>{complaint.status.replace("_", " ")}</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-2">{complaint.description}</p>
      {complaint.response && <div className="p-2 bg-muted rounded text-sm"><strong>Response:</strong> {complaint.response}</div>}
      {complaint.status !== "resolved" && complaint.status !== "closed" && (
        <>
          {showResponse ? (
            <div className="mt-2 space-y-2">
              <Textarea value={response} onChange={e => setResponse(e.target.value)} placeholder="Your response..." rows={2} />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { onRespond(response, "resolved"); setShowResponse(false); }}>Resolve</Button>
                <Button size="sm" variant="outline" onClick={() => { onRespond(response, "in_progress"); setShowResponse(false); }}>In Progress</Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setShowResponse(true)}>Respond</Button>
          )}
        </>
      )}
    </Card>
  );
}

function MaintenanceCard({ request, workers, onAssign, onUpdateStatus }: {
  request: any;
  workers: any[];
  onAssign: (workerId: string) => void;
  onUpdateStatus: (status: string, extras?: { scheduled_date?: string; scheduled_time_window?: string; completion_notes?: string }) => void;
}) {
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedDate, setSchedDate] = useState(request.scheduled_date || "");
  const [schedWindow, setSchedWindow] = useState(request.scheduled_time_window || "");
  const [showComplete, setShowComplete] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");

  const photos = request.photos as string[] | null;
  const prefSlots = (request as any).preferred_time_slots as { slots?: string[]; preferred_date?: string } | null;
  const isOpen = request.status !== "completed" && request.status !== "closed";

  return (
    <Card className="p-4">
      <div className="flex justify-between mb-2">
        <div>
          <p className="font-medium">{request.title}</p>
          <p className="text-xs text-muted-foreground capitalize">{request.category} · {request.priority} · {format(parseISO(request.created_at!), "d MMM")}</p>
        </div>
        <Badge className={request.status === "completed" ? "bg-success text-success-foreground" : request.status === "in_progress" || request.status === "scheduled" ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground"}>
          {request.status.replace("_", " ")}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-2">{request.description}</p>

      {/* Photos */}
      {photos && photos.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto">
          {photos.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
              <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-border flex-shrink-0" />
            </a>
          ))}
        </div>
      )}

      {/* Tenant preferred times */}
      {prefSlots && (prefSlots.slots?.length || prefSlots.preferred_date) && (
        <div className="bg-muted/50 p-2 rounded-lg mb-3">
          <p className="text-xs font-medium mb-1">Tenant Availability</p>
          <div className="flex flex-wrap gap-1">
            {prefSlots.slots?.map(s => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
          </div>
          {prefSlots.preferred_date && <p className="text-xs text-muted-foreground mt-1">Preferred: {format(parseISO(prefSlots.preferred_date), "d MMM yyyy")}</p>}
        </div>
      )}

      {/* Assigned worker */}
      {request.maintenance_workers && <p className="text-sm mb-2">Assigned: <strong>{(request.maintenance_workers as any).name}</strong> {(request.maintenance_workers as any).phone && `· ${(request.maintenance_workers as any).phone}`}</p>}

      {/* Scheduled info */}
      {request.scheduled_date && (
        <p className="text-sm text-muted-foreground mb-2">
          📅 Scheduled: {format(parseISO(request.scheduled_date), "d MMM yyyy")} {request.scheduled_time_window && `(${request.scheduled_time_window})`}
        </p>
      )}

      {/* Completion notes */}
      {request.completion_notes && (
        <div className="p-2 bg-success/5 rounded-lg text-sm mb-2">
          <span className="font-medium">Completed: </span>{request.completion_notes}
        </div>
      )}

      {/* Actions */}
      {isOpen && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
          {/* Assign worker */}
          {workers.length > 0 && (
            <Select onValueChange={onAssign} value={request.assigned_worker_id || undefined}>
              <SelectTrigger className="w-48 h-8 text-xs"><SelectValue placeholder="Assign worker..." /></SelectTrigger>
              <SelectContent>{workers.map(w => <SelectItem key={w.id} value={w.id}>{w.name} ({w.specialty})</SelectItem>)}</SelectContent>
            </Select>
          )}

          {/* Schedule */}
          {!showSchedule ? (
            <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setShowSchedule(true)}>Schedule</Button>
          ) : (
            <div className="flex items-center gap-2 w-full">
              <Input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} className="h-8 text-xs w-36" />
              <Select value={schedWindow} onValueChange={setSchedWindow}>
                <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="Time window" /></SelectTrigger>
                <SelectContent>
                  {["morning (8-12)", "afternoon (12-5)", "evening (5-8)"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8 text-xs" disabled={!schedDate} onClick={() => {
                onUpdateStatus("scheduled", { scheduled_date: schedDate, scheduled_time_window: schedWindow });
                setShowSchedule(false);
              }}>Confirm</Button>
            </div>
          )}

          {/* Status updates */}
          <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => onUpdateStatus("in_progress")}>In Progress</Button>
          {!showComplete ? (
            <Button size="sm" variant="default" className="text-xs h-8" onClick={() => setShowComplete(true)}>Complete</Button>
          ) : (
            <div className="flex items-center gap-2 w-full mt-2">
              <Input value={completionNotes} onChange={e => setCompletionNotes(e.target.value)} placeholder="Completion notes..." className="h-8 text-xs flex-1" />
              <Button size="sm" className="h-8 text-xs" onClick={() => {
                onUpdateStatus("completed", { completion_notes: completionNotes });
                setShowComplete(false);
              }}>Done</Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
