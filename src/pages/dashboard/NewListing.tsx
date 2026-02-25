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
import { Building2, MapPin } from "lucide-react";

export default function NewListing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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

    const descParts = [
      form.description,
      form.property_type && `Property type: ${form.property_type}`,
      form.bedrooms && `Bedrooms: ${form.bedrooms}`,
      form.bathrooms && `Bathrooms: ${form.bathrooms}`,
      form.furnished && `Furnished: ${form.furnished}`,
      form.parking && `Parking: ${form.parking}`,
      form.garden && `Garden: ${form.garden}`,
      form.epc_rating && `EPC Rating: ${form.epc_rating}`,
    ].filter(Boolean).join("\n");

    const { error } = await supabase.from("listings").insert({
      owner_id: user.id,
      title: form.title,
      address: fullAddress,
      postcode: form.postcode,
      rent_pcm: parseFloat(form.rent_pcm),
      deposit: form.deposit ? parseFloat(form.deposit) : null,
      available_from: form.available_from || null,
      description: descParts || null,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Listing created" });
      navigate("/dashboard/listings");
    }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const setSelect = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold mb-6">Add New Property</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
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
