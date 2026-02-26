import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Loader2,
  CreditCard,
  UserCheck,
  Home,
  Briefcase,
  Building,
  PiggyBank,
} from "lucide-react";

type ScreeningRequest = {
  id: string;
  application_id: string;
  status: string;
  overall_result: string | null;
  summary: string | null;
  results: Record<string, { status: string; details: string; score?: number; ratio?: number }> | null;
  check_types: string[];
  requested_at: string;
  completed_at: string | null;
};

const checkIcons: Record<string, typeof CreditCard> = {
  credit: CreditCard,
  identity: UserCheck,
  right_to_rent: Home,
  employment: Briefcase,
  previous_landlord: Building,
  affordability: PiggyBank,
};

const checkLabels: Record<string, string> = {
  credit: "Credit Check",
  identity: "Identity Verification",
  right_to_rent: "Right to Rent",
  employment: "Employment Verification",
  previous_landlord: "Previous Landlord",
  affordability: "Affordability Assessment",
};

const resultColors: Record<string, string> = {
  pass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  fail: "bg-destructive/10 text-destructive border-destructive/20",
  refer: "bg-warning/10 text-warning border-warning/20",
  pending: "bg-muted text-muted-foreground border-border",
};

export default function ScreeningResults({
  applicationId,
  canTrigger = false,
}: {
  applicationId: string;
  canTrigger?: boolean;
}) {
  const { toast } = useToast();
  const [screening, setScreening] = useState<ScreeningRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const fetchScreening = async () => {
    const { data } = await (supabase as any)
      .from("screening_requests")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setScreening(data as ScreeningRequest | null);
    setLoading(false);
  };

  useEffect(() => {
    fetchScreening();
  }, [applicationId]);

  const requestScreening = async () => {
    setRequesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("request-screening", {
        body: { application_id: applicationId },
      });

      if (res.error) throw new Error(res.error.message);
      toast({ title: "Screening requested" });
      // Refetch after a short delay (demo mode completes instantly)
      setTimeout(fetchScreening, 1000);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRequesting(false);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading screening...</div>;

  if (!screening) {
    if (!canTrigger) return null;
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Tenant Screening</p>
            <p className="text-xs text-muted-foreground">Run credit, identity, and reference checks</p>
          </div>
          <Button onClick={requestScreening} disabled={requesting} size="sm" className="gap-2">
            {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {requesting ? "Requesting..." : "Run Screening"}
          </Button>
        </div>
      </div>
    );
  }

  const OverallIcon =
    screening.overall_result === "pass" ? ShieldCheck :
    screening.overall_result === "fail" ? ShieldAlert : ShieldQuestion;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <OverallIcon
            className={`w-6 h-6 ${
              screening.overall_result === "pass" ? "text-emerald-500" :
              screening.overall_result === "fail" ? "text-destructive" :
              "text-muted-foreground"
            }`}
          />
          <div>
            <p className="text-sm font-medium">Tenant Screening</p>
            <p className="text-xs text-muted-foreground capitalize">
              {screening.status === "completed"
                ? `Result: ${screening.overall_result || "N/A"}`
                : `Status: ${screening.status}`}
            </p>
          </div>
        </div>
        <Badge
          variant="secondary"
          className={
            screening.status === "completed"
              ? resultColors[screening.overall_result || "pending"]
              : "bg-muted text-muted-foreground"
          }
        >
          {screening.status === "completed" ? screening.overall_result?.toUpperCase() : screening.status.toUpperCase()}
        </Badge>
      </div>

      {screening.summary && (
        <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{screening.summary}</p>
      )}

      {screening.results && (
        <div className="grid gap-2">
          {Object.entries(screening.results).map(([key, result]) => {
            const Icon = checkIcons[key] || ShieldQuestion;
            return (
              <div
                key={key}
                className={`flex items-center gap-3 rounded-lg border p-3 ${resultColors[result.status] || resultColors.pending}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{checkLabels[key] || key}</p>
                  <p className="text-xs opacity-80">{result.details}</p>
                </div>
                {result.score != null && (
                  <span className="text-sm font-mono font-bold">{result.score}</span>
                )}
                {result.ratio != null && (
                  <span className="text-sm font-mono font-bold">{result.ratio}x</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {screening.status === "in_progress" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Screening in progress — results will appear when complete</span>
        </div>
      )}

      {canTrigger && screening.status === "failed" && (
        <Button onClick={requestScreening} disabled={requesting} size="sm" variant="outline" className="gap-2">
          {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          Retry Screening
        </Button>
      )}
    </div>
  );
}
