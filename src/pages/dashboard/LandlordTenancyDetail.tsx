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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { PoundSterling, Zap, MessageSquare, Wrench, FileSignature, Plus, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
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

  // Add contract
  const [contractOpen, setContractOpen] = useState(false);
  const [contractTitle, setContractTitle] = useState("");
  const [contractType, setContractType] = useState("initial");
  const [contractFrom, setContractFrom] = useState("");
  const [contractTo, setContractTo] = useState("");

  const addContractMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("contracts").insert({
        tenancy_id: id!,
        title: contractTitle,
        contract_type: contractType,
        valid_from: contractFrom || null,
        valid_to: contractTo || null,
        status: "sent",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenancy-contracts"] });
      toast({ title: "Contract created & sent" });
      setContractOpen(false);
    },
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
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="payments"><PoundSterling className="w-4 h-4 mr-1" />Rent</TabsTrigger>
          <TabsTrigger value="utilities"><Zap className="w-4 h-4 mr-1" />Utilities</TabsTrigger>
          <TabsTrigger value="complaints"><MessageSquare className="w-4 h-4 mr-1" />Complaints</TabsTrigger>
          <TabsTrigger value="maintenance"><Wrench className="w-4 h-4 mr-1" />Repairs</TabsTrigger>
          <TabsTrigger value="contracts"><FileSignature className="w-4 h-4 mr-1" />Contracts</TabsTrigger>
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
            <Card key={m.id} className="p-4">
              <div className="flex justify-between mb-2">
                <div>
                  <p className="font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{m.category} · {m.priority} · {format(parseISO(m.created_at!), "d MMM")}</p>
                </div>
                <Badge className={m.status === "completed" ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>{m.status.replace("_"," ")}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{m.description}</p>
              {m.status !== "completed" && m.status !== "closed" && workers && workers.length > 0 && (
                <Select onValueChange={(wId) => assignWorkerMutation.mutate({ requestId: m.id, workerId: wId })}>
                  <SelectTrigger className="w-64"><SelectValue placeholder="Assign worker..." /></SelectTrigger>
                  <SelectContent>{workers.map(w => <SelectItem key={w.id} value={w.id}>{w.name} ({w.specialty})</SelectItem>)}</SelectContent>
                </Select>
              )}
              {m.maintenance_workers && <p className="text-sm mt-1">Assigned: <strong>{(m.maintenance_workers as any).name}</strong></p>}
            </Card>
          ))}
          {(!maintenance || maintenance.length === 0) && <p className="text-center text-sm text-muted-foreground py-4">No maintenance requests.</p>}
        </TabsContent>

        {/* CONTRACTS TAB */}
        <TabsContent value="contracts" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={contractOpen} onOpenChange={setContractOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Create Contract</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Contract</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <Input placeholder="Contract title" value={contractTitle} onChange={e => setContractTitle(e.target.value)} />
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
                  <Button className="w-full" onClick={() => addContractMutation.mutate()} disabled={!contractTitle}>Create & Send</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {contracts?.map(c => (
            <Card key={c.id} className="p-4">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{c.contract_type} · {c.valid_from && c.valid_to ? `${format(parseISO(c.valid_from), "d MMM yyyy")} – ${format(parseISO(c.valid_to), "d MMM yyyy")}` : "Dates TBC"}</p>
                </div>
                <Badge className={c.status === "fully_signed" ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>{c.status.replace("_"," ")}</Badge>
              </div>
            </Card>
          ))}
          {(!contracts || contracts.length === 0) && <p className="text-center text-sm text-muted-foreground py-4">No contracts.</p>}
        </TabsContent>
      </Tabs>
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
