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
import { Plus, MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";

const categories = ["noise", "maintenance", "neighbour", "safety", "billing", "other"];
const priorities = ["low", "medium", "high", "urgent"];

export default function TenantComplaints() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [priority, setPriority] = useState("medium");

  const { data: tenancy } = useQuery({
    queryKey: ["tenant-tenancy-active", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("tenancies").select("id").eq("tenant_id", user!.id).eq("status", "active").maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: complaints } = useQuery({
    queryKey: ["tenant-complaints", tenancy?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("complaints").select("*").eq("tenancy_id", tenancy!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenancy,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("complaints").insert({
        tenancy_id: tenancy!.id,
        submitted_by: user!.id,
        subject,
        description,
        category,
        priority,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-complaints"] });
      toast({ title: "Complaint submitted" });
      setOpen(false);
      setSubject("");
      setDescription("");
    },
    onError: () => toast({ title: "Error", description: "Failed to submit complaint", variant: "destructive" }),
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "resolved": case "closed": return "bg-success text-success-foreground";
      case "escalated": return "bg-destructive text-destructive-foreground";
      case "in_progress": return "bg-warning text-warning-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">Complaints</h1>
          <p className="text-muted-foreground">Submit and track complaints</p>
        </div>
        {tenancy && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />New Complaint</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Submit Complaint</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <Input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{priorities.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Textarea placeholder="Describe the issue..." value={description} onChange={e => setDescription(e.target.value)} rows={4} />
                <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!subject.trim() || !description.trim() || createMutation.isPending}>
                  {createMutation.isPending ? "Submitting..." : "Submit Complaint"}
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
          {complaints?.map(c => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">{c.subject}</p>
                  <p className="text-xs text-muted-foreground capitalize">{c.category} · {c.priority} priority · {format(parseISO(c.created_at!), "d MMM yyyy")}</p>
                </div>
                <Badge className={statusColor(c.status)}>{c.status.replace("_", " ")}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{c.description}</p>
              {c.response && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <p className="text-xs font-medium mb-1">Response</p>
                  <p className="text-sm">{c.response}</p>
                </div>
              )}
            </Card>
          ))}
          {(!complaints || complaints.length === 0) && (
            <Card className="p-8 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No complaints submitted yet.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
