import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertCircle } from "lucide-react";

type ListingInfo = {
  id: string;
  title: string;
  address: string;
  postcode: string;
  rent_pcm: number;
};

export default function Apply() {
  const { token } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [listing, setListing] = useState<ListingInfo | null>(null);
  const [linkId, setLinkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    supabase
      .from("listing_apply_links")
      .select("id, listing_id, listings(id, title, address, postcode, rent_pcm)")
      .eq("token", token)
      .single()
      .then(({ data, error }) => {
        if (data?.listings) {
          setListing(data.listings as any);
          setLinkId(data.id);
        }
        setLoading(false);
      });
  }, [token]);

  const handleApply = async () => {
    if (!user || !listing || !linkId) {
      navigate(`/auth/login`);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("applications").insert({
      tenant_id: user.id,
      listing_id: listing.id,
      apply_link_id: linkId,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Application submitted!" });
      navigate("/dashboard/applications");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-xl font-bold mb-2">Invalid or Expired Link</h1>
          <p className="text-muted-foreground text-sm">This apply link is no longer valid.</p>
          <Link to="/"><Button variant="outline" className="mt-4">Go Home</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <Link to="/" className="font-display text-xl font-bold text-primary">TenantVault</Link>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <h1 className="font-display text-xl font-bold mb-4">Apply for this property</h1>
          <div className="space-y-2 mb-6">
            <p className="font-medium">{listing.title}</p>
            <p className="text-sm text-muted-foreground">{listing.address}, {listing.postcode}</p>
            <p className="font-display text-lg font-bold text-primary">£{listing.rent_pcm}/month</p>
          </div>
          {user ? (
            <Button onClick={handleApply} disabled={submitting} className="w-full">
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-3">You need an account to apply.</p>
              <Link to={`/auth/register?role=tenant`}>
                <Button className="w-full">Create Account & Apply</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
