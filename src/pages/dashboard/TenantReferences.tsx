import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send, Clock, CheckCircle2, Mail, ShieldCheck, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Ref = {
  id: string;
  type: string;
  referee_name: string;
  referee_email: string;
  status: string;
  created_at: string;
};

type RefResponse = {
  id: string;
  request_id: string;
  response_data: any;
  submitted_at: string;
};

const statusIcons: Record<string, typeof Clock> = { sent: Clock, opened: Mail, completed: CheckCircle2 };
const statusColors: Record<string, string> = {
  sent: "bg-muted text-muted-foreground",
  opened: "bg-primary/10 text-primary",
  completed: "bg-emerald-500/10 text-emerald-600",
};

export default function TenantReferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [refs, setRefs] = useState<Ref[]>([]);
  const [responses, setResponses] = useState<Map<string, RefResponse>>(new Map());
  const [form, setForm] = useState({ type: "employer", referee_name: "", referee_email: "" });
  const [loading, setLoading] = useState(false);
  const [expandedRef, setExpandedRef] = useState<string | null>(null);

  const fetchRefs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("reference_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const refList = (data as Ref[]) || [];
    setRefs(refList);

    // Fetch responses for completed refs
    const completedIds = refList.filter(r => r.status === "completed").map(r => r.id);
    if (completedIds.length > 0) {
      const { data: resps } = await supabase
        .from("reference_responses")
        .select("*")
        .in("request_id", completedIds);
      const respMap = new Map<string, RefResponse>();
      (resps || []).forEach((r: any) => respMap.set(r.request_id, r));
      setResponses(respMap);
    }
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
                <SelectItem value="character">Character Reference</SelectItem>
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
          const resp = responses.get(ref.id);
          const isExpanded = expandedRef === ref.id;

          return (
            <div key={ref.id} className="bg-card border border-border rounded-lg overflow-hidden">
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedRef(isExpanded ? null : ref.id)}
              >
                <Icon className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{ref.referee_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{ref.type} · {ref.referee_email}</p>
                </div>
                <Badge variant="secondary" className={statusColors[ref.status] || statusColors.sent}>
                  {ref.status || "sent"}
                </Badge>
              </div>

              {isExpanded && (
                <div className="border-t border-border p-3 bg-muted/20 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Requested: {new Date(ref.created_at).toLocaleDateString()}
                  </p>
                  {ref.status === "completed" && resp ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                        <ShieldCheck className="w-4 h-4" /> Reference Completed
                      </div>
                      {typeof resp.response_data === "object" && resp.response_data && (
                        <div className="bg-background rounded-lg p-3 space-y-1 text-sm">
                          {Object.entries(resp.response_data).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>
                              <span className="font-medium">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {ref.status === "opened"
                        ? "Your referee has opened the reference form but hasn't completed it yet."
                        : "Waiting for your referee to respond."}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
