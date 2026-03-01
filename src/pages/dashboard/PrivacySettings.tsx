import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Shield, Download, Trash2, Cookie, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

export default function PrivacySettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);

  // Load consents
  const { data: consents } = useQuery({
    queryKey: ["privacy-consents", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("consents")
        .select("*")
        .eq("user_id", user!.id)
        .order("accepted_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Cookie consent status
  const cookieConsent = (() => {
    try {
      const raw = localStorage.getItem("cookie_consent");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  const resetCookieConsent = () => {
    localStorage.removeItem("cookie_consent");
    toast({ title: t("privacy.cookieReset", "Cookie preferences reset — reload the page to see the banner.") });
  };

  // Export user data
  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const tables = ["profiles", "tenant_addresses", "tenant_employment", "documents", "consents", "audit_logs"] as const;
      const results: Record<string, any> = { email: user.email, exported_at: new Date().toISOString() };

      for (const table of tables) {
        const { data } = await supabase.from(table).select("*").eq("user_id", user.id);
        results[table] = data || [];
      }

      const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `my-data-export-${format(new Date(), "yyyy-MM-dd")}.json`;
      a.click();
      URL.revokeObjectURL(url);

      // Log the export
      await supabase.from("audit_logs").insert([{
        user_id: user.id,
        action: "data_export",
        entity_type: "user",
        entity_id: user.id,
        details: { tables } as any,
      }]);


      toast({ title: t("privacy.exportSuccess", "Your data has been exported.") });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  // Request account deletion
  const handleDeleteRequest = async () => {
    if (!user) return;
    try {
      await supabase.from("audit_logs").insert([{
        user_id: user.id,
        action: "deletion_request",
        entity_type: "user",
        entity_id: user.id,
        details: { requested_at: new Date().toISOString() } as any,
      }]);
      toast({
        title: t("privacy.deletionRequested", "Deletion request submitted"),
        description: t("privacy.deletionDesc", "Your account will be reviewed and deleted within 30 days as required by GDPR."),
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold mb-1">
          {t("privacy.title", "Privacy & Data")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("privacy.subtitle", "Manage your privacy settings, data exports, and cookie preferences.")}
        </p>
      </div>

      {/* Cookie Preferences */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Cookie className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold">{t("privacy.cookies", "Cookie Preferences")}</h3>
        </div>
        {cookieConsent ? (
          <div className="flex items-center justify-between">
            <div>
              <Badge variant={cookieConsent.choice === "all" ? "default" : "secondary"}>
                {cookieConsent.choice === "all" ? t("privacy.allCookies", "All cookies accepted") : t("privacy.essentialCookies", "Essential only")}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                {t("privacy.consentedOn", "Consented on")} {format(new Date(cookieConsent.timestamp), "d MMM yyyy")}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={resetCookieConsent}>
              {t("privacy.changeCookies", "Change Preferences")}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("privacy.noCookieConsent", "No cookie consent recorded yet.")}</p>
        )}
      </Card>

      {/* Data Export (GDPR Art. 20 — Right to Data Portability) */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold">{t("privacy.exportTitle", "Export Your Data")}</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("privacy.exportDesc", "Download a copy of all your personal data in JSON format. This includes your profile, addresses, employment, documents, and consent history.")}
        </p>
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          <Download className="w-4 h-4 mr-2" />
          {exporting ? t("privacy.exporting", "Exporting...") : t("privacy.downloadData", "Download My Data")}
        </Button>
      </Card>

      {/* Consent History */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold">{t("privacy.consentHistory", "Consent History")}</h3>
        </div>
        {consents && consents.length > 0 ? (
          <div className="space-y-2">
            {consents.map(c => (
              <div key={c.id} className="flex items-center justify-between text-sm border-b border-border pb-2">
                <div>
                  <span className="font-medium capitalize">{c.consent_type.replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground ml-2">v{c.version}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {c.accepted_at ? format(new Date(c.accepted_at), "d MMM yyyy HH:mm") : "—"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("privacy.noConsents", "No consent records found.")}</p>
        )}
      </Card>

      {/* Account Deletion (GDPR Art. 17 — Right to Erasure) */}
      <Card className="p-5 space-y-3 border-destructive/20">
        <div className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-destructive" />
          <h3 className="font-display font-semibold text-destructive">
            {t("privacy.deleteTitle", "Delete Your Account")}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("privacy.deleteDesc", "Request permanent deletion of your account and all associated data. This action is irreversible and will be processed within 30 days in accordance with GDPR Article 17.")}
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="w-4 h-4 mr-2" />
              {t("privacy.requestDeletion", "Request Account Deletion")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("privacy.confirmDeleteTitle", "Are you absolutely sure?")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("privacy.confirmDeleteDesc", "This will submit a request to permanently delete your account and all associated data. This cannot be undone. Your data will be erased within 30 days.")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteRequest} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t("privacy.confirmDelete", "Yes, delete my account")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  );
}
