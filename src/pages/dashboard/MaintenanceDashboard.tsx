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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { Wrench, User, CalendarIcon, Clock, ImageIcon, Phone, Mail } from "lucide-react";
import { formatDate } from "@/lib/locale-format";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";

const statusOptions = [
  { value: "reported", label: "Reported" },
  { value: "assigned", label: "Assigned" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
];

const timeWindows = ["Morning (8am–12pm)", "Afternoon (12pm–5pm)", "Evening (5pm–8pm)"];

type FilterStatus = "all" | "reported" | "scheduled" | "in_progress" | "completed";

export default function MaintenanceDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [selected, setSelected] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [timeWindow, setTimeWindow] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [assignWorkerId, setAssignWorkerId] = useState("");

  // Fetch all maintenance requests across landlord's tenancies
  const { data: requests, isLoading } = useQuery({
    queryKey: ["landlord-maintenance", user?.id],
    queryFn: async () => {
      const { data: tenancies, error: tErr } = await supabase
        .from("tenancies").select("id, listings(title, address), tenant_id").eq("landlord_id", user!.id);
      if (tErr) throw tErr;
      if (!tenancies || tenancies.length === 0) return [];

      const ids = tenancies.map((t) => t.id);
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("*, maintenance_workers(id, name, phone, specialty, email)")
        .in("tenancy_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const tenancyMap = new Map(tenancies.map((t) => [t.id, t]));
      return (data || []).map((r) => ({ ...r, tenancy: tenancyMap.get(r.tenancy_id) }));
    },
    enabled: !!user,
  });

  // Fetch workers
  const { data: workers } = useQuery({
    queryKey: ["landlord-workers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_workers").select("id, name, specialty, phone, email").eq("landlord_id", user!.id);
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
        if (newStatus === "completed") updates.completed_at = new Date().toISOString();
      }
      if (scheduledDate) updates.scheduled_date = format(scheduledDate, "yyyy-MM-dd");
      if (timeWindow) updates.scheduled_time_window = timeWindow;
      if (completionNotes.trim()) updates.completion_notes = completionNotes.trim();
      if (assignWorkerId) updates.assigned_worker_id = assignWorkerId;

      if (Object.keys(updates).length === 0) throw new Error("No changes to save");

      // If assigning a worker, also set status to assigned if currently reported
      if (assignWorkerId && selected.status === "reported" && !updates.status) {
        updates.status = "assigned";
      }

      const { error } = await supabase.from("maintenance_requests").update(updates).eq("id", selected.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord-maintenance"] });
      toast({ title: "Request updated", description: "The tenant will be notified of the change." });
      setSelected(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openDetail = (r: any) => {
    setSelected(r);
    setNewStatus(r.status);
    setScheduledDate(r.scheduled_date ? new Date(r.scheduled_date) : undefined);
    setTimeWindow(r.scheduled_time_window || "");
    setCompletionNotes(r.completion_notes || "");
    setAssignWorkerId(r.assigned_worker_id || "");
  };

  const filtered = requests?.filter((r) => {
    if (filter === "all") return true;
    if (filter === "completed") return r.status === "completed" || r.status === "closed";
    return r.status === filter;
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "completed": case "closed": return "bg-success text-success-foreground";
      case "in_progress": case "scheduled": return "bg-warning text-warning-foreground";
      case "assigned": return "bg-primary text-primary-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case "emergency": return "bg-destructive text-destructive-foreground";
      case "high": return "bg-warning text-warning-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold mb-1">Maintenance Dashboard</h1>
        <p className="text-muted-foreground">Manage and schedule maintenance requests across your properties</p>
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid sm:grid-cols-4 gap-3">
            {[
              { label: "Open", count: requests?.filter((r) => r.status === "reported").length || 0, color: "text-foreground" },
              { label: "Scheduled", count: requests?.filter((r) => r.status === "scheduled" || r.status === "assigned").length || 0, color: "text-warning" },
              { label: "In Progress", count: requests?.filter((r) => r.status === "in_progress").length || 0, color: "text-primary" },
              { label: "Completed", count: requests?.filter((r) => r.status === "completed" || r.status === "closed").length || 0, color: "text-success" },
            ].map((s) => (
              <Card key={s.label} className="p-3 text-center">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={cn("font-display text-2xl font-bold", s.color)}>{s.count}</p>
              </Card>
            ))}
          </div>

          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterStatus)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="reported">Reported</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-3">
            {filtered?.map((r: any) => (
              <Card
                key={r.id}
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => openDetail(r)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && openDetail(r)}
                aria-label={`View request: ${r.title}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(r.tenancy as any)?.listings?.title || (r.tenancy as any)?.listings?.address || "Property"} · {r.category} · {formatDate(r.created_at!)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge className={statusColor(r.status)}>{r.status.replace("_", " ")}</Badge>
                    <Badge variant="outline" className={priorityColor(r.priority)}>{r.priority}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {r.maintenance_workers && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="w-3 h-3" /> {(r.maintenance_workers as any).name}
                    </div>
                  )}
                  {r.scheduled_date && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarIcon className="w-3 h-3" /> {formatDate(r.scheduled_date)}
                    </div>
                  )}
                  {(r.photos as any[])?.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ImageIcon className="w-3 h-3" /> {(r.photos as any[]).length} photo(s)
                    </div>
                  )}
                </div>
              </Card>
            ))}
            {(!filtered || filtered.length === 0) && (
              <Card className="p-8 text-center">
                <Wrench className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No maintenance requests found.</p>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Detail / Manage Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>
                  {(selected.tenancy as any)?.listings?.title || "Property"} · {selected.category} · Filed {formatDate(selected.created_at!)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Badge className={statusColor(selected.status)}>{selected.status.replace("_", " ")}</Badge>
                  <Badge variant="outline" className={priorityColor(selected.priority)}>{selected.priority}</Badge>
                </div>

                <p className="text-sm whitespace-pre-wrap">{selected.description}</p>

                {/* Photos */}
                {(selected.photos as string[])?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Photos</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(selected.photos as string[]).map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`Photo ${i + 1}`} className="w-full h-24 object-cover rounded-md border border-border" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tenant preferred times */}
                {(selected as any).preferred_time_slots && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-xs font-medium mb-1">Tenant's Preferred Times</p>
                    {((selected as any).preferred_time_slots as any).slots?.map((s: string) => (
                      <Badge key={s} variant="outline" className="me-1 mb-1 text-xs">{s}</Badge>
                    ))}
                    {((selected as any).preferred_time_slots as any).preferred_date && (
                      <p className="text-xs text-muted-foreground mt-1">Preferred date: {formatDate(((selected as any).preferred_time_slots as any).preferred_date)}</p>
                    )}
                  </div>
                )}

                {/* Management section */}
                <div className="border-t border-border pt-4 space-y-4">
                  <p className="text-sm font-medium">Manage Request</p>

                  {/* Status */}
                  <div>
                    <Label>Update Status</Label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Assign worker */}
                  {workers && workers.length > 0 && (
                    <div>
                      <Label>Assign Worker</Label>
                      <Select value={assignWorkerId} onValueChange={setAssignWorkerId}>
                        <SelectTrigger><SelectValue placeholder="Select a worker" /></SelectTrigger>
                        <SelectContent>
                          {workers.map((w) => (
                            <SelectItem key={w.id} value={w.id}>
                              {w.name}{w.specialty ? ` (${w.specialty})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {assignWorkerId && (() => {
                        const w = workers.find((wk) => wk.id === assignWorkerId);
                        if (!w) return null;
                        return (
                          <div className="mt-2 bg-muted p-2 rounded-lg text-xs space-y-1">
                            {w.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {w.phone}</div>}
                            {w.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> {w.email}</div>}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Schedule appointment */}
                  <div>
                    <Label>Schedule Appointment</Label>
                    <div className="flex gap-2 mt-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal", !scheduledDate && "text-muted-foreground")}>
                            <CalendarIcon className="w-4 h-4 me-2" />
                            {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={scheduledDate} onSelect={setScheduledDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Select value={timeWindow} onValueChange={setTimeWindow}>
                      <SelectTrigger className="mt-2"><SelectValue placeholder="Time window" /></SelectTrigger>
                      <SelectContent>
                        {timeWindows.map((tw) => <SelectItem key={tw} value={tw}>{tw}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Completion notes */}
                  <div>
                    <Label htmlFor="comp-notes">Completion Notes</Label>
                    <Textarea id="comp-notes" value={completionNotes} onChange={(e) => setCompletionNotes(e.target.value)} placeholder="Notes about the completed work…" rows={3} maxLength={2000} />
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
