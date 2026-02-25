import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Upload, Building2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";

export default function LandlordVerification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string>("");

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

  const { data: listings } = useQuery({
    queryKey: ["landlord-listings", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("id, title, address")
        .eq("owner_id", user!.id)
        .order("title");
      return data;
    },
    enabled: !!user,
  });

  const landlordVerification = verifications?.find(v => v.verification_type === "landlord_id");
  const propertyVerifications = verifications?.filter(v => v.verification_type === "property") ?? [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "landlord_id" | "property") => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (type === "property" && !selectedListingId) {
      toast({ title: "Please select a property first", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const key = `${user.id}/verification/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("documents").upload(key, file);
      if (uploadErr) throw uploadErr;

      await supabase.from("documents").insert({
        user_id: user.id, file_name: file.name, category: type === "landlord_id" ? "ID" : "Property",
        storage_key: key, content_type: file.type, file_size: file.size,
      });

      const insertData: any = {
        user_id: user.id, verification_type: type, document_ids: [key],
      };
      if (type === "property") insertData.listing_id = selectedListingId;

      const { error } = await supabase.from("verification_requests").insert(insertData);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["landlord-verifications"] });
      toast({ title: "Verification submitted" });
      setSelectedListingId("");
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally { setUploading(false); }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "verified": return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
      case "rejected": return "bg-destructive text-destructive-foreground";
      case "requires_more_info": return "bg-amber-500/15 text-amber-600 border-amber-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const listingName = (listingId: string | null) => {
    if (!listingId || !listings) return null;
    const l = listings.find(x => x.id === listingId);
    return l ? l.title : null;
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
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${landlordVerification?.status === 'verified' ? 'bg-emerald-500/10' : 'bg-muted'}`}>
            <ShieldCheck className={`w-5 h-5 ${landlordVerification?.status === 'verified' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
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
        </div>

        {/* Listing selector + upload */}
        <Card className="p-4 mb-4">
          <p className="text-sm text-muted-foreground mb-3">Select a property then upload proof of ownership (deed, land registry, etc.)</p>
          <div className="flex items-center gap-3">
            <Select value={selectedListingId} onValueChange={setSelectedListingId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a property…" />
              </SelectTrigger>
              <SelectContent>
                {listings?.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.title} — {l.address}</SelectItem>
                ))}
                {(!listings || listings.length === 0) && (
                  <SelectItem value="_none" disabled>No listings found</SelectItem>
                )}
              </SelectContent>
            </Select>
            <label className="cursor-pointer">
              <Button size="sm" disabled={!selectedListingId || uploading} asChild>
                <span><Upload className="w-4 h-4 mr-1" />{uploading ? "Uploading…" : "Upload"}</span>
              </Button>
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => handleUpload(e, "property")} disabled={!selectedListingId} />
            </label>
          </div>
        </Card>

        {propertyVerifications.map(v => (
          <Card key={v.id} className="p-4 mb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{listingName(v.listing_id) || "Property verification"}</p>
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
