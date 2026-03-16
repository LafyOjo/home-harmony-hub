import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Building2, MapPin, Camera, FileImage, Trash2, ShieldCheck, Upload } from "lucide-react";

const OWNERSHIP_DOC_TYPES = [
  "Title Deed / Land Registry",
  "Mortgage Statement",
  "Property Insurance",
  "Gas Safety Certificate",
  "EICR (Electrical Certificate)",
  "EPC Certificate",
  "DBS/CRB Check",
  "Landlord Licence",
];

type OwnerDoc = { file: File; type: string };

export default function NewListing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [floorPlan, setFloorPlan] = useState<File | null>(null);
  const [ownerDocs, setOwnerDocs] = useState<OwnerDoc[]>([]);
  const [form, setForm] = useState({
    title: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    county: "",
    postcode: "",
    property_type: "",
    bedrooms: "",
    bathrooms: "",
    rent_pcm: "",
    deposit: "",
    available_from: "",
    description: "",
    furnished: "",
    parking: "",
    garden: "",
    epc_rating: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const fullAddress = [form.address_line_1, form.address_line_2, form.city, form.county]
      .filter(Boolean)
      .join(", ");

    try {
      // Upload floor plan
      let floorPlanKey: string | null = null;
      if (floorPlan) {
        const key = `${user.id}/${Date.now()}-floorplan-${floorPlan.name}`;
        const { error } = await supabase.storage.from("listing-photos").upload(key, floorPlan);
        if (error) throw error;
        floorPlanKey = key;
      }

      // Insert listing
      const { data: listing, error } = await supabase.from("listings").insert({
        owner_id: user.id,
        title: form.title,
        address: fullAddress,
        postcode: form.postcode,
        rent_pcm: parseFloat(form.rent_pcm),
        deposit: form.deposit ? parseFloat(form.deposit) : null,
        available_from: form.available_from || null,
        description: form.description || null,
        property_type: form.property_type || null,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
        furnished: form.furnished || null,
        parking: form.parking || null,
        garden: form.garden || null,
        epc_rating: form.epc_rating || null,
        floor_plan_key: floorPlanKey,
      } as any).select().single();

      if (error) throw error;

      const listingId = (listing as any).id;

      // Upload photos
      for (let i = 0; i < photos.length; i++) {
        const key = `${user.id}/${listingId}/${Date.now()}-${photos[i].name}`;
        const { error: upErr } = await supabase.storage.from("listing-photos").upload(key, photos[i]);
        if (upErr) continue;
        await (supabase as any).from("listing_photos").insert({
          listing_id: listingId,
          storage_key: key,
          display_order: i,
        });
      }

      // Upload ownership/compliance documents
      for (const doc of ownerDocs) {
        const key = `${user.id}/ownership/${listingId}/${Date.now()}-${doc.file.name}`;
        const { error: upErr } = await supabase.storage.from("documents").upload(key, doc.file);
        if (upErr) continue;
        await (supabase as any).from("documents").insert({
          user_id: user.id,
          category: doc.type,
          file_name: doc.file.name,
          storage_key: key,
          content_type: doc.file.type,
          file_size: doc.file.size,
        });
      }

      // Auto-create verification request if ownership docs uploaded
      if (ownerDocs.length > 0) {
        await supabase.from("verification_requests").insert({
          user_id: user.id,
          verification_type: "property_ownership",
          listing_id: listingId,
          status: "pending",
          document_ids: ownerDocs.map(d => d.type),
        } as any);
      }

      toast({ title: "Listing created", description: ownerDocs.length > 0 ? "Your ownership documents are under review." : undefined });
      navigate("/dashboard/listings");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  const setSelect = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const newPhotos = Array.from(files).slice(0, 10 - photos.length);
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold mb-6">Add New Property</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photos */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Camera className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Property Photos</h2>
          </div>
          <p className="text-sm text-muted-foreground">Upload up to 10 photos. The first will be the cover image.</p>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {photos.map((photo, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
                <img src={URL.createObjectURL(photo)} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                {i === 0 && <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">Cover</span>}
              </div>
            ))}
            {photos.length < 10 && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/40 transition-colors">
                <Camera className="w-6 h-6 text-muted-foreground" />
                <input type="file" className="hidden" accept="image/*" multiple onChange={e => addPhotos(e.target.files)} />
              </label>
            )}
          </div>

          {/* Floor Plan */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <FileImage className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Floor Plan</span>
            </div>
            {floorPlan ? (
              <div className="flex items-center gap-3 bg-muted rounded-lg p-2">
                <span className="text-sm flex-1 truncate">{floorPlan.name}</span>
                <Button type="button" variant="ghost" size="icon" onClick={() => setFloorPlan(null)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <div className="border border-dashed border-border rounded-lg p-3 text-center text-sm text-muted-foreground hover:border-primary/40 transition-colors">
                  Click to upload floor plan
                </div>
                <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => setFloorPlan(e.target.files?.[0] || null)} />
              </label>
            )}
          </div>
        </div>

        {/* Ownership & Compliance Documents */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Ownership & Compliance</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Upload documents proving property ownership and compliance (title deed, gas safety, EICR, DBS check, etc.). These will be reviewed for verification.
          </p>

          {ownerDocs.map((doc, i) => (
            <div key={i} className="flex items-center justify-between bg-muted/50 border border-border rounded-lg p-3">
              <div>
                <p className="text-sm font-medium">{doc.file.name}</p>
                <p className="text-xs text-muted-foreground">{doc.type}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOwnerDocs(prev => prev.filter((_, j) => j !== i))}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}

          <div className="grid sm:grid-cols-2 gap-2">
            {OWNERSHIP_DOC_TYPES.map(docType => (
              <label key={docType} className="cursor-pointer">
                <div className="flex items-center gap-3 bg-card border border-dashed border-border rounded-lg p-3 hover:border-primary/40 transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-xs">{docType}</span>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) setOwnerDocs(prev => [...prev, { file, type: docType }]);
                    e.target.value = "";
                  }}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Property Details */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Property Details</h2>
          </div>
          <div>
            <Label>Listing Title</Label>
            <Input value={form.title} onChange={set("title")} placeholder="e.g. Modern 2 Bed Flat in Shoreditch" required />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Property Type</Label>
              <Select value={form.property_type} onValueChange={setSelect("property_type")}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {["Flat/Apartment", "Terraced House", "Semi-Detached", "Detached", "Bungalow", "Studio", "HMO/Shared", "Other"].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>EPC Rating</Label>
              <Select value={form.epc_rating} onValueChange={setSelect("epc_rating")}>
                <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
                <SelectContent>
                  {["A", "B", "C", "D", "E", "F", "G"].map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label>Bedrooms</Label>
              <Input type="number" min="0" value={form.bedrooms} onChange={set("bedrooms")} placeholder="2" />
            </div>
            <div>
              <Label>Bathrooms</Label>
              <Input type="number" min="0" value={form.bathrooms} onChange={set("bathrooms")} placeholder="1" />
            </div>
            <div>
              <Label>Furnished</Label>
              <Select value={form.furnished} onValueChange={setSelect("furnished")}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Furnished">Furnished</SelectItem>
                  <SelectItem value="Unfurnished">Unfurnished</SelectItem>
                  <SelectItem value="Part Furnished">Part Furnished</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Parking</Label>
              <Select value={form.parking} onValueChange={setSelect("parking")}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="On-street">On-street</SelectItem>
                  <SelectItem value="Off-street">Off-street</SelectItem>
                  <SelectItem value="Garage">Garage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Garden</Label>
              <Select value={form.garden} onValueChange={setSelect("garden")}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Private">Private</SelectItem>
                  <SelectItem value="Shared">Shared</SelectItem>
                  <SelectItem value="Balcony">Balcony/Terrace</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Property Address</h2>
          </div>
          <div>
            <Label>Address Line 1 *</Label>
            <Input value={form.address_line_1} onChange={set("address_line_1")} placeholder="Flat 4, 12 Baker Street" required />
          </div>
          <div>
            <Label>Address Line 2</Label>
            <Input value={form.address_line_2} onChange={set("address_line_2")} placeholder="Marylebone" />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label>City / Town *</Label>
              <Input value={form.city} onChange={set("city")} placeholder="London" required />
            </div>
            <div>
              <Label>County</Label>
              <Input value={form.county} onChange={set("county")} placeholder="Greater London" />
            </div>
            <div>
              <Label>Postcode *</Label>
              <Input value={form.postcode} onChange={set("postcode")} placeholder="NW1 6XE" required />
            </div>
          </div>
        </div>

        {/* Financial */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold">Financials & Availability</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Rent (£/month) *</Label>
              <Input type="number" value={form.rent_pcm} onChange={set("rent_pcm")} placeholder="1500" required />
            </div>
            <div>
              <Label>Deposit (£)</Label>
              <Input type="number" value={form.deposit} onChange={set("deposit")} placeholder="1500" />
            </div>
          </div>
          <div>
            <Label>Available From</Label>
            <Input type="date" value={form.available_from} onChange={set("available_from")} />
          </div>
        </div>

        {/* Description */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold">Description</h2>
          <Textarea value={form.description} onChange={set("description")} rows={4} placeholder="Describe the property, nearby amenities, transport links..." />
        </div>

        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {loading ? "Creating..." : "Create Listing"}
        </Button>
      </form>
    </div>
  );
}
