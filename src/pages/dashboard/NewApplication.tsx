import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, UserCheck, Trash2, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";

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

const REQUIRED_DOC_TYPES = [
  { type: "Identification (Passport/Driving Licence)", required: true, desc: "Government-issued photo ID" },
  { type: "Proof of Income / Pay Stub", required: true, desc: "Last 3 months payslips or tax return" },
  { type: "Bank Statement", required: true, desc: "Last 3 months showing regular income" },
  { type: "Employer Reference Letter", required: false, desc: "Confirmation of employment & salary" },
  { type: "Previous Landlord Reference", required: false, desc: "Character & payment history" },
  { type: "Proof of Address", required: false, desc: "Utility bill or council tax statement" },
];

const READINESS_CHECKLIST = [
  { key: "employed", label: "I am currently employed or have a stable income source" },
  { key: "afford", label: "I can afford the monthly rent (recommended: ≤35% of gross income)" },
  { key: "id", label: "I have valid photo ID (passport or driving licence)" },
  { key: "references", label: "I can provide employer and/or previous landlord references" },
  { key: "credit", label: "I consent to a credit and background check" },
  { key: "deposit", label: "I can pay a deposit (typically 5 weeks' rent)" },
];

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
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  // New reference fields
  const [newRefName, setNewRefName] = useState("");
  const [newRefEmail, setNewRefEmail] = useState("");
  const [newRefType, setNewRefType] = useState("employer");

  // Employment info
  const [employment, setEmployment] = useState({ employer: "", job_title: "", annual_income: "", start_date: "" });

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

      // Load existing employment
      const { data: emp } = await supabase
        .from("tenant_employment")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (emp) {
        setEmployment({
          employer: emp.employer_name,
          job_title: emp.job_title,
          annual_income: emp.annual_income?.toString() || "",
          start_date: emp.start_date,
        });
      }

      setLoading(false);
    })();
  }, [listingId, user]);

  const addDoc = (file: File, type: string) => setDocs(prev => [...prev, { file, type }]);
  const removeDoc = (index: number) => setDocs(prev => prev.filter((_, i) => i !== index));
  const toggleRef = (refId: string) => {
    setSelectedRefs(prev => {
      const next = new Set(prev);
      if (next.has(refId)) next.delete(refId); else next.add(refId);
      return next;
    });
  };
  const toggleChecklist = (key: string) => setChecklist(prev => ({ ...prev, [key]: !prev[key] }));

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

  // Readiness score
  const requiredDocsUploaded = REQUIRED_DOC_TYPES.filter(d => d.required).every(d => docs.some(doc => doc.type === d.type));
  const checklistComplete = READINESS_CHECKLIST.every(item => checklist[item.key]);
  const hasEmployment = !!employment.employer && !!employment.job_title && !!employment.annual_income;
  const affordabilityRatio = listing && employment.annual_income
    ? listing.rent_pcm / (parseFloat(employment.annual_income) / 12)
    : null;
  const isAffordable = affordabilityRatio !== null && affordabilityRatio <= 0.45;
  const canSubmit = requiredDocsUploaded && checklistComplete && hasEmployment;

  const handleSubmit = async () => {
    if (!user || !listing) return;
    if (!canSubmit) {
      toast({ title: "Incomplete application", description: "Please complete all required sections before submitting.", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    try {
      // Upsert employment info
      const { data: existingEmp } = await supabase
        .from("tenant_employment")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (existingEmp) {
        await supabase.from("tenant_employment").update({
          employer_name: employment.employer,
          job_title: employment.job_title,
          annual_income: parseFloat(employment.annual_income),
          start_date: employment.start_date || new Date().toISOString().split("T")[0],
        }).eq("id", existingEmp.id);
      } else {
        await supabase.from("tenant_employment").insert({
          user_id: user.id,
          employer_name: employment.employer,
          job_title: employment.job_title,
          annual_income: parseFloat(employment.annual_income),
          start_date: employment.start_date || new Date().toISOString().split("T")[0],
        });
      }

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

      toast({ title: "Application submitted!", description: "Your credit check will be initiated automatically." });
      navigate("/dashboard/applications");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;
  if (!listing) return <div className="text-muted-foreground">Listing not found</div>;

  const depositEstimate = listing.rent_pcm * 5 / 4.33; // ~5 weeks

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-bold">Apply for Property</h1>

      {/* Listing summary */}
      <Card className="p-4">
        <p className="font-medium">{listing.title}</p>
        <p className="text-sm text-muted-foreground">{listing.address}, {listing.postcode}</p>
        <p className="font-display text-lg font-bold text-primary mt-1">£{listing.rent_pcm}/month</p>
        <p className="text-xs text-muted-foreground mt-1">Estimated deposit: £{Math.round(depositEstimate)}</p>
      </Card>

      {/* Readiness Checklist */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Tenant Readiness Checklist</h2>
        </div>
        <p className="text-sm text-muted-foreground">Confirm each item to proceed with your application.</p>
        <div className="space-y-3">
          {READINESS_CHECKLIST.map(item => (
            <label key={item.key} className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={!!checklist[item.key]} onCheckedChange={() => toggleChecklist(item.key)} className="mt-0.5" />
              <span className="text-sm">{item.label}</span>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-2">
          {checklistComplete ? (
            <Badge className="bg-success/10 text-success"><CheckCircle2 className="w-3 h-3 mr-1" /> All confirmed</Badge>
          ) : (
            <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" /> {READINESS_CHECKLIST.filter(i => !checklist[i.key]).length} items remaining</Badge>
          )}
        </div>
      </div>

      {/* Employment & Income */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">Employment & Income</h2>
        <p className="text-sm text-muted-foreground">Provide your current employment details for the affordability check.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Employer Name *</Label>
            <Input value={employment.employer} onChange={e => setEmployment(p => ({ ...p, employer: e.target.value }))} placeholder="Acme Ltd" required />
          </div>
          <div>
            <Label>Job Title *</Label>
            <Input value={employment.job_title} onChange={e => setEmployment(p => ({ ...p, job_title: e.target.value }))} placeholder="Software Engineer" required />
          </div>
          <div>
            <Label>Annual Income (£) *</Label>
            <Input type="number" value={employment.annual_income} onChange={e => setEmployment(p => ({ ...p, annual_income: e.target.value }))} placeholder="45000" required />
          </div>
          <div>
            <Label>Start Date</Label>
            <Input type="date" value={employment.start_date} onChange={e => setEmployment(p => ({ ...p, start_date: e.target.value }))} />
          </div>
        </div>
        {affordabilityRatio !== null && (
          <div className={`p-3 rounded-lg ${isAffordable ? "bg-success/10" : "bg-destructive/10"}`}>
            <p className="text-sm font-medium">
              Affordability: {(affordabilityRatio * 100).toFixed(0)}% of monthly income
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isAffordable
                ? "✓ Rent is within the recommended threshold (≤45%)"
                : "⚠ Rent exceeds the recommended threshold — a guarantor may be required"}
            </p>
          </div>
        )}
      </div>

      {/* Documents Upload */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" /> Required Documents
        </h2>
        <p className="text-sm text-muted-foreground">Upload the required documents for your credit check and identity verification.</p>

        {docs.map((doc, i) => (
          <div key={i} className="flex items-center justify-between bg-muted/50 border border-border rounded-lg p-3">
            <div>
              <p className="text-sm font-medium">{doc.file.name}</p>
              <p className="text-xs text-muted-foreground">{doc.type}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeDoc(i)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}

        {REQUIRED_DOC_TYPES.map(docInfo => {
          const uploaded = docs.some(d => d.type === docInfo.type);
          return (
            <label key={docInfo.type} className="cursor-pointer">
              <div className={`flex items-center gap-3 bg-card border rounded-lg p-3 transition-colors ${uploaded ? "border-success/40 bg-success/5" : docInfo.required ? "border-dashed border-border hover:border-primary/40" : "border-dashed border-border hover:border-primary/40"}`}>
                {uploaded ? (
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                ) : (
                  <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-sm">{docInfo.type}</span>
                  {docInfo.required && !uploaded && <span className="text-destructive text-xs ml-1">*</span>}
                  <p className="text-xs text-muted-foreground">{docInfo.desc}</p>
                </div>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) addDoc(file, docInfo.type);
                  e.target.value = "";
                }}
              />
            </label>
          );
        })}
      </div>

      {/* References */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-primary" /> References
        </h2>
        <p className="text-sm text-muted-foreground">Attach existing references or request new ones.</p>

        {existingRefs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your References</p>
            {existingRefs.map(ref => (
              <label key={ref.id} className="flex items-center gap-3 bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-primary/30">
                <Checkbox checked={selectedRefs.has(ref.id)} onCheckedChange={() => toggleRef(ref.id)} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{ref.referee_name}</p>
                  <p className="text-xs text-muted-foreground">{ref.type} • {ref.referee_email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${ref.status === "completed" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                  {ref.status || "sent"}
                </span>
              </label>
            ))}
          </div>
        )}

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
      {!canSubmit && (
        <Card className="p-4 border-l-4 border-l-amber-500 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">Complete the following to submit:</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                {!checklistComplete && <li>• Complete the readiness checklist</li>}
                {!hasEmployment && <li>• Enter your employment details</li>}
                {!requiredDocsUploaded && <li>• Upload all required documents (ID, proof of income, bank statement)</li>}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <Button onClick={handleSubmit} disabled={submitting || !canSubmit} className="w-full" size="lg">
        {submitting ? "Submitting..." : "Submit Application & Initiate Credit Check"}
      </Button>
    </div>
  );
}
