import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Wrench, Phone, Mail } from "lucide-react";
import { useState } from "react";

export default function LandlordWorkers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState("");

  const { data: workers } = useQuery({
    queryKey: ["landlord-workers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("maintenance_workers").select("*").eq("landlord_id", user!.id).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("maintenance_workers").insert({
        landlord_id: user!.id,
        name,
        phone: phone || null,
        email: email || null,
        specialty: specialty || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord-workers"] });
      toast({ title: "Worker added" });
      setOpen(false);
      setName(""); setPhone(""); setEmail(""); setSpecialty("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("maintenance_workers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["landlord-workers"] }),
  });

  return (
    <div className="max-w-3xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">Workers & Fixers</h1>
          <p className="text-muted-foreground">Manage your maintenance team</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Worker</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Worker</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <Input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
              <Input placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
              <Input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
              <Input placeholder="Specialty (e.g. Plumber, Electrician)" value={specialty} onChange={e => setSpecialty(e.target.value)} />
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!name.trim()}>Add</Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <div className="space-y-3">
        {workers?.map(w => (
          <Card key={w.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{w.name}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {w.specialty && <span>{w.specialty}</span>}
                  {w.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{w.phone}</span>}
                  {w.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{w.email}</span>}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate(w.id)}>Remove</Button>
          </Card>
        ))}
        {(!workers || workers.length === 0) && (
          <Card className="p-8 text-center">
            <Wrench className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No workers added yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
