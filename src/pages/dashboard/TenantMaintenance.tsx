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
import { Label } from "@/components/ui/label";
import { Plus, Wrench, User, Calendar, Camera, X, Clock, ImageIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";

const categories = ["plumbing", "electrical", "heating", "structural", "appliance", "general", "other"];
const timeSlots = ["morning (8am-12pm)", "afternoon (12pm-5pm)", "evening (5pm-8pm)", "any time"];

export default function TenantMaintenance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
      // Upload photos first
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
      toast({ title: "Request submitted" });
      setOpen(false);
      setTitle(""); setDescription(""); setPhotos([]); setPreferredSlots([]); setPreferredDate("");
    },
    onError: () => toast({ title: "Error", description: "Failed to submit", variant: "destructive" }),
  });

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos(prev => [...prev, ...files].slice(0, 5));
  };

  const toggleSlot = (slot: string) => {
    setPreferredSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "completed": case "closed": return "bg-success text-success-foreground";
      case "in_progress": case "scheduled": return "bg-warning text-warning-foreground";
      case "assigned": return "bg-primary text-primary-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const detailRequest = requests?.find(r => r.id === detailId);
  const detailPhotos = detailRequest?.photos as string[] | null;
  const detailSlots = (detailRequest as any)?.preferred_time_slots as { slots?: string[]; preferred_date?: string } | null;

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
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
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

                {/* Photo Upload */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Photos (up to 5)</Label>
                  <div className="flex flex-wrap gap-2">
                    {photos.map((p, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                        <img src={URL.createObjectURL(p)} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {photos.length < 5 && (
                      <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 transition-colors">
                        <Camera className="w-5 h-5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground mt-1">Add</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoAdd} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Preferred Times */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Preferred Availability</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {timeSlots.map(slot => (
                      <Button
                        key={slot}
                        type="button"
                        size="sm"
                        variant={preferredSlots.includes(slot) ? "default" : "outline"}
                        onClick={() => toggleSlot(slot)}
                        className="text-xs"
                      >
                        <Clock className="w-3 h-3 mr-1" />{slot}
                      </Button>
                    ))}
                  </div>
                  <Input type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)} placeholder="Preferred date" />
                </div>

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
            <Card key={r.id} className="p-4 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setDetailId(r.id)}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{r.category} · {r.priority} priority · {format(parseISO(r.created_at!), "d MMM yyyy")}</p>
                </div>
                <Badge className={statusColor(r.status)}>{r.status.replace("_", " ")}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{r.description}</p>
              <div className="flex items-center gap-3">
                {r.maintenance_workers && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="w-3 h-3" />
                    <span>{(r.maintenance_workers as any).name}</span>
                  </div>
                )}
                {r.scheduled_date && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{format(parseISO(r.scheduled_date), "d MMM")}</span>
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
          {(!requests || requests.length === 0) && (
            <Card className="p-8 text-center">
              <Wrench className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No maintenance requests.</p>
            </Card>
          )}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={o => { if (!o) setDetailId(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {detailRequest && (
            <>
              <DialogHeader>
                <DialogTitle>{detailRequest.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={statusColor(detailRequest.status)}>{detailRequest.status.replace("_", " ")}</Badge>
                  <span className="text-xs text-muted-foreground capitalize">{detailRequest.category} · {detailRequest.priority} priority</span>
                </div>
                <p className="text-sm text-muted-foreground">{detailRequest.description}</p>

                {/* Photos */}
                {detailPhotos && detailPhotos.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Photos</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {detailPhotos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`Photo ${i + 1}`} className="w-full h-24 object-cover rounded-lg border border-border" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preferred times */}
                {detailSlots && (detailSlots.slots?.length || detailSlots.preferred_date) && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-xs font-medium mb-1">Preferred Availability</p>
                    {detailSlots.slots?.map(s => <Badge key={s} variant="outline" className="mr-1 mb-1 text-xs">{s}</Badge>)}
                    {detailSlots.preferred_date && <p className="text-xs text-muted-foreground mt-1">Preferred date: {format(parseISO(detailSlots.preferred_date), "d MMM yyyy")}</p>}
                  </div>
                )}

                {/* Worker info */}
                {detailRequest.maintenance_workers && (
                  <div className="flex items-center gap-2 text-sm bg-muted p-2 rounded-lg">
                    <User className="w-4 h-4 text-primary" />
                    <span className="font-medium">{(detailRequest.maintenance_workers as any).name}</span>
                    {(detailRequest.maintenance_workers as any).specialty && <span className="text-muted-foreground">· {(detailRequest.maintenance_workers as any).specialty}</span>}
                    {(detailRequest.maintenance_workers as any).phone && <span className="text-muted-foreground">· {(detailRequest.maintenance_workers as any).phone}</span>}
                  </div>
                )}

                {/* Schedule */}
                {detailRequest.scheduled_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>Scheduled: {format(parseISO(detailRequest.scheduled_date), "d MMM yyyy")} {detailRequest.scheduled_time_window && `(${detailRequest.scheduled_time_window})`}</span>
                  </div>
                )}

                {/* Completion notes */}
                {detailRequest.completion_notes && (
                  <div className="p-2 bg-success/5 rounded-lg text-sm">
                    <span className="font-medium">Completed: </span>{detailRequest.completion_notes}
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
