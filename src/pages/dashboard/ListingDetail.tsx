import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, Link as LinkIcon, QrCode } from "lucide-react";

type Listing = {
  id: string;
  title: string;
  address: string;
  postcode: string;
  rent_pcm: number;
  deposit: number | null;
  available_from: string | null;
  description: string | null;
};

type ApplyLink = {
  id: string;
  token: string;
  created_at: string;
};

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [applyLinks, setApplyLinks] = useState<ApplyLink[]>([]);

  useEffect(() => {
    if (!id) return;
    supabase.from("listings").select("*").eq("id", id).single().then(({ data }) => setListing(data as any));
    supabase.from("listing_apply_links").select("*").eq("listing_id", id).order("created_at", { ascending: false }).then(({ data }) => setApplyLinks((data as any) || []));
  }, [id]);

  const generateLink = async () => {
    if (!id) return;
    const { error } = await supabase.from("listing_apply_links").insert({ listing_id: id });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Apply link generated" });
      supabase.from("listing_apply_links").select("*").eq("listing_id", id).order("created_at", { ascending: false }).then(({ data }) => setApplyLinks((data as any) || []));
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/apply/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard" });
  };

  if (!listing) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold mb-2">{listing.title}</h1>
      <p className="text-muted-foreground mb-6">{listing.address}, {listing.postcode}</p>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Rent</p>
          <p className="font-display text-xl font-bold text-primary">£{listing.rent_pcm}/mo</p>
        </div>
        {listing.deposit && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Deposit</p>
            <p className="font-display text-xl font-bold">£{listing.deposit}</p>
          </div>
        )}
        {listing.available_from && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="font-display text-xl font-bold">{listing.available_from}</p>
          </div>
        )}
      </div>

      {listing.description && (
        <div className="bg-card border border-border rounded-xl p-5 mb-8">
          <p className="text-sm">{listing.description}</p>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold">Apply Links</h2>
          <Button size="sm" onClick={generateLink} className="gap-2">
            <LinkIcon className="w-4 h-4" /> Generate Link
          </Button>
        </div>
        <div className="space-y-2">
          {applyLinks.map(link => (
            <div key={link.id} className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
              <code className="text-xs text-muted-foreground flex-1 truncate">
                {window.location.origin}/apply/{link.token}
              </code>
              <Button variant="ghost" size="icon" onClick={() => copyLink(link.token)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {applyLinks.length === 0 && (
            <p className="text-sm text-muted-foreground">No apply links yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
