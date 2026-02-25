import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Upload, Clock, Building2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";

export default function LandlordVerification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<"landlord_id" | "property">("landlord_id");

  const { data: verifications } = useQuery({
    queryKey: ["landlord-verifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data;
    },
    enabled: !!user,
  });

  const landlordVerification = verifications?.find(v => v.verification_type === "landlord_id");
  const propertyVerifications = verifications?.filter(v => v.verification_type === "property") ?? [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "landlord_id" | "property") => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const key = `${user.id}/verification/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("documents").upload(key, file);
      if (uploadErr) throw uploadErr;

      await supabase.from("documents").insert({
        user_id: user.id, file_name: file.name, category: type === "landlord_id" ? "ID" : "Property",
        storage_key: key, content_type: file.type, file_size: file.size,
      });

      const { error } = await supabase.from("verification_requests").insert({
        user_id: user.id, verification_type: type, document_ids: [key],
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["landlord-verifications"] });
      toast({ title: "Verification submitted" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally { setUploading(false); }
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
        <h1 className="font-display text-3xl font-bold mb-1">Verification</h1>
        <p className="text-muted-foreground">Verify your identity and properties</p>
      </motion.div>

      {/* Landlord ID */}
      <Card className="p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${landlordVerification?.status === 'verified' ? 'bg-success/10' : 'bg-muted'}`}>
            <ShieldCheck className={`w-5 h-5 ${landlordVerification?.status === 'verified' ? 'text-success' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex-1">
            <p className="font-medium">Landlord Identity</p>
            {landlordVerification ? (
              <Badge className={statusColor(landlordVerification.status)}>{landlordVerification.status.replace("_"," ")}</Badge>
            ) : <span className="text-sm text-muted-foreground">Not submitted</span>}
          </div>
          {!landlordVerification && (
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild><span><Upload className="w-4 h-4 mr-1" />Upload ID</span></Button>
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => handleUpload(e, "landlord_id")} />
            </label>
          )}
        </div>
      </Card>

      {/* Property Verifications */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold">Property Verification</h2>
          <label className="cursor-pointer">
            <Button size="sm"><Upload className="w-4 h-4 mr-1" />Verify Property</Button>
            <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => handleUpload(e, "property")} />
          </label>
        </div>
        {propertyVerifications.map(v => (
          <Card key={v.id} className="p-4 mb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm">Property verification</p>
                <p className="text-xs text-muted-foreground">{format(parseISO(v.created_at!), "d MMM yyyy")}</p>
              </div>
            </div>
            <Badge className={statusColor(v.status)}>{v.status.replace("_"," ")}</Badge>
          </Card>
        ))}
        {propertyVerifications.length === 0 && <p className="text-sm text-muted-foreground">No property verifications submitted.</p>}
      </div>
    </div>
  );
}
