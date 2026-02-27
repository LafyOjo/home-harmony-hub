import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Upload, Clock, Camera, FileText, Briefcase, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState, useRef } from "react";

type Verification = {
  id: string;
  verification_type: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  document_ids: string[] | null;
};

const STEPS = [
  { type: "tenant_id", label: "Photo ID", desc: "Upload a government-issued photo ID (passport, driving licence).", icon: FileText, accept: "image/*,.pdf" },
  { type: "tenant_selfie", label: "Selfie Verification", desc: "Take or upload a clear selfie for identity matching.", icon: Camera, accept: "image/*" },
  { type: "tenant_income", label: "Proof of Income", desc: "Upload a recent payslip, bank statement, or employment contract.", icon: Briefcase, accept: "image/*,.pdf,.doc,.docx" },
];

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  pending: { icon: Clock, color: "bg-muted text-muted-foreground", label: "Pending Review" },
  verified: { icon: CheckCircle2, color: "bg-chart-2/15 text-chart-2", label: "Verified" },
  rejected: { icon: XCircle, color: "bg-destructive/15 text-destructive", label: "Rejected" },
  requires_more_info: { icon: AlertTriangle, color: "bg-chart-4/15 text-chart-4", label: "More Info Needed" },
};

export default function TenantVerification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: verifications = [] } = useQuery({
    queryKey: ["tenant-verifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("user_id", user!.id)
        .in("verification_type", STEPS.map(s => s.type))
        .order("created_at", { ascending: false });
      return (data || []) as Verification[];
    },
    enabled: !!user,
  });

  const getLatest = (type: string) => verifications.find(v => v.verification_type === type);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) { toast({ title: "Max 10 MB", variant: "destructive" }); return; }
    setUploading(type);
    try {
      const key = `${user.id}/verification/${type}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("documents").upload(key, file);
      if (uploadErr) throw uploadErr;

      await supabase.from("documents").insert({
        user_id: user.id, file_name: file.name, category: type,
        storage_key: key, content_type: file.type, file_size: file.size,
      });

      const { error } = await supabase.from("verification_requests").insert({
        user_id: user.id, verification_type: type, document_ids: [key],
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["tenant-verifications"] });
      toast({ title: "Document uploaded", description: "Your verification is being reviewed." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
      e.target.value = "";
    }
  };

  // Overall progress
  const completedCount = STEPS.filter(s => getLatest(s.type)?.status === "verified").length;
  const progressPct = Math.round((completedCount / STEPS.length) * 100);

  return (
    <div className="max-w-3xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold mb-1">Identity Verification</h1>
        <p className="text-muted-foreground">Complete all steps to verify your identity for tenancy applications.</p>
      </motion.div>

      {/* Progress bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">Verification Progress</p>
          <span className="text-sm text-muted-foreground">{completedCount}/{STEPS.length} completed</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
        {completedCount === STEPS.length && (
          <div className="flex items-center gap-2 mt-3 text-sm font-medium text-chart-2">
            <ShieldCheck className="w-4 h-4" /> Fully verified
          </div>
        )}
      </Card>

      {/* Steps */}
      {STEPS.map((step, i) => {
        const latest = getLatest(step.type);
        const config = latest ? statusConfig[latest.status] || statusConfig.pending : null;
        const canUpload = !latest || latest.status === "rejected" || latest.status === "requires_more_info";
        const StepIcon = step.icon;

        return (
          <motion.div key={step.type} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-5">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${latest?.status === "verified" ? "bg-chart-2/10" : "bg-muted"}`}>
                  <StepIcon className={`w-5 h-5 ${latest?.status === "verified" ? "text-chart-2" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{step.label}</p>
                    {config && <Badge className={config.color} variant="secondary">{config.label}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>

                  {latest && (
                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                      <p>Submitted {format(parseISO(latest.created_at), "d MMM yyyy 'at' HH:mm")}</p>
                      {latest.reviewed_at && <p>Reviewed {format(parseISO(latest.reviewed_at), "d MMM yyyy")}</p>}
                      {latest.notes && (
                        <p className="text-sm mt-1 p-2 bg-muted rounded-md">
                          <strong>Reviewer note:</strong> {latest.notes}
                        </p>
                      )}
                    </div>
                  )}

                  {canUpload && (
                    <div className="mt-3">
                      <input
                        ref={el => { fileRefs.current[step.type] = el; }}
                        type="file"
                        className="hidden"
                        accept={step.accept}
                        onChange={e => handleUpload(e, step.type)}
                      />
                      <Button
                        variant={latest ? "outline" : "default"}
                        size="sm"
                        disabled={uploading === step.type}
                        onClick={() => fileRefs.current[step.type]?.click()}
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        {uploading === step.type ? "Uploading…" : latest ? "Resubmit" : "Upload"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
