import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ScreeningResults from "@/components/ScreeningResults";
import { ChevronDown, ChevronUp } from "lucide-react";

const columns = [
  { status: "submitted", label: "Submitted", color: "bg-primary/10 text-primary" },
  { status: "reviewed", label: "Reviewed", color: "bg-accent/20 text-accent-foreground" },
  { status: "shortlisted", label: "Shortlisted", color: "bg-success/10 text-success" },
  { status: "offered", label: "Offered", color: "bg-warning/10 text-warning" },
  { status: "accepted", label: "Accepted", color: "bg-success/10 text-success" },
  { status: "rejected", label: "Rejected", color: "bg-destructive/10 text-destructive" },
];

type AppWithProfile = {
  id: string;
  status: string;
  tenant_id: string;
  listing_id: string;
  created_at: string;
  listings: { title: string } | null;
  profiles: { full_name: string; email: string } | null;
};

export default function Pipeline() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apps, setApps] = useState<AppWithProfile[]>([]);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  const fetchApps = async () => {
    if (!user) return;
    const { data: listings } = await supabase.from("listings").select("id").eq("owner_id", user.id);
    if (!listings?.length) return;
    const listingIds = listings.map(l => l.id);
    const { data } = await supabase
      .from("applications")
      .select("id, status, tenant_id, listing_id, created_at, listings(title)")
      .in("listing_id", listingIds)
      .neq("status", "draft")
      .order("created_at", { ascending: false });

    if (!data) return;

    const tenantIds = [...new Set(data.map(a => a.tenant_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", tenantIds);
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    setApps(data.map(a => ({ ...a, profiles: profileMap.get(a.tenant_id) || null } as any)));
  };

  useEffect(() => { fetchApps(); }, [user]);

  const moveStatus = async (appId: string, newStatus: string) => {
    const { error } = await supabase.from("applications").update({ status: newStatus as any }).eq("id", appId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      fetchApps();
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Applicant Pipeline</h1>

      {apps.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-muted-foreground text-sm">No applications received yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto">
          {columns.map(col => {
            const colApps = apps.filter(a => a.status === col.status);
            return (
              <div key={col.status} className="min-w-[220px]">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={col.color} variant="secondary">{col.label}</Badge>
                  <span className="text-xs text-muted-foreground">{colApps.length}</span>
                </div>
                <div className="space-y-2">
                  {colApps.map(app => {
                    const isExpanded = expandedApp === app.id;
                    return (
                      <div key={app.id} className="bg-card border border-border rounded-lg p-3 space-y-2">
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                        >
                          <div>
                            <p className="text-sm font-medium">{app.profiles?.full_name || app.profiles?.email || "Tenant"}</p>
                            <p className="text-xs text-muted-foreground">{app.listings?.title}</p>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>

                        {isExpanded && (
                          <div className="space-y-3 pt-2 border-t border-border">
                            <ScreeningResults applicationId={app.id} canTrigger />
                            <div className="flex gap-1 flex-wrap">
                              {columns.map(c => c.status !== app.status && (
                                <Button
                                  key={c.status}
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs px-2"
                                  onClick={(e) => { e.stopPropagation(); moveStatus(app.id, c.status); }}
                                >
                                  → {c.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}

                        {!isExpanded && (
                          <div className="flex gap-1 flex-wrap">
                            {columns.map(c => c.status !== app.status && (
                              <Button
                                key={c.status}
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs px-2"
                                onClick={() => moveStatus(app.id, c.status)}
                              >
                                → {c.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
