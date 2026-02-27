import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

type RefWithResponse = {
  id: string;
  referee_name: string;
  referee_email: string;
  type: string;
  status: string;
  created_at: string;
  response?: {
    response_data: Record<string, any>;
    submitted_at: string;
  } | null;
};

export default function LandlordReferenceReview({ applicationId }: { applicationId: string }) {
  const { toast } = useToast();
  const [refs, setRefs] = useState<RefWithResponse[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRefs();
  }, [applicationId]);

  const fetchRefs = async () => {
    setLoading(true);
    // Get reference request IDs linked to this application
    const { data: appRefs } = await supabase
      .from("application_references")
      .select("reference_request_id")
      .eq("application_id", applicationId);

    if (!appRefs?.length) { setLoading(false); return; }

    const reqIds = appRefs.map(ar => ar.reference_request_id);
    const { data: requests } = await supabase
      .from("reference_requests")
      .select("*")
      .in("id", reqIds);

    // Get responses
    const { data: responses } = await supabase
      .from("reference_responses")
      .select("*")
      .in("request_id", reqIds);

    const respMap = new Map(responses?.map(r => [r.request_id, r]) || []);

    setRefs((requests || []).map(r => ({
      ...r,
      response: respMap.get(r.id) ? {
        response_data: (respMap.get(r.id) as any).response_data,
        submitted_at: (respMap.get(r.id) as any).submitted_at,
      } : null,
    })) as any);
    setLoading(false);
  };

  if (loading) return <p className="text-xs text-muted-foreground">Loading references…</p>;
  if (refs.length === 0) return <p className="text-xs text-muted-foreground">No references linked.</p>;

  const statusIcon = (s: string) => {
    if (s === "completed") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (s === "opened") return <Clock className="w-4 h-4 text-primary" />;
    return <Clock className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">References ({refs.filter(r => r.status === "completed").length}/{refs.length} completed)</p>
      {refs.map(ref => {
        const isExpanded = expanded === ref.id;
        return (
          <div key={ref.id} className="border border-border rounded-lg overflow-hidden">
            <div
              className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/30 text-sm"
              onClick={() => setExpanded(isExpanded ? null : ref.id)}
            >
              {statusIcon(ref.status)}
              <span className="flex-1 font-medium">{ref.referee_name}</span>
              <Badge variant="secondary" className="text-xs capitalize">{ref.type}</Badge>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </div>
            {isExpanded && (
              <div className="border-t border-border p-3 bg-muted/20 text-sm space-y-2">
                <p className="text-xs text-muted-foreground">{ref.referee_email} · Requested {new Date(ref.created_at).toLocaleDateString()}</p>
                {ref.status === "completed" && ref.response ? (
                  <div className="bg-background rounded-lg p-3 space-y-1">
                    {Object.entries(ref.response.response_data).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground pt-1">
                      Submitted: {new Date(ref.response.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {ref.status === "opened" ? "Referee opened the form but hasn't submitted yet." : "Awaiting referee response."}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
