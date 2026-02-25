import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Wrench, User, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";

const categories = ["plumbing", "electrical", "heating", "structural", "appliance", "general", "other"];

export default function TenantMaintenance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");

  const { data: tenancy } = useQuery({
    queryKey: ["tenant-tenancy-active", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("tenancies").select("id").eq("tenant_id", user!.id).eq("status", "active").maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: requests } = useQuery({
    queryKey: ["tenant-maintenance", tenancy?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("maintenance_requests").select("*, maintenance_workers(name, phone, specialty)").eq("tenancy_id", tenancy!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenancy,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("maintenance_requests").insert({
        tenancy_id: tenancy!.id,
        submitted_by: user!.id,
        title,
        description,
        category,
        priority,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-maintenance"] });
      toast({ title: "Request submitted" });
      setOpen(false);
      setTitle("");
      setDescription("");
    },
    onError: () => toast({ title: "Error", description: "Failed to submit", variant: "destructive" }),
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "completed": case "closed": return "bg-success text-success-foreground";
      case "in_progress": case "scheduled": return "bg-warning text-warning-foreground";
      case "assigned": return "bg-primary text-primary-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">Maintenance</h1>
          <p className="text-muted-foreground">Report issues and track repairs</p>
        </div>
        {tenancy && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Report Issue</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Report Maintenance Issue</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <Input placeholder="Issue title" value={title} onChange={e => setTitle(e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["low","medium","high","emergency"].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Textarea placeholder="Describe the issue..." value={description} onChange={e => setDescription(e.target.value)} rows={4} />
                <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!title.trim() || !description.trim() || createMutation.isPending}>
                  {createMutation.isPending ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </motion.div>

      {!tenancy ? (
        <Card className="p-8 text-center"><p className="text-muted-foreground">No active tenancy.</p></Card>
      ) : (
        <div className="space-y-3">
          {requests?.map(r => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{r.category} · {r.priority} priority · {format(parseISO(r.created_at!), "d MMM yyyy")}</p>
                </div>
                <Badge className={statusColor(r.status)}>{r.status.replace("_", " ")}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{r.description}</p>
              {r.maintenance_workers && (
                <div className="flex items-center gap-2 text-sm bg-muted p-2 rounded-lg">
                  <User className="w-4 h-4 text-primary" />
                  <span className="font-medium">{(r.maintenance_workers as any).name}</span>
                  {(r.maintenance_workers as any).specialty && <span className="text-muted-foreground">· {(r.maintenance_workers as any).specialty}</span>}
                  {(r.maintenance_workers as any).phone && <span className="text-muted-foreground">· {(r.maintenance_workers as any).phone}</span>}
                </div>
              )}
              {r.scheduled_date && (
                <div className="flex items-center gap-2 text-sm mt-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Scheduled: {format(parseISO(r.scheduled_date), "d MMM yyyy")} {r.scheduled_time_window && `(${r.scheduled_time_window})`}</span>
                </div>
              )}
              {r.completion_notes && (
                <div className="mt-2 p-2 bg-success/5 rounded-lg text-sm">
                  <span className="font-medium">Completed: </span>{r.completion_notes}
                </div>
              )}
            </Card>
          ))}
          {(!requests || requests.length === 0) && (
            <Card className="p-8 text-center">
              <Wrench className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No maintenance requests.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
