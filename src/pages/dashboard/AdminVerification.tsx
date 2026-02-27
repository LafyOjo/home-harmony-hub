import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck, Clock, CheckCircle2, XCircle, AlertTriangle, FileText, Eye, User, Building2,
} from "lucide-react";
import { format, parseISO } from "date-fns";

type Verification = {
  id: string;
  user_id: string;
  verification_type: string;
  status: string;
  notes: string | null;
  listing_id: string | null;
  created_at: string;
  reviewed_at: string | null;
  document_ids: any;
};

type Profile = { user_id: string; full_name: string | null; email: string };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: "bg-muted text-muted-foreground", label: "Pending" },
  verified: { icon: CheckCircle2, color: "bg-chart-2/15 text-chart-2", label: "Verified" },
  rejected: { icon: XCircle, color: "bg-destructive/15 text-destructive", label: "Rejected" },
  requires_more_info: { icon: AlertTriangle, color: "bg-chart-4/15 text-chart-4", label: "More Info" },
};

export default function AdminVerification() {
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [filterStatus, setFilterStatus] = useState("pending");
  const [filterType, setFilterType] = useState("all");
  const [loading, setLoading] = useState(true);

  // Review dialog
  const [reviewItem, setReviewItem] = useState<Verification | null>(null);
  const [reviewStatus, setReviewStatus] = useState("verified");
  const [reviewNotes, setReviewNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchVerifications = async () => {
    setLoading(true);
    let q = supabase.from("verification_requests").select("*").order("created_at", { ascending: false });
    if (filterStatus !== "all") q = q.eq("status", filterStatus);
    if (filterType !== "all") q = q.eq("verification_type", filterType);

    const { data } = await q;
    const items = (data || []) as Verification[];
    setVerifications(items);

    // Fetch profiles for all users
    const userIds = [...new Set(items.map(v => v.user_id))];
    if (userIds.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);
      const map = new Map<string, Profile>();
      (profs || []).forEach(p => map.set(p.user_id, p));
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchVerifications(); }, [filterStatus, filterType]);

  const openReview = (v: Verification) => {
    setReviewItem(v);
    setReviewStatus("verified");
    setReviewNotes(v.notes || "");
  };

  const handleReview = async () => {
    if (!reviewItem) return;
    setSaving(true);
    const { error } = await supabase.from("verification_requests").update({
      status: reviewStatus,
      notes: reviewNotes || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id,
    }).eq("id", reviewItem.id);
    setSaving(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Verification ${reviewStatus}` });
    setReviewItem(null);
    fetchVerifications();
  };

  const getDocUrls = (docIds: any): string[] => {
    if (!docIds || !Array.isArray(docIds)) return [];
    return docIds.map((key: string) => `${SUPABASE_URL}/storage/v1/object/public/documents/${key}`);
  };

  const typeLabel = (t: string) => {
    switch (t) {
      case "tenant_id": return "Tenant ID";
      case "tenant_selfie": return "Tenant Selfie";
      case "tenant_income": return "Proof of Income";
      case "landlord_id": return "Landlord ID";
      case "property": return "Property Ownership";
      default: return t.replace(/_/g, " ");
    }
  };

  if (role !== "admin") {
    return (
      <div className="max-w-3xl">
        <Card className="p-8 text-center">
          <ShieldCheck className="w-12 h-12 text-destructive mx-auto mb-3" />
          <p className="font-medium">Access Denied</p>
          <p className="text-sm text-muted-foreground">You need admin privileges to access this page.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">Verification Review</h1>
        <p className="text-muted-foreground">Review and approve identity and property verifications.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="requires_more_info">Needs Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="tenant_id">Tenant ID</SelectItem>
            <SelectItem value="tenant_selfie">Tenant Selfie</SelectItem>
            <SelectItem value="tenant_income">Proof of Income</SelectItem>
            <SelectItem value="landlord_id">Landlord ID</SelectItem>
            <SelectItem value="property">Property Ownership</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-muted-foreground self-center">
          {verifications.length} result{verifications.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : verifications.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No verifications matching filters.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {verifications.map(v => {
            const profile = profiles.get(v.user_id);
            const sc = statusConfig[v.status] || statusConfig.pending;
            const Icon = v.verification_type.includes("property") ? Building2 : User;

            return (
              <Card key={v.id} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{profile?.full_name || profile?.email || "User"}</p>
                      <Badge variant="outline" className="text-xs">{typeLabel(v.verification_type)}</Badge>
                      <Badge className={sc.color} variant="secondary">{sc.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Submitted {format(parseISO(v.created_at), "d MMM yyyy HH:mm")}
                      {v.reviewed_at && ` · Reviewed ${format(parseISO(v.reviewed_at), "d MMM yyyy")}`}
                    </p>
                    {v.notes && <p className="text-xs text-muted-foreground mt-1">Note: {v.notes}</p>}
                  </div>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => openReview(v)}>
                    <Eye className="w-3 h-3" /> Review
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewItem} onOpenChange={() => setReviewItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Verification</DialogTitle>
          </DialogHeader>

          {reviewItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">User</p>
                  <p className="font-medium">{profiles.get(reviewItem.user_id)?.full_name || profiles.get(reviewItem.user_id)?.email || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">{typeLabel(reviewItem.verification_type)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Submitted</p>
                  <p className="font-medium">{format(parseISO(reviewItem.created_at), "d MMM yyyy HH:mm")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Current Status</p>
                  <Badge className={(statusConfig[reviewItem.status] || statusConfig.pending).color} variant="secondary">
                    {(statusConfig[reviewItem.status] || statusConfig.pending).label}
                  </Badge>
                </div>
              </div>

              {/* Documents */}
              {getDocUrls(reviewItem.document_ids).length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Uploaded Documents</p>
                  <div className="flex gap-2 flex-wrap">
                    {getDocUrls(reviewItem.document_ids).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs border border-border rounded-md px-2 py-1 hover:bg-muted transition-colors">
                        <FileText className="w-3 h-3" /> Document {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Decision */}
              <div>
                <p className="text-sm font-medium mb-2">Decision</p>
                <Select value={reviewStatus} onValueChange={setReviewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verified">✅ Approve</SelectItem>
                    <SelectItem value="rejected">❌ Reject</SelectItem>
                    <SelectItem value="requires_more_info">⚠️ Request More Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Notes / Reason</p>
                <Textarea
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Optional notes for the user…"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewItem(null)}>Cancel</Button>
            <Button onClick={handleReview} disabled={saving}>
              {saving ? "Saving…" : "Submit Decision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
