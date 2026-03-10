import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, CheckCircle, XCircle, User } from "lucide-react";
import { format } from "date-fns";

type Viewing = {
  id: string;
  listing_id: string;
  tenant_id: string;
  proposed_datetime: string;
  duration_minutes: number;
  status: string;
  viewing_type: string;
  notes: string | null;
  listings: { title: string } | null;
  profiles: { full_name: string; email: string } | null;
};

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  confirmed: "bg-emerald-500/10 text-emerald-600",
  cancelled: "bg-destructive/10 text-destructive",
  completed: "bg-muted text-muted-foreground",
};

export default function LandlordViewings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [viewings, setViewings] = useState<Viewing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchViewings = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("viewing_appointments")
      .select("id, listing_id, tenant_id, proposed_datetime, duration_minutes, status, viewing_type, notes, listings(title)")
      .eq("landlord_id", user.id)
      .order("proposed_datetime", { ascending: true });

    if (!data) { setLoading(false); return; }

    const tenantIds = [...new Set(data.map((v: any) => v.tenant_id))] as string[];
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", tenantIds);
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    setViewings(data.map((v: any) => ({ ...v, profiles: profileMap.get(v.tenant_id) || null })));
    setLoading(false);
  };

  useEffect(() => { fetchViewings(); }, [user]);

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "confirmed") updates.confirmed_at = new Date().toISOString();
    if (status === "cancelled") updates.cancelled_at = new Date().toISOString();

    const { error } = await (supabase as any)
      .from("viewing_appointments")
      .update(updates)
      .eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: `Viewing ${status}` }); fetchViewings(); }
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  const pending = viewings.filter(v => v.status === "pending");
  const confirmed = viewings.filter(v => v.status === "confirmed");
  const others = viewings.filter(v => v.status !== "pending" && v.status !== "confirmed");

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold mb-6">Viewing Requests</h1>

      {viewings.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No viewing requests yet.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Pending Approval ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map(v => (
                  <Card key={v.id} className="p-4 border-warning/30">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{v.listings?.title}</p>
                        <p className="text-sm flex items-center gap-1">
                          <User className="w-3 h-3" /> {v.profiles?.full_name || v.profiles?.email || "Tenant"}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(v.proposed_datetime), "dd MMM yyyy")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(v.proposed_datetime), "HH:mm")}
                          </span>
                          <Badge variant="secondary">{v.viewing_type === "video" ? "Video" : "In Person"}</Badge>
                        </div>
                        {v.notes && <p className="text-xs text-muted-foreground">{v.notes}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateStatus(v.id, "confirmed")} className="gap-1">
                          <CheckCircle className="w-3 h-3" /> Confirm
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(v.id, "cancelled")} className="gap-1">
                          <XCircle className="w-3 h-3" /> Decline
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {confirmed.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Confirmed</h2>
              <div className="space-y-2">
                {confirmed.map(v => (
                  <Card key={v.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{v.listings?.title} — {v.profiles?.full_name || "Tenant"}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(v.proposed_datetime), "dd MMM yyyy HH:mm")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors.confirmed} variant="secondary">Confirmed</Badge>
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(v.id, "completed")}>
                          Mark Done
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">History</h2>
              <div className="space-y-2">
                {others.map(v => (
                  <Card key={v.id} className="p-3 opacity-60">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm">{v.listings?.title} — {v.profiles?.full_name || "Tenant"}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(v.proposed_datetime), "dd MMM yyyy HH:mm")}</p>
                      </div>
                      <Badge className={statusColors[v.status] || ""} variant="secondary">{v.status}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
