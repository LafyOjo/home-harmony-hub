import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send, Clock, CheckCircle2, Mail } from "lucide-react";

type Ref = {
  id: string;
  type: string;
  referee_name: string;
  referee_email: string;
  status: string;
  created_at: string;
};

const statusIcons: Record<string, typeof Clock> = { sent: Clock, opened: Mail, completed: CheckCircle2 };

export default function TenantReferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [refs, setRefs] = useState<Ref[]>([]);
  const [form, setForm] = useState({ type: "employer", referee_name: "", referee_email: "" });
  const [loading, setLoading] = useState(false);

  const fetchRefs = async () => {
    if (!user) return;
    const { data } = await supabase.from("reference_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setRefs((data as Ref[]) || []);
  };

  useEffect(() => { fetchRefs(); }, [user]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("reference_requests").insert({
      user_id: user.id,
      type: form.type,
      referee_name: form.referee_name,
      referee_email: form.referee_email,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reference request sent" });
      setForm({ type: "employer", referee_name: "", referee_email: "" });
      fetchRefs();
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold mb-6">References</h1>

      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h2 className="font-medium text-sm mb-4">Request a Reference</h2>
        <form onSubmit={handleRequest} className="space-y-3">
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="employer">Employer</SelectItem>
                <SelectItem value="landlord">Previous Landlord</SelectItem>
                <SelectItem value="guarantor">Guarantor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Referee Name</Label>
            <Input value={form.referee_name} onChange={e => setForm(f => ({ ...f, referee_name: e.target.value }))} required />
          </div>
          <div>
            <Label>Referee Email</Label>
            <Input type="email" value={form.referee_email} onChange={e => setForm(f => ({ ...f, referee_email: e.target.value }))} required />
          </div>
          <Button type="submit" disabled={loading} className="gap-2">
            <Send className="w-4 h-4" /> {loading ? "Sending..." : "Send Request"}
          </Button>
        </form>
      </div>

      <div className="space-y-2">
        {refs.length === 0 && <p className="text-sm text-muted-foreground">No references requested yet.</p>}
        {refs.map(ref => {
          const Icon = statusIcons[ref.status] || Clock;
          return (
            <div key={ref.id} className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
              <Icon className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{ref.referee_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{ref.type} · {ref.status}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
