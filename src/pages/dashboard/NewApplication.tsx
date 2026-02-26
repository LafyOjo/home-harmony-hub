import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, UserCheck, Trash2 } from "lucide-react";

type ListingInfo = {
  id: string;
  title: string;
  address: string;
  postcode: string;
  rent_pcm: number;
};

type ReferenceReq = {
  id: string;
  referee_name: string;
  referee_email: string;
  type: string;
  status: string | null;
};

type UploadedDoc = {
  file: File;
  type: string;
};

const DOC_TYPES = ["Identification (Passport/Driving Licence)", "Proof of Income / Pay Stub", "Bank Statement", "Employer Reference Letter", "Previous Landlord Reference", "Other"];

export default function NewApplication() {
  const { listingId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [listing, setListing] = useState<ListingInfo | null>(null);
  const [existingRefs, setExistingRefs] = useState<ReferenceReq[]>([]);
  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // New reference fields
  const [newRefName, setNewRefName] = useState("");
  const [newRefEmail, setNewRefEmail] = useState("");
  const [newRefType, setNewRefType] = useState("employer");

  useEffect(() => {
    if (!listingId || !user) return;
    (async () => {
      const { data } = await supabase
        .from("listings")
        .select("id, title, address, postcode, rent_pcm")
        .eq("id", listingId)
        .single();
      setListing(data as any);

      const { data: refs } = await supabase
        .from("reference_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setExistingRefs((refs as ReferenceReq[]) || []);
      setLoading(false);
    })();
  }, [listingId, user]);

  const addDoc = (file: File, type: string) => {
    setDocs(prev => [...prev, { file, type }]);
  };

  const removeDoc = (index: number) => {
    setDocs(prev => prev.filter((_, i) => i !== index));
  };

  const toggleRef = (refId: string) => {
    setSelectedRefs(prev => {
      const next = new Set(prev);
      if (next.has(refId)) next.delete(refId);
      else next.add(refId);
      return next;
    });
  };

  const requestNewRef = async () => {
    if (!user || !newRefName.trim() || !newRefEmail.trim()) return;
    const { data, error } = await supabase.from("reference_requests").insert({
      user_id: user.id,
      referee_name: newRefName.trim(),
      referee_email: newRefEmail.trim(),
      type: newRefType,
    }).select().single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data) {
      setExistingRefs(prev => [data as ReferenceReq, ...prev]);
      setSelectedRefs(prev => new Set(prev).add((data as any).id));
      setNewRefName(""); setNewRefEmail("");
      toast({ title: "Reference requested" });
    }
  };

  const handleSubmit = async () => {
    if (!user || !listing) return;
    setSubmitting(true);

    try {
      // Create application
      const { data: app, error: appErr } = await supabase.from("applications").insert({
        tenant_id: user.id,
        listing_id: listing.id,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      }).select().single();
      if (appErr) throw appErr;

      const appId = (app as any).id;

      // Upload documents
      for (const doc of docs) {
        const key = `${user.id}/applications/${appId}/${Date.now()}-${doc.file.name}`;
        const { error: upErr } = await supabase.storage.from("documents").upload(key, doc.file);
        if (upErr) throw upErr;

        await (supabase as any).from("application_documents").insert({
          application_id: appId,
          document_type: doc.type,
          file_name: doc.file.name,
          storage_key: key,
          uploaded_by: user.id,
        });
      }

      // Link references
      for (const refId of selectedRefs) {
        await (supabase as any).from("application_references").insert({
          application_id: appId,
          reference_request_id: refId,
        });
      }

      toast({ title: "Application submitted!" });
      navigate("/dashboard/applications");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;
  if (!listing) return <div className="text-muted-foreground">Listing not found</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold mb-2">Apply for Property</h1>
      <Card className="p-4 mb-6">
        <p className="font-medium">{listing.title}</p>
        <p className="text-sm text-muted-foreground">{listing.address}, {listing.postcode}</p>
        <p className="font-display text-lg font-bold text-primary mt-1">£{listing.rent_pcm}/month</p>
      </Card>

      {/* Documents Upload */}
      <div className="space-y-4 mb-8">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" /> Supporting Documents
        </h2>
        <p className="text-sm text-muted-foreground">Upload identification, proof of income, and other supporting documents.</p>

        {docs.map((doc, i) => (
          <div key={i} className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
            <div>
              <p className="text-sm font-medium">{doc.file.name}</p>
              <p className="text-xs text-muted-foreground">{doc.type}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeDoc(i)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}

        {DOC_TYPES.map(docType => (
          <label key={docType} className="cursor-pointer">
            <div className="flex items-center gap-3 bg-card border border-dashed border-border rounded-lg p-3 hover:border-primary/40 transition-colors">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{docType}</span>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) addDoc(file, docType);
                e.target.value = "";
              }}
            />
          </label>
        ))}
      </div>

      {/* References */}
      <div className="space-y-4 mb-8">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-primary" /> References
        </h2>
        <p className="text-sm text-muted-foreground">Attach existing references or request new ones.</p>

        {/* Existing refs */}
        {existingRefs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your References</p>
            {existingRefs.map(ref => (
              <label key={ref.id} className="flex items-center gap-3 bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-primary/30">
                <Checkbox
                  checked={selectedRefs.has(ref.id)}
                  onCheckedChange={() => toggleRef(ref.id)}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{ref.referee_name}</p>
                  <p className="text-xs text-muted-foreground">{ref.type} • {ref.referee_email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${ref.status === "completed" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                  {ref.status || "sent"}
                </span>
              </label>
            ))}
          </div>
        )}

        {/* Request new reference */}
        <Card className="p-4 space-y-3">
          <p className="text-sm font-medium">Request a New Reference</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Referee Name</Label>
              <Input value={newRefName} onChange={e => setNewRefName(e.target.value)} placeholder="John Smith" />
            </div>
            <div>
              <Label className="text-xs">Referee Email</Label>
              <Input type="email" value={newRefEmail} onChange={e => setNewRefEmail(e.target.value)} placeholder="john@company.com" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={newRefType}
              onChange={e => setNewRefType(e.target.value)}
              className="border border-input rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="employer">Employer</option>
              <option value="landlord">Previous Landlord</option>
              <option value="character">Character</option>
            </select>
            <Button size="sm" variant="outline" onClick={requestNewRef} disabled={!newRefName.trim() || !newRefEmail.trim()}>
              Send Request
            </Button>
          </div>
        </Card>
      </div>

      {/* Submit */}
      <Button onClick={handleSubmit} disabled={submitting} className="w-full" size="lg">
        {submitting ? "Submitting..." : "Submit Application"}
      </Button>
    </div>
  );
}
