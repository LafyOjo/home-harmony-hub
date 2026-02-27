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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Zap, Flame, Droplets, Wifi, Building, Receipt, Upload, Gauge } from "lucide-react";
import { format, parseISO } from "date-fns";
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

type FilterStatus = "all" | "paid" | "unpaid";

export default function TenantUtilities() {
  const { user } = useAuth();
  
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [payModal, setPayModal] = useState<{ open: boolean; utility: any | null }>({ open: false, utility: null });
  const [meterModal, setMeterModal] = useState<{ open: boolean; utility: any | null }>({ open: false, utility: null });
  const [meterValue, setMeterValue] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: tenancy } = useQuery({
    queryKey: ["tenant-tenancy-active", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenancies").select("id").eq("tenant_id", user!.id).eq("status", "active").maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: utilities, isLoading } = useQuery({
    queryKey: ["tenant-utilities", tenancy?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("utilities").select("*").eq("tenancy_id", tenancy!.id).order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!tenancy,
  });

  const markPaidMutation = useMutation({
    mutationFn: async (utilityId: string) => {
      const { error } = await supabase
        .from("utilities").update({ status: "paid" } as any).eq("id", utilityId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-utilities"] });
      setPayModal({ open: false, utility: null });
      toast({ title: "Payment recorded", description: "Utility bill marked as paid." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const meterMutation = useMutation({
    mutationFn: async ({ id, reading }: { id: string; reading: number }) => {
      const { error } = await supabase
        .from("utilities").update({ meter_reading: reading } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-utilities"] });
      setMeterModal({ open: false, utility: null });
      setMeterValue("");
      toast({ title: "Meter reading saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleReceiptUpload = async (utilityId: string, file: File) => {
    setUploading(true);
    try {
      const key = `receipts/${user!.id}/${utilityId}/${file.name}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(key, file, { upsert: true });
      if (upErr) throw upErr;
      const { error } = await supabase
        .from("utilities").update({ receipt_storage_key: key } as any).eq("id", utilityId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["tenant-utilities"] });
      toast({ title: "Receipt uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const filtered = utilities?.filter((u) => {
    if (filter === "paid") return u.status === "paid";
    if (filter === "unpaid") return u.status !== "paid";
    return true;
  });

  const totalDue = utilities?.filter((u) => u.status !== "paid").reduce((s, u) => s + Number(u.amount || 0), 0) ?? 0;
  const totalPaid = utilities?.filter((u) => u.status === "paid").reduce((s, u) => s + Number(u.amount || 0), 0) ?? 0;

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
        <h1 className="font-display text-3xl font-bold mb-1">Utilities</h1>
        <p className="text-muted-foreground">Track your utility bills and payments</p>
      </motion.div>

      {!tenancy ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No active tenancy. Utilities will appear once you have an active tenancy.</p>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Outstanding</p>
              <p className="font-display text-2xl font-bold text-destructive">{formatCurrency(totalDue)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
              <p className="font-display text-2xl font-bold text-success">{formatCurrency(totalPaid)}</p>
            </Card>
          </div>

          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterStatus)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unpaid">Unpaid / Overdue</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-3">
            {filtered?.map((u) => {
              const Icon = utilityIcons[u.utility_type] || Receipt;
              return (
                <Card key={u.id} className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
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
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{formatCurrency(Number(u.amount || 0))}</span>
                      <Badge className={statusColor(u.status)}>{u.status}</Badge>
                    </div>
                  </div>
                  {/* Actions row */}
                  <div className="flex flex-wrap gap-2 mt-3 ps-13">
                    {u.status !== "paid" && (
                      <Button size="sm" onClick={() => setPayModal({ open: true, utility: u })}>
                        Pay Now
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => { setMeterModal({ open: true, utility: u }); setMeterValue((u as any).meter_reading?.toString() || ""); }}>
                      <Gauge className="w-4 h-4 me-1" /> Meter Reading
                    </Button>
                    <label className="inline-flex">
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/*,application/pdf"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleReceiptUpload(u.id, file);
                        }}
                      />
                      <Button size="sm" variant="outline" asChild>
                        <span>
                          <Upload className="w-4 h-4 me-1" /> {(u as any).receipt_storage_key ? "Replace Receipt" : "Upload Receipt"}
                        </span>
                      </Button>
                    </label>
                  </div>
                </Card>
              );
            })}
            {(!filtered || filtered.length === 0) && (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground text-sm">No utility records found.</p>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Pay Modal */}
      <Dialog open={payModal.open} onOpenChange={(o) => !o && setPayModal({ open: false, utility: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              Mark <strong>{utilityLabels[payModal.utility?.utility_type] || ""}</strong> ({formatCurrency(Number(payModal.utility?.amount || 0))}) as paid.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will update the bill status to paid. You can also upload a receipt afterwards.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModal({ open: false, utility: null })}>Cancel</Button>
            <Button disabled={markPaidMutation.isPending} onClick={() => payModal.utility && markPaidMutation.mutate(payModal.utility.id)}>
              {markPaidMutation.isPending ? "Saving…" : "Mark as Paid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meter Reading Modal */}
      <Dialog open={meterModal.open} onOpenChange={(o) => !o && setMeterModal({ open: false, utility: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Meter Reading</DialogTitle>
            <DialogDescription>Enter the current meter reading for {utilityLabels[meterModal.utility?.utility_type] || ""}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="meter-value">Reading</Label>
            <Input id="meter-value" type="number" value={meterValue} onChange={(e) => setMeterValue(e.target.value)} placeholder="e.g. 12345" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMeterModal({ open: false, utility: null })}>Cancel</Button>
            <Button
              disabled={meterMutation.isPending || !meterValue}
              onClick={() => meterModal.utility && meterMutation.mutate({ id: meterModal.utility.id, reading: Number(meterValue) })}
            >
              {meterMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
