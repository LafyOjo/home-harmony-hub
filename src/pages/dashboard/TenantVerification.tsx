import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Upload, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";

export default function TenantVerification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: verification } = useQuery({
    queryKey: ["tenant-verification", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("user_id", user!.id)
        .eq("verification_type", "tenant_id")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const handleUploadAndVerify = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const key = `${user.id}/verification/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("documents").upload(key, file);
      if (uploadErr) throw uploadErr;

      // Save document record
      await supabase.from("documents").insert({
        user_id: user.id,
        file_name: file.name,
        category: "ID",
        storage_key: key,
        content_type: file.type,
        file_size: file.size,
      });

      // Create verification request
      const { error: verErr } = await supabase.from("verification_requests").insert({
        user_id: user.id,
        verification_type: "tenant_id",
        document_ids: [key],
      });
      if (verErr) throw verErr;

      queryClient.invalidateQueries({ queryKey: ["tenant-verification"] });
      toast({ title: "ID uploaded", description: "Your verification is being reviewed." });
    } catch {
      toast({ title: "Error", description: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "verified": return "bg-success text-success-foreground";
      case "rejected": return "bg-destructive text-destructive-foreground";
      case "requires_more_info": return "bg-warning text-warning-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold mb-1">ID Verification</h1>
        <p className="text-muted-foreground">Verify your identity for tenancy applications</p>
      </motion.div>

      {verification ? (
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${verification.status === 'verified' ? 'bg-success/10' : 'bg-muted'}`}>
              {verification.status === "verified" ? <ShieldCheck className="w-6 h-6 text-success" /> : <Clock className="w-6 h-6 text-muted-foreground" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium">Identity Verification</p>
                <Badge className={statusColor(verification.status)}>{verification.status.replace("_", " ")}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Submitted {format(parseISO(verification.created_at!), "d MMM yyyy")}
                {verification.notes && ` · ${verification.notes}`}
              </p>
            </div>
          </div>
          {verification.status === "requires_more_info" && (
            <div className="mt-4">
              <label className="cursor-pointer">
                <Button variant="outline" asChild><span><Upload className="w-4 h-4 mr-2" />Upload Additional Document</span></Button>
                <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleUploadAndVerify} />
              </label>
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-8 text-center space-y-4">
          <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto" />
          <div>
            <p className="font-medium mb-1">Not yet verified</p>
            <p className="text-sm text-muted-foreground mb-4">Upload a government-issued photo ID (passport, driving licence) to verify your identity.</p>
          </div>
          <label className="cursor-pointer inline-block">
            <Button disabled={uploading}><Upload className="w-4 h-4 mr-2" />{uploading ? "Uploading..." : "Upload ID Document"}</Button>
            <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleUploadAndVerify} />
          </label>
        </Card>
      )}
    </div>
  );
}
