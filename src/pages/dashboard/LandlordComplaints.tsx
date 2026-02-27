import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, Clock, UserCheck } from "lucide-react";
import { formatDate } from "@/lib/locale-format";
import { useState } from "react";

const categories = [
  { value: "maintenance", label: "Maintenance" },
  { value: "neighbour", label: "Neighbour Issues" },
  { value: "noise", label: "Noise" },
  { value: "safety", label: "Safety" },
  { value: "billing", label: "Billing" },
  { value: "pest", label: "Pest Control" },
  { value: "other", label: "Other" },
];

const statuses = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

type FilterStatus = "all" | "open" | "in_progress" | "resolved";

export default function LandlordComplaints() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [selected, setSelected] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [response, setResponse] = useState("");
  const [assignWorkerId, setAssignWorkerId] = useState<string>("");

  // Fetch all complaints across landlord's tenancies
  const { data: complaints, isLoading } = useQuery({
    queryKey: ["landlord-complaints", user?.id],
    queryFn: async () => {
      // Get landlord's tenancy IDs first
      const { data: tenancies, error: tErr } = await supabase
        .from("tenancies").select("id, listings(title, address)").eq("landlord_id", user!.id);
      if (tErr) throw tErr;
      if (!tenancies || tenancies.length === 0) return [];

      const ids = tenancies.map((t) => t.id);
      const { data, error } = await supabase
        .from("complaints").select("*").in("tenancy_id", ids).order("created_at", { ascending: false });
      if (error) throw error;

      // Attach tenancy info
      const tenancyMap = new Map(tenancies.map((t) => [t.id, t]));
      return (data || []).map((c) => ({ ...c, tenancy: tenancyMap.get(c.tenancy_id) }));
    },
    enabled: !!user,
  });

  // Fetch workers for assignment
  const { data: workers } = useQuery({
    queryKey: ["landlord-workers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_workers").select("id, name, specialty").eq("landlord_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const updates: Record<string, any> = {};
      if (newStatus && newStatus !== selected.status) {
        updates.status = newStatus;
        if (newStatus === "resolved" || newStatus === "closed") {
          updates.resolved_at = new Date().toISOString();
        }
      }
      if (response.trim()) {
        updates.response = response.trim();
      }
      if (Object.keys(updates).length === 0) throw new Error("No changes to save");
      const { error } = await supabase.from("complaints").update(updates).eq("id", selected.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord-complaints"] });
      toast({ title: "Complaint updated" });
      setSelected(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openDetail = (c: any) => {
    setSelected(c);
    setNewStatus(c.status);
    setResponse(c.response || "");
    setAssignWorkerId("");
  };

  const filtered = complaints?.filter((c) => {
    if (filter === "all") return true;
    if (filter === "resolved") return c.status === "resolved" || c.status === "closed";
    return c.status === filter;
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "resolved": case "closed": return "bg-success text-success-foreground";
      case "escalated": return "bg-destructive text-destructive-foreground";
      case "in_progress": return "bg-warning text-warning-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case "urgent": return "bg-destructive text-destructive-foreground";
      case "high": return "bg-warning text-warning-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold mb-1">Complaints</h1>
        <p className="text-muted-foreground">Review and manage tenant complaints across your properties</p>
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}</div>
      ) : (
        <>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterStatus)}>
            <TabsList>
              <TabsTrigger value="all">All ({complaints?.length || 0})</TabsTrigger>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-3">
            {filtered?.map((c: any) => (
              <Card
                key={c.id}
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => openDetail(c)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && openDetail(c)}
                aria-label={`View complaint: ${c.subject}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{c.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(c.tenancy as any)?.listings?.title || (c.tenancy as any)?.listings?.address || "Property"} · {categories.find((cat) => cat.value === c.category)?.label || c.category} · {formatDate(c.created_at!)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge className={statusColor(c.status)}>{c.status.replace("_", " ")}</Badge>
                    <Badge variant="outline" className={priorityColor(c.priority)}>{c.priority}</Badge>
                  </div>
                </div>
              </Card>
            ))}
            {(!filtered || filtered.length === 0) && (
              <Card className="p-8 text-center">
                <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No complaints found.</p>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Detail / Manage Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.subject}</DialogTitle>
                <DialogDescription>
                  {(selected.tenancy as any)?.listings?.title || "Property"} · Filed {formatDate(selected.created_at!)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Badge className={statusColor(selected.status)}>{selected.status.replace("_", " ")}</Badge>
                  <Badge variant="outline" className={priorityColor(selected.priority)}>{selected.priority}</Badge>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                  <p className="text-sm whitespace-pre-wrap">{selected.description}</p>
                </div>

                {/* Photos */}
                {selected.attachments && (selected.attachments as string[]).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Photos</p>
                    <div className="flex flex-wrap gap-2">
                      {(selected.attachments as string[]).map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-20 h-20 rounded-md overflow-hidden border border-border">
                          <img src={url} alt={`Attachment ${i + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="border-t border-border pt-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Timeline</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" /> Submitted: {formatDate(selected.created_at!)}
                  </div>
                  {selected.resolved_at && (
                    <div className="flex items-center gap-2 text-xs text-success">
                      <Clock className="w-3 h-3" /> Resolved: {formatDate(selected.resolved_at)}
                    </div>
                  )}
                </div>

                {/* Management actions */}
                <div className="border-t border-border pt-3 space-y-4">
                  <p className="text-xs font-medium text-muted-foreground">Manage</p>
                  <div>
                    <Label>Update Status</Label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statuses.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {workers && workers.length > 0 && (
                    <div>
                      <Label>Assign Worker (optional)</Label>
                      <Select value={assignWorkerId} onValueChange={setAssignWorkerId}>
                        <SelectTrigger><SelectValue placeholder="Select a worker" /></SelectTrigger>
                        <SelectContent>
                          {workers.map((w) => (
                            <SelectItem key={w.id} value={w.id}>
                              <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" /> {w.name}{w.specialty ? ` (${w.specialty})` : ""}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="ll-response">Response / Notes</Label>
                    <Textarea
                      id="ll-response"
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      placeholder="Add a response visible to the tenant…"
                      rows={3}
                      maxLength={2000}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
                <Button disabled={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
                  {updateMutation.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
