import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, Video, X } from "lucide-react";
import { format } from "date-fns";

type Viewing = {
  id: string;
  listing_id: string;
  proposed_datetime: string;
  duration_minutes: number;
  status: string;
  viewing_type: string;
  notes: string | null;
  listings: { title: string; address: string; postcode: string } | null;
};

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  confirmed: "bg-emerald-500/10 text-emerald-600",
  cancelled: "bg-destructive/10 text-destructive",
  completed: "bg-muted text-muted-foreground",
};

export default function TenantViewings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [viewings, setViewings] = useState<Viewing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchViewings = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("viewing_appointments")
      .select("id, listing_id, proposed_datetime, duration_minutes, status, viewing_type, notes, listings(title, address, postcode)")
      .eq("tenant_id", user.id)
      .order("proposed_datetime", { ascending: true });
    setViewings(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchViewings(); }, [user]);

  const cancelViewing = async (id: string) => {
    const { error } = await (supabase as any)
      .from("viewing_appointments")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Viewing cancelled" }); fetchViewings(); }
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  const upcoming = viewings.filter(v => v.status === "pending" || v.status === "confirmed");
  const past = viewings.filter(v => v.status === "completed" || v.status === "cancelled");

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold mb-6">My Viewings</h1>

      {viewings.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No viewings booked yet. Browse listings to schedule one.</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.href = "/listings"}>Browse Listings</Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Upcoming</h2>
              <div className="space-y-3">
                {upcoming.map(v => (
                  <Card key={v.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{v.listings?.title}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {v.listings?.address}, {v.listings?.postcode}
                        </p>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-primary" />
                            {format(new Date(v.proposed_datetime), "dd MMM yyyy")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-primary" />
                            {format(new Date(v.proposed_datetime), "HH:mm")} ({v.duration_minutes}min)
                          </span>
                          {v.viewing_type === "video" && (
                            <span className="flex items-center gap-1 text-primary">
                              <Video className="w-3 h-3" /> Video
                            </span>
                          )}
                        </div>
                        {v.notes && <p className="text-xs text-muted-foreground mt-1">{v.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[v.status]} variant="secondary">{v.status}</Badge>
                        {v.status !== "cancelled" && (
                          <Button variant="ghost" size="icon" onClick={() => cancelViewing(v.id)}>
                            <X className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Past</h2>
              <div className="space-y-2">
                {past.map(v => (
                  <Card key={v.id} className="p-3 opacity-70">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{v.listings?.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(v.proposed_datetime), "dd MMM yyyy HH:mm")}
                        </p>
                      </div>
                      <Badge className={statusColors[v.status]} variant="secondary">{v.status}</Badge>
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
