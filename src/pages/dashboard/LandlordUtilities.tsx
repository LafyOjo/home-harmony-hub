import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Zap, Flame, Droplets, Wifi, Building, Receipt, Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/locale-format";


const utilityIcons: Record<string, typeof Zap> = {
  electricity: Zap, gas: Flame, water: Droplets, internet: Wifi,
  council_tax: Building, service_charge: Receipt, other: Receipt,
};
const utilityLabels: Record<string, string> = {
  electricity: "Electricity", gas: "Gas", water: "Water", internet: "Internet",
  council_tax: "Council Tax", service_charge: "Service Charge", other: "Other",
};
const utilityTypes = Object.keys(utilityLabels);

interface BillForm {
  utility_type: string;
  provider_name: string;
  amount: string;
  due_date: string;
  status: string;
}
const emptyForm: BillForm = { utility_type: "electricity", provider_name: "", amount: "", due_date: "", status: "upcoming" };

export default function LandlordUtilities() {
  const { user } = useAuth();
  
  const queryClient = useQueryClient();
  const [selectedTenancy, setSelectedTenancy] = useState<string | null>(null);
  const [formModal, setFormModal] = useState<{ open: boolean; editId: string | null }>({ open: false, editId: null });
  const [form, setForm] = useState<BillForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: tenancies } = useQuery({
    queryKey: ["landlord-tenancies", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenancies").select("id, status, listings(title, address)").eq("landlord_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: utilities, isLoading } = useQuery({
    queryKey: ["landlord-utilities", selectedTenancy],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("utilities").select("*").eq("tenancy_id", selectedTenancy!).order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTenancy,
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        tenancy_id: selectedTenancy!,
        utility_type: form.utility_type,
        provider_name: form.provider_name || null,
        amount: form.amount ? Number(form.amount) : null,
        due_date: form.due_date || null,
        status: form.status,
        responsibility: "tenant",
      };
      if (formModal.editId) {
        const { error } = await supabase.from("utilities").update(payload).eq("id", formModal.editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("utilities").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord-utilities"] });
      setFormModal({ open: false, editId: null });
      setForm(emptyForm);
      toast({ title: formModal.editId ? "Utility updated" : "Utility added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("utilities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord-utilities"] });
      setDeleteId(null);
      toast({ title: "Utility deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openEdit = (u: any) => {
    setForm({
      utility_type: u.utility_type,
      provider_name: u.provider_name || "",
      amount: u.amount?.toString() || "",
      due_date: u.due_date || "",
      status: u.status,
    });
    setFormModal({ open: true, editId: u.id });
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "paid": return "bg-success text-success-foreground";
      case "overdue": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold mb-1">Manage Utilities</h1>
        <p className="text-muted-foreground">Add and manage utility bills for your tenancies</p>
      </motion.div>

      {/* Tenancy selector */}
      <div className="max-w-sm">
        <Label>Select Tenancy</Label>
        <Select value={selectedTenancy || ""} onValueChange={setSelectedTenancy}>
          <SelectTrigger><SelectValue placeholder="Choose a tenancy" /></SelectTrigger>
          <SelectContent>
            {tenancies?.map((t: any) => (
              <SelectItem key={t.id} value={t.id}>
                {t.listings?.title || t.listings?.address || t.id.slice(0, 8)} ({t.status})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedTenancy ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Select a tenancy above to manage its utilities.</p>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
      ) : (
        <>
          <div className="flex justify-end">
            <Button onClick={() => { setForm(emptyForm); setFormModal({ open: true, editId: null }); }}>
              <Plus className="w-4 h-4 me-1" /> Add Utility Bill
            </Button>
          </div>

          <div className="space-y-3">
            {utilities?.map((u) => {
              const Icon = utilityIcons[u.utility_type] || Receipt;
              return (
                <Card key={u.id} className="p-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{utilityLabels[u.utility_type] || u.utility_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.provider_name && `${u.provider_name} · `}
                        {u.due_date ? `Due ${formatDate(u.due_date)}` : "No due date"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(Number(u.amount || 0))}</span>
                    <Badge className={statusColor(u.status)}>{u.status}</Badge>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(u)} aria-label="Edit">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(u.id)} aria-label="Delete">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              );
            })}
            {(!utilities || utilities.length === 0) && (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground text-sm">No utility records yet. Click "Add Utility Bill" to create one.</p>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={formModal.open} onOpenChange={(o) => !o && setFormModal({ open: false, editId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formModal.editId ? "Edit Utility Bill" : "Add Utility Bill"}</DialogTitle>
            <DialogDescription>Fill in the utility bill details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={form.utility_type} onValueChange={(v) => setForm((f) => ({ ...f, utility_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {utilityTypes.map((t) => <SelectItem key={t} value={t}>{utilityLabels[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="provider">Provider Name</Label>
              <Input id="provider" value={form.provider_name} onChange={(e) => setForm((f) => ({ ...f, provider_name: e.target.value }))} placeholder="e.g. British Gas" />
            </div>
            <div>
              <Label htmlFor="amount">Amount (£)</Label>
              <Input id="amount" type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <Label htmlFor="due-date">Due Date</Label>
              <Input id="due-date" type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormModal({ open: false, editId: null })}>Cancel</Button>
            <Button disabled={upsertMutation.isPending} onClick={() => upsertMutation.mutate()}>
              {upsertMutation.isPending ? "Saving…" : formModal.editId ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Utility Bill</DialogTitle>
            <DialogDescription>Are you sure? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
