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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Plus, MessageSquare, ImagePlus, X, ChevronRight, Clock } from "lucide-react";
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
const priorities = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

type FilterStatus = "all" | "open" | "in_progress" | "resolved";

export default function TenantComplaints() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [detailComplaint, setDetailComplaint] = useState<any | null>(null);

  // Form state
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [priority, setPriority] = useState("medium");
  const [photos, setPhotos] = useState<File[]>([]);
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

  const { data: complaints, isLoading } = useQuery({
    queryKey: ["tenant-complaints", tenancy?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints").select("*").eq("tenancy_id", tenancy!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenancy,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      // Upload photos
      const photoKeys: string[] = [];
      for (const file of photos) {
        const key = `${user!.id}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("complaint-photos").upload(key, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("complaint-photos").getPublicUrl(key);
        photoKeys.push(urlData.publicUrl);
      }

      const { error } = await supabase.from("complaints").insert({
        tenancy_id: tenancy!.id,
        submitted_by: user!.id,
        subject,
        description,
        category,
        priority,
        attachments: photoKeys,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-complaints"] });
      toast({ title: "Complaint submitted", description: "Your complaint has been filed." });
      resetForm();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    onSettled: () => setUploading(false),
  });

  const resetForm = () => {
    setFormOpen(false);
    setSubject("");
    setDescription("");
    setCategory("other");
    setPriority("medium");
    setPhotos([]);
  };

  const addPhoto = (file: File) => {
    if (photos.length >= 5) {
      toast({ title: "Maximum 5 photos", variant: "destructive" });
      return;
    }
    setPhotos((prev) => [...prev, file]);
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
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">Complaints</h1>
          <p className="text-muted-foreground">Submit and track complaints about your tenancy</p>
        </div>
        {tenancy && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 me-1" /> New Complaint
          </Button>
        )}
      </motion.div>

      {!tenancy ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No active tenancy.</p>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}</div>
      ) : (
        <>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterStatus)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-3">
            {filtered?.map((c) => (
              <Card
                key={c.id}
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setDetailComplaint(c)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setDetailComplaint(c)}
                aria-label={`View complaint: ${c.subject}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{c.subject}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">
                      {categories.find((cat) => cat.value === c.category)?.label || c.category} · {c.priority} priority · {formatDate(c.created_at!)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge className={statusColor(c.status)}>{c.status.replace("_", " ")}</Badge>
                    <Badge variant="outline" className={priorityColor(c.priority)}>{c.priority}</Badge>
                  </div>
                </div>
                {c.response && (
                  <div className="mt-2 text-xs text-primary flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Landlord responded
                  </div>
                )}
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

      {/* New Complaint Dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => !o && resetForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Complaint</DialogTitle>
            <DialogDescription>Describe your issue and we'll forward it to your landlord.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="complaint-subject">Subject</Label>
              <Input id="complaint-subject" placeholder="Brief summary" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Urgency</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {priorities.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="complaint-desc">Description</Label>
              <Textarea id="complaint-desc" placeholder="Describe the issue in detail..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000} />
            </div>
            {/* Photos */}
            <div>
              <Label>Photos (optional, max 5)</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {photos.map((f, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-border">
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-0 end-0 bg-background/80 rounded-full p-0.5"
                      onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                      aria-label="Remove photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <label className="w-16 h-16 rounded-md border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                    <ImagePlus className="w-5 h-5 text-muted-foreground" />
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) addPhoto(f); e.target.value = ""; }} />
                  </label>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button
              disabled={!subject.trim() || !description.trim() || createMutation.isPending || uploading}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending || uploading ? "Submitting…" : "Submit Complaint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complaint Detail Dialog */}
      <Dialog open={!!detailComplaint} onOpenChange={(o) => !o && setDetailComplaint(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {detailComplaint && (
            <>
              <DialogHeader>
                <DialogTitle>{detailComplaint.subject}</DialogTitle>
                <DialogDescription>
                  Filed {formatDate(detailComplaint.created_at!)} · {categories.find((c) => c.value === detailComplaint.category)?.label || detailComplaint.category}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Badge className={statusColor(detailComplaint.status)}>{detailComplaint.status.replace("_", " ")}</Badge>
                  <Badge variant="outline" className={priorityColor(detailComplaint.priority)}>{detailComplaint.priority}</Badge>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                  <p className="text-sm whitespace-pre-wrap">{detailComplaint.description}</p>
                </div>

                {/* Attached photos */}
                {detailComplaint.attachments && (detailComplaint.attachments as string[]).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Photos</p>
                    <div className="flex flex-wrap gap-2">
                      {(detailComplaint.attachments as string[]).map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-20 h-20 rounded-md overflow-hidden border border-border">
                          <img src={url} alt={`Attachment ${i + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="border-t border-border pt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Timeline</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" /> Submitted: {formatDate(detailComplaint.created_at!)}
                  </div>
                  {detailComplaint.updated_at && detailComplaint.updated_at !== detailComplaint.created_at && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" /> Updated: {formatDate(detailComplaint.updated_at)}
                    </div>
                  )}
                  {detailComplaint.resolved_at && (
                    <div className="flex items-center gap-2 text-xs text-success">
                      <Clock className="w-3 h-3" /> Resolved: {formatDate(detailComplaint.resolved_at)}
                    </div>
                  )}
                </div>

                {/* Landlord response */}
                {detailComplaint.response && (
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs font-medium mb-1">Landlord Response</p>
                    <p className="text-sm whitespace-pre-wrap">{detailComplaint.response}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
