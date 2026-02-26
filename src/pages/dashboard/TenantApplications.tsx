import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Inbox, ChevronDown, ChevronUp } from "lucide-react";
import ScreeningResults from "@/components/ScreeningResults";
import { formatCurrency, formatDateShort } from "@/lib/locale-format";

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
  const { t } = useTranslation();
  const { user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

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
      <h1 className="font-display text-2xl font-bold mb-6">{t("dashboard.myApplications")}</h1>

      {apps.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center" role="status">
          <Inbox className="w-10 h-10 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
          <p className="text-muted-foreground text-sm">{t("dashboard.noApplications")}</p>
        </div>
      ) : (
        <div className="space-y-3" role="list" aria-label={t("dashboard.myApplications")}>
          {apps.map(app => (
            <div key={app.id} className="bg-card border border-border rounded-xl overflow-hidden" role="listitem">
              <button
                type="button"
                className="w-full flex items-start justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors text-start"
                onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                aria-expanded={expandedApp === app.id}
              >
                <div>
                  <p className="font-medium text-sm">{app.listings?.title || t("dashboard.listing")}</p>
                  <p className="text-xs text-muted-foreground">{app.listings?.address}</p>
                  {app.listings?.rent_pcm && (
                    <p className="text-xs text-muted-foreground mt-1">{formatCurrency(app.listings.rent_pcm)}{t("common.perMonth")}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={statusColors[app.status] || ""} variant="secondary">
                    {app.status}
                  </Badge>
                  {expandedApp === app.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" aria-hidden="true" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
                </div>
              </button>
              {expandedApp === app.id && (
                <div className="border-t border-border p-4">
                  <ScreeningResults applicationId={app.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
