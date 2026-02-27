import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Plus, Wrench, User, Calendar, Camera, X, Clock, ImageIcon } from "lucide-react";
import { formatDate } from "@/lib/locale-format";
import { useState } from "react";

const categories = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "heating", label: "Heating" },
  { value: "structural", label: "Structural" },
  { value: "appliance", label: "Appliance" },
  { value: "general", label: "General" },
  { value: "other", label: "Other" },
];
const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "emergency", label: "Emergency" },
];
const timeSlots = ["Morning (8am–12pm)", "Afternoon (12pm–5pm)", "Evening (5pm–8pm)", "Any time"];

type FilterStatus = "all" | "reported" | "scheduled" | "in_progress" | "completed";

export default function TenantMaintenance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");
  const [photos, setPhotos] = useState<File[]>([]);
  const [preferredSlots, setPreferredSlots] = useState<string[]>([]);
  const [preferredDate, setPreferredDate] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: tenancy } = useQuery({
    queryKey: ["tenant-tenancy-active", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenancies").select("id").eq("tenant_id", user!.id).eq("status", "active").maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ["tenant-maintenance", tenancy?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("*, maintenance_workers(name, phone, specialty)")
        .eq("tenancy_id", tenancy!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenancy,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const photoKeys: string[] = [];
      for (const photo of photos) {
        const key = `${user!.id}/${Date.now()}-${photo.name}`;
        const { error: upErr } = await supabase.storage.from("maintenance-photos").upload(key, photo);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("maintenance-photos").getPublicUrl(key);
        photoKeys.push(urlData.publicUrl);
      }

      const { error } = await supabase.from("maintenance_requests").insert({
        tenancy_id: tenancy!.id,
        submitted_by: user!.id,
        title,
        description,
        category,
        priority,
        photos: photoKeys.length > 0 ? photoKeys : undefined,
        preferred_time_slots: preferredSlots.length > 0 || preferredDate
          ? { slots: preferredSlots, preferred_date: preferredDate || null }
          : undefined,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-maintenance"] });
      toast({ title: "Request submitted", description: "Your landlord will be notified." });
      resetForm();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setOpen(false);
    setTitle(""); setDescription(""); setCategory("general"); setPriority("medium");
    setPhotos([]); setPreferredSlots([]); setPreferredDate("");
  };

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos((prev) => [...prev, ...files].slice(0, 5));
    e.target.value = "";
  };

  const toggleSlot = (slot: string) => {
    setPreferredSlots((prev) => prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "completed": case "closed": return "bg-success text-success-foreground";
      case "in_progress": case "scheduled": return "bg-warning text-warning-foreground";
      case "assigned": return "bg-primary text-primary-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const filtered = requests?.filter((r) => {
    if (filter === "all") return true;
    if (filter === "completed") return r.status === "completed" || r.status === "closed";
    return r.status === filter;
  });

  const detailRequest = requests?.find((r) => r.id === detailId);
  const detailPhotos = detailRequest?.photos as string[] | null;
  const detailSlots = (detailRequest as any)?.preferred_time_slots as { slots?: string[]; preferred_date?: string } | null;

  return (
    <div className="max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">Maintenance</h1>
          <p className="text-muted-foreground">Report issues and track repairs</p>
        </div>
        {tenancy && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 me-1" /> Report Issue
          </Button>
        )}
      </motion.div>

      {!tenancy ? (
        <Card className="p-8 text-center"><p className="text-muted-foreground">No active tenancy.</p></Card>
      ) : isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}</div>
      ) : (
        <>
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
            {filtered?.map((r) => (
              <Card
                key={r.id}
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setDetailId(r.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setDetailId(r.id)}
                aria-label={`View request: ${r.title}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">
                      {categories.find((c) => c.value === r.category)?.label || r.category} · {r.priority} priority · {formatDate(r.created_at!)}
                    </p>
                  </div>
                  <Badge className={statusColor(r.status)}>{r.status.replace("_", " ")}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{r.description}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  {r.maintenance_workers && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span>{(r.maintenance_workers as any).name}</span>
                    </div>
                  )}
                  {r.scheduled_date && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(r.scheduled_date)}{r.scheduled_time_window ? ` (${r.scheduled_time_window})` : ""}</span>
                    </div>
                  )}
                  {(r.photos as any[])?.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ImageIcon className="w-3 h-3" />
                      <span>{(r.photos as any[]).length} photo{(r.photos as any[]).length > 1 ? "s" : ""}</span>
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

      {/* New Request Dialog */}
      <Dialog open={open} onOpenChange={(o) => !o && resetForm()}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Maintenance Issue</DialogTitle>
            <DialogDescription>Describe the problem and your preferred access times.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="maint-title">Issue Title</Label>
              <Input id="maint-title" placeholder="e.g. Leaking kitchen tap" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{priorityOptions.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="maint-desc">Description</Label>
              <Textarea id="maint-desc" placeholder="Describe the issue in detail…" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000} />
            </div>

            {/* Photos */}
            <div>
              <Label>Photos (up to 5)</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {photos.map((p, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-border">
                    <img src={URL.createObjectURL(p)} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))} className="absolute top-0 end-0 bg-background/80 rounded-full p-0.5" aria-label="Remove photo">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <label className="w-16 h-16 rounded-md border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                    <Camera className="w-5 h-5 text-muted-foreground" />
                    <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoAdd} />
                  </label>
                )}
              </div>
            </div>

            {/* Preferred times */}
            <div>
              <Label>Preferred Access Times</Label>
              <div className="flex flex-wrap gap-2 mt-1 mb-2">
                {timeSlots.map((slot) => (
                  <Button
                    key={slot} type="button" size="sm"
                    variant={preferredSlots.includes(slot) ? "default" : "outline"}
                    onClick={() => toggleSlot(slot)} className="text-xs"
                  >
                    <Clock className="w-3 h-3 me-1" />{slot}
                  </Button>
                ))}
              </div>
              <Input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} aria-label="Preferred date" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button disabled={!title.trim() || !description.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? "Submitting…" : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {detailRequest && (
            <>
              <DialogHeader>
                <DialogTitle>{detailRequest.title}</DialogTitle>
                <DialogDescription>
                  {categories.find((c) => c.value === detailRequest.category)?.label || detailRequest.category} · Filed {formatDate(detailRequest.created_at!)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Badge className={statusColor(detailRequest.status)}>{detailRequest.status.replace("_", " ")}</Badge>
                  <Badge variant="outline">{detailRequest.priority}</Badge>
                </div>
                <p className="text-sm whitespace-pre-wrap">{detailRequest.description}</p>

                {detailPhotos && detailPhotos.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Photos</p>
                    <div className="grid grid-cols-3 gap-2">
                      {detailPhotos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`Photo ${i + 1}`} className="w-full h-24 object-cover rounded-md border border-border" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {detailSlots && (detailSlots.slots?.length || detailSlots.preferred_date) && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-xs font-medium mb-1">Preferred Availability</p>
                    {detailSlots.slots?.map((s) => <Badge key={s} variant="outline" className="me-1 mb-1 text-xs">{s}</Badge>)}
                    {detailSlots.preferred_date && <p className="text-xs text-muted-foreground mt-1">Preferred date: {formatDate(detailSlots.preferred_date)}</p>}
                  </div>
                )}

                {detailRequest.maintenance_workers && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-xs font-medium mb-1">Assigned Worker</p>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-primary" />
                      <span className="font-medium">{(detailRequest.maintenance_workers as any).name}</span>
                      {(detailRequest.maintenance_workers as any).specialty && <span className="text-muted-foreground">· {(detailRequest.maintenance_workers as any).specialty}</span>}
                      {(detailRequest.maintenance_workers as any).phone && <span className="text-muted-foreground">· {(detailRequest.maintenance_workers as any).phone}</span>}
                    </div>
                  </div>
                )}

                {detailRequest.scheduled_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>Appointment: {formatDate(detailRequest.scheduled_date)}{detailRequest.scheduled_time_window ? ` (${detailRequest.scheduled_time_window})` : ""}</span>
                  </div>
                )}

                {detailRequest.completion_notes && (
                  <div className="bg-success/10 p-3 rounded-lg text-sm">
                    <p className="text-xs font-medium mb-1">Completion Notes</p>
                    <p>{detailRequest.completion_notes}</p>
                  </div>
                )}

                {/* Timeline */}
                <div className="border-t border-border pt-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Timeline</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="w-3 h-3" /> Reported: {formatDate(detailRequest.created_at!)}</div>
                  {detailRequest.updated_at && detailRequest.updated_at !== detailRequest.created_at && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="w-3 h-3" /> Updated: {formatDate(detailRequest.updated_at)}</div>
                  )}
                  {detailRequest.completed_at && (
                    <div className="flex items-center gap-2 text-xs text-success"><Clock className="w-3 h-3" /> Completed: {formatDate(detailRequest.completed_at)}</div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
