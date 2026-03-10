import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MapPin, Bed, Bath, Car, Trees, Zap, Home, ChevronLeft, ChevronRight } from "lucide-react";
import BookViewingDialog from "@/components/BookViewingDialog";

type Listing = {
  id: string;
  title: string;
  address: string;
  postcode: string;
  rent_pcm: number;
  deposit: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  property_type: string | null;
  furnished: string | null;
  parking: string | null;
  garden: string | null;
  epc_rating: string | null;
  available_from: string | null;
  description: string | null;
  owner_id: string;
};

export default function ListingPublicDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [floorPlanUrl, setFloorPlanUrl] = useState<string | null>(null);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("listings")
        .select("id, title, address, postcode, rent_pcm, deposit, bedrooms, bathrooms, property_type, furnished, parking, garden, epc_rating, available_from, description, floor_plan_key, owner_id")
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (data) {
        setListing(data as any);
        if ((data as any).floor_plan_key) {
          const { data: fpUrl } = supabase.storage.from("listing-photos").getPublicUrl((data as any).floor_plan_key);
          setFloorPlanUrl(fpUrl.publicUrl);
        }
      }

      const { data: photos } = await (supabase as any)
        .from("listing_photos")
        .select("storage_key")
        .eq("listing_id", id)
        .order("display_order", { ascending: true });

      if (photos) {
        setPhotoUrls(photos.map((p: any) => {
          const { data: urlData } = supabase.storage.from("listing-photos").getPublicUrl(p.storage_key);
          return urlData.publicUrl;
        }));
      }
      setLoading(false);
    })();
  }, [id]);

  const handleApply = () => {
    if (!user) {
      navigate(`/auth/register?role=tenant&redirect=/listings/${id}`);
    } else {
      navigate(`/dashboard/applications/new/${id}`);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!listing) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Listing not found</div>;

  const amenities = [
    listing.bedrooms != null && { icon: Bed, label: `${listing.bedrooms} Bedroom${listing.bedrooms !== 1 ? "s" : ""}` },
    listing.bathrooms != null && { icon: Bath, label: `${listing.bathrooms} Bathroom${listing.bathrooms !== 1 ? "s" : ""}` },
    listing.parking && listing.parking !== "None" && { icon: Car, label: listing.parking },
    listing.garden && listing.garden !== "None" && { icon: Trees, label: listing.garden },
    listing.epc_rating && { icon: Zap, label: `EPC ${listing.epc_rating}` },
  ].filter(Boolean) as { icon: any; label: string }[];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/listings" className="font-display text-xl font-bold text-primary">TenantVault</Link>
          <div className="flex gap-2">
            {user ? (
              <Link to="/dashboard"><Button variant="ghost" size="sm">Dashboard</Button></Link>
            ) : (
              <>
                <Link to="/auth/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
                <Link to="/auth/register?role=tenant"><Button size="sm">Create Account</Button></Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Link to="/listings" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Back to listings
        </Link>

        {/* Photo Gallery */}
        {photoUrls.length > 0 ? (
          <div className="relative rounded-xl overflow-hidden mt-4 mb-6 aspect-[16/9] bg-muted">
            <img src={photoUrls[currentPhoto]} alt={listing.title} className="w-full h-full object-cover" />
            {photoUrls.length > 1 && (
              <>
                <button onClick={() => setCurrentPhoto(p => (p - 1 + photoUrls.length) % photoUrls.length)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-card/80 rounded-full p-2 hover:bg-card">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => setCurrentPhoto(p => (p + 1) % photoUrls.length)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-card/80 rounded-full p-2 hover:bg-card">
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-card/80 rounded-full px-3 py-1 text-xs">
                  {currentPhoto + 1} / {photoUrls.length}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-muted aspect-[16/9] flex items-center justify-center mt-4 mb-6">
            <Home className="w-16 h-16 text-muted-foreground/30" />
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="font-display text-2xl font-bold">{listing.title}</h1>
              <p className="text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" /> {listing.address}, {listing.postcode}
              </p>
            </div>

            {/* Amenities */}
            {amenities.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {amenities.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 text-sm">
                    <a.icon className="w-4 h-4 text-primary" />
                    <span>{a.label}</span>
                  </div>
                ))}
                {listing.furnished && (
                  <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 text-sm">
                    <Home className="w-4 h-4 text-primary" />
                    <span>{listing.furnished}</span>
                  </div>
                )}
                {listing.property_type && (
                  <Badge variant="secondary">{listing.property_type}</Badge>
                )}
              </div>
            )}

            {listing.description && (
              <Card className="p-5">
                <h2 className="font-display text-lg font-semibold mb-3">Description</h2>
                <p className="text-sm whitespace-pre-line">{listing.description}</p>
              </Card>
            )}

            {/* Floor Plan */}
            {floorPlanUrl && (
              <Card className="p-5">
                <h2 className="font-display text-lg font-semibold mb-3">Floor Plan</h2>
                <img src={floorPlanUrl} alt="Floor plan" className="w-full rounded-lg" />
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card className="p-5 sticky top-24">
              <p className="font-display text-2xl font-bold text-primary">£{listing.rent_pcm}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
              {listing.deposit && <p className="text-sm text-muted-foreground mt-1">Deposit: £{listing.deposit}</p>}
              {listing.available_from && <p className="text-sm text-muted-foreground mt-1">Available: {listing.available_from}</p>}

              <Button onClick={handleApply} className="w-full mt-6" size="lg">
                {user ? "Apply Now" : "Create Account to Apply"}
              </Button>
              {user && (
                <div className="mt-2">
                  <BookViewingDialog listingId={listing.id} landlordId={listing.owner_id} listingTitle={listing.title} />
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center mt-2">
                {user ? "Submit your application or book a viewing" : "Sign up free to apply for this property"}
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
