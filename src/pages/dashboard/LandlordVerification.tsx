import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Upload, Building2, Clock, CheckCircle2, XCircle, AlertTriangle, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState, useRef } from "react";

type Verification = {
  id: string;
  verification_type: string;
  status: string;
  notes: string | null;
  listing_id: string | null;
  created_at: string;
  reviewed_at: string | null;
  document_ids: string[] | null;
};

const statusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: "bg-muted text-muted-foreground", label: "Pending" },
  verified: { color: "bg-chart-2/15 text-chart-2", label: "Verified" },
  rejected: { color: "bg-destructive/15 text-destructive", label: "Rejected" },
  requires_more_info: { color: "bg-chart-4/15 text-chart-4", label: "More Info Needed" },
};

export default function LandlordVerification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState("");
  const idRef = useRef<HTMLInputElement>(null);
  const propRef = useRef<HTMLInputElement>(null);

  const { data: verifications = [] } = useQuery({
    queryKey: ["landlord-verifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("verification_requests").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return (data || []) as Verification[];
    },
    enabled: !!user,
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["landlord-listings", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("id, title, address").eq("owner_id", user!.id).order("title");
      return data || [];
    },
    enabled: !!user,
  });

  const landlordId = verifications.find(v => v.verification_type === "landlord_id");
  const propertyVers = verifications.filter(v => v.verification_type === "property");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "landlord_id" | "property") => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (type === "property" && !selectedListingId) { toast({ title: "Select a property first", variant: "destructive" }); return; }
    if (file.size > 10 * 1024 * 1024) { toast({ title: "Max 10 MB", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const key = `${user.id}/verification/${type}/${Date.now()}-${file.name}`;
      await supabase.storage.from("documents").upload(key, file);
      await supabase.from("documents").insert({
        user_id: user.id, file_name: file.name,
        category: type === "landlord_id" ? "ID" : "Property",
        storage_key: key, content_type: file.type, file_size: file.size,
      });
      const insert: any = { user_id: user.id, verification_type: type, document_ids: [key] };
      if (type === "property") insert.listing_id = selectedListingId;
      const { error } = await supabase.from("verification_requests").insert(insert);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["landlord-verifications"] });
      toast({ title: "Verification submitted" });
      setSelectedListingId("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setUploading(false); e.target.value = ""; }
  };

  const canResubmit = (v: Verification) => v.status === "rejected" || v.status === "requires_more_info";
  const listingName = (id: string | null) => listings.find(l => l.id === id)?.title || "Property";

  const StatusBadge = ({ status }: { status: string }) => {
    const c = statusConfig[status] || statusConfig.pending;
    return <Badge className={c.color} variant="secondary">{c.label}</Badge>;
  };

  return (
    <div className="max-w-3xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold mb-1">Verification</h1>
        <p className="text-muted-foreground">Verify your identity and prove property ownership.</p>
      </motion.div>

      {/* Landlord ID */}
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${landlordId?.status === "verified" ? "bg-chart-2/10" : "bg-muted"}`}>
            <ShieldCheck className={`w-5 h-5 ${landlordId?.status === "verified" ? "text-chart-2" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium">Landlord Identity</p>
              {landlordId ? <StatusBadge status={landlordId.status} /> : <span className="text-sm text-muted-foreground">Not submitted</span>}
            </div>
            <p className="text-sm text-muted-foreground">Upload a government-issued photo ID to verify your identity.</p>
            {landlordId?.notes && (
              <p className="text-sm mt-2 p-2 bg-muted rounded-md"><strong>Reviewer:</strong> {landlordId.notes}</p>
            )}
            {landlordId?.reviewed_at && (
              <p className="text-xs text-muted-foreground mt-1">Reviewed {format(parseISO(landlordId.reviewed_at), "d MMM yyyy")}</p>
            )}
            {(!landlordId || canResubmit(landlordId)) && (
              <div className="mt-3">
                <input ref={idRef} type="file" className="hidden" accept="image/*,.pdf" onChange={e => handleUpload(e, "landlord_id")} />
                <Button variant={landlordId ? "outline" : "default"} size="sm" disabled={uploading} onClick={() => idRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-1" />{landlordId ? "Resubmit" : "Upload ID"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Property Verifications */}
      <div>
        <h2 className="font-display text-lg font-semibold mb-3">Property Ownership</h2>

        <Card className="p-4 mb-4">
          <p className="text-sm text-muted-foreground mb-3">Upload proof of ownership (Land Registry title, deed, utility bill in your name).</p>
          <div className="flex items-center gap-3">
            <Select value={selectedListingId} onValueChange={setSelectedListingId}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Select a property…" /></SelectTrigger>
              <SelectContent>
                {listings.map(l => <SelectItem key={l.id} value={l.id}>{l.title} — {l.address}</SelectItem>)}
                {listings.length === 0 && <SelectItem value="_none" disabled>No listings</SelectItem>}
              </SelectContent>
            </Select>
            <input ref={propRef} type="file" className="hidden" accept="image/*,.pdf" onChange={e => handleUpload(e, "property")} />
            <Button size="sm" disabled={!selectedListingId || uploading} onClick={() => propRef.current?.click()}>
              <Upload className="w-4 h-4 mr-1" />{uploading ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </Card>

        <div className="space-y-2">
          {propertyVers.map(v => (
            <Card key={v.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{listingName(v.listing_id)}</p>
                    <p className="text-xs text-muted-foreground">{format(parseISO(v.created_at!), "d MMM yyyy")}</p>
                    {v.notes && <p className="text-xs mt-1 text-muted-foreground"><strong>Note:</strong> {v.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={v.status} />
                  {canResubmit(v) && (
                    <label className="cursor-pointer">
                      <Button variant="ghost" size="sm"><Upload className="w-3 h-3" /></Button>
                      <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => handleUpload(e, "property")} />
                    </label>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {propertyVers.length === 0 && <p className="text-sm text-muted-foreground">No property verifications submitted.</p>}
        </div>
      </div>
    </div>
  );
}
