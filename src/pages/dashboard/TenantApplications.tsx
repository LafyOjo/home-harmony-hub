import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Inbox } from "lucide-react";

type Application = {
  id: string;
  status: string;
  created_at: string;
  listing_id: string;
  listings?: { title: string; address: string; rent_pcm: number } | null;
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-primary/10 text-primary",
  reviewed: "bg-accent/20 text-accent-foreground",
  shortlisted: "bg-success/10 text-success",
  offered: "bg-warning/10 text-warning",
  accepted: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
};

export default function TenantApplications() {
  const { user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("applications")
      .select("id, status, created_at, listing_id, listings(title, address, rent_pcm)")
      .eq("tenant_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setApps((data as any) || []));
  }, [user]);

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold mb-6">My Applications</h1>

      {apps.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Inbox className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No applications yet. Use an apply link to start one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map(app => (
            <div key={app.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{app.listings?.title || "Listing"}</p>
                  <p className="text-xs text-muted-foreground">{app.listings?.address}</p>
                  {app.listings?.rent_pcm && (
                    <p className="text-xs text-muted-foreground mt-1">£{app.listings.rent_pcm}/month</p>
                  )}
                </div>
                <Badge className={statusColors[app.status] || ""} variant="secondary">
                  {app.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
