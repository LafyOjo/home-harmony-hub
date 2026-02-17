import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Building2, ExternalLink } from "lucide-react";

type Listing = {
  id: string;
  title: string;
  address: string;
  postcode: string;
  rent_pcm: number;
  is_active: boolean;
  created_at: string;
};

export default function Listings() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("listings")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setListings((data as Listing[]) || []));
  }, [user]);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Listings</h1>
        <Link to="/dashboard/listings/new">
          <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> New Listing</Button>
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No listings yet. Create your first property listing.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map(listing => (
            <Link
              key={listing.id}
              to={`/dashboard/listings/${listing.id}`}
              className="block bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{listing.title}</p>
                  <p className="text-sm text-muted-foreground">{listing.address}, {listing.postcode}</p>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-primary">£{listing.rent_pcm}</p>
                  <p className="text-xs text-muted-foreground">per month</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
