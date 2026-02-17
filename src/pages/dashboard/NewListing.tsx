import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function NewListing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "", address: "", postcode: "", rent_pcm: "", deposit: "", available_from: "", description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("listings").insert({
      owner_id: user.id,
      title: form.title,
      address: form.address,
      postcode: form.postcode,
      rent_pcm: parseFloat(form.rent_pcm),
      deposit: form.deposit ? parseFloat(form.deposit) : null,
      available_from: form.available_from || null,
      description: form.description || null,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Listing created" });
      navigate("/dashboard/listings");
    }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl font-bold mb-6">New Listing</h1>
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div>
          <Label>Title</Label>
          <Input value={form.title} onChange={set("title")} placeholder="2 Bed Flat in Shoreditch" required />
        </div>
        <div>
          <Label>Address</Label>
          <Input value={form.address} onChange={set("address")} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Postcode</Label><Input value={form.postcode} onChange={set("postcode")} required /></div>
          <div><Label>Rent (£/month)</Label><Input type="number" value={form.rent_pcm} onChange={set("rent_pcm")} required /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Deposit (£)</Label><Input type="number" value={form.deposit} onChange={set("deposit")} /></div>
          <div><Label>Available From</Label><Input type="date" value={form.available_from} onChange={set("available_from")} /></div>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea value={form.description} onChange={set("description")} rows={3} />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating..." : "Create Listing"}
        </Button>
      </form>
    </div>
  );
}
