import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Bed, Bath, SlidersHorizontal, X, Home, LayoutDashboard } from "lucide-react";

type ListingResult = {
  id: string;
  title: string;
  address: string;
  postcode: string;
  rent_pcm: number;
  bedrooms: number | null;
  bathrooms: number | null;
  property_type: string | null;
  furnished: string | null;
  epc_rating: string | null;
  available_from: string | null;
  description: string | null;
};

type ListingPhoto = {
  listing_id: string;
  storage_key: string;
};

export default function SearchListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState<ListingResult[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minBeds, setMinBeds] = useState("");
  const [propertyType, setPropertyType] = useState("");

  const fetchListings = async () => {
    setLoading(true);
    let query = supabase
      .from("listings")
      .select("id, title, address, postcode, rent_pcm, bedrooms, bathrooms, property_type, furnished, epc_rating, available_from, description")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (search.trim()) {
      query = query.or(`title.ilike.%${search.trim()}%,address.ilike.%${search.trim()}%,postcode.ilike.%${search.trim()}%`);
    }
    if (minPrice) query = query.gte("rent_pcm", parseFloat(minPrice));
    if (maxPrice) query = query.lte("rent_pcm", parseFloat(maxPrice));
    if (minBeds) query = query.gte("bedrooms", parseInt(minBeds));
    if (propertyType) query = query.eq("property_type", propertyType);

    const { data } = await query;
    const results = (data as ListingResult[]) || [];
    setListings(results);

    // Fetch first photo for each listing
    if (results.length > 0) {
      const ids = results.map(l => l.id);
      const { data: photoData } = await (supabase as any)
        .from("listing_photos")
        .select("listing_id, storage_key")
        .in("listing_id", ids)
        .order("display_order", { ascending: true });

      const photoMap: Record<string, string> = {};
      (photoData as ListingPhoto[] || []).forEach(p => {
        if (!photoMap[p.listing_id]) {
          const { data: urlData } = supabase.storage.from("listing-photos").getPublicUrl(p.storage_key);
          photoMap[p.listing_id] = urlData.publicUrl;
        }
      });
      setPhotos(photoMap);
    }

    setLoading(false);
  };

  useEffect(() => { fetchListings(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchListings();
  };

  const clearFilters = () => {
    setSearch(""); setMinPrice(""); setMaxPrice(""); setMinBeds(""); setPropertyType("");
    setTimeout(fetchListings, 0);
  };

  const hasActiveFilters = search || minPrice || maxPrice || minBeds || propertyType;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-xl font-bold text-primary">TenantVault</Link>
          <div className="flex gap-2">
            <Link to="/auth/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
            <Link to="/auth/register?role=tenant"><Button size="sm">Create Account</Button></Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-6">Find Your Next Home</h1>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by location, postcode, or keyword..."
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
            <Button type="button" variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2">
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </Button>
          </form>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-card border border-border rounded-xl p-4 mb-6 grid sm:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Min Rent (£)</label>
              <Input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="500" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Max Rent (£)</label>
              <Input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="3000" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Min Bedrooms</label>
              <Select value={minBeds} onValueChange={setMinBeds}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1+</SelectItem>
                  <SelectItem value="2">2+</SelectItem>
                  <SelectItem value="3">3+</SelectItem>
                  <SelectItem value="4">4+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Property Type</label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  {["Flat/Apartment", "Terraced House", "Semi-Detached", "Detached", "Bungalow", "Studio", "HMO/Shared"].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <X className="w-3 h-3" /> Clear Filters
              </Button>
              <Button size="sm" onClick={fetchListings} className="ml-2">Apply Filters</Button>
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <p className="text-sm text-muted-foreground mb-4">{listings.length} result{listings.length !== 1 ? "s" : ""} found</p>
        )}

        {/* Results */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading listings...</div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16">
            <Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold mb-2">No listings found</h2>
            <p className="text-muted-foreground">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map(listing => (
              <Link
                key={listing.id}
                to={`/listings/${listing.id}`}
                className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all group"
              >
                {/* Photo */}
                <div className="aspect-[16/10] bg-muted relative overflow-hidden">
                  {photos[listing.id] ? (
                    <img src={photos[listing.id]} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="w-10 h-10 text-muted-foreground/40" />
                    </div>
                  )}
                  {listing.epc_rating && (
                    <Badge className="absolute top-2 right-2 bg-card/90 text-foreground text-xs">EPC {listing.epc_rating}</Badge>
                  )}
                </div>

                <div className="p-4">
                  <p className="font-display text-lg font-bold text-primary">£{listing.rent_pcm}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                  <p className="font-medium mt-1 line-clamp-1">{listing.title}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {listing.address}, {listing.postcode}
                  </p>

                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    {listing.bedrooms != null && (
                      <span className="flex items-center gap-1"><Bed className="w-3.5 h-3.5" /> {listing.bedrooms} bed</span>
                    )}
                    {listing.bathrooms != null && (
                      <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" /> {listing.bathrooms} bath</span>
                    )}
                    {listing.property_type && <span>{listing.property_type}</span>}
                    {listing.furnished && <span>{listing.furnished}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
