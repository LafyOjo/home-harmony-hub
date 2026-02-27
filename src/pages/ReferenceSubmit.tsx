import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

type RefRequest = {
  id: string;
  type: string;
  referee_name: string;
  status: string;
  expires_at: string | null;
};

export default function ReferenceSubmit() {
  const { token } = useParams<{ token: string }>();
  const [request, setRequest] = useState<RefRequest | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [expired, setExpired] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    relationship: "",
    known_since: "",
    capacity: "",
    reliability_rating: "good",
    would_recommend: "yes",
    comments: "",
    referee_confirm_name: "",
  });

  useEffect(() => {
    if (!token) return;
    supabase
      .from("reference_requests")
      .select("id, type, referee_name, status, expires_at")
      .eq("token", token)
      .single()
      .then(({ data, error }) => {
        setLoading(false);
        if (error || !data) { setNotFound(true); return; }
        const req = data as RefRequest;
        if (req.status === "completed") { setAlreadyDone(true); setRequest(req); return; }
        if (req.expires_at && new Date(req.expires_at) < new Date()) { setExpired(true); setRequest(req); return; }
        setRequest(req);
        // Mark as opened
        supabase.from("reference_requests").update({ status: "opened" } as any).eq("id", req.id).then(() => {});
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !form.referee_confirm_name.trim() || !form.comments.trim()) return;
    setSubmitting(true);

    const { error: respError } = await supabase.from("reference_responses").insert({
      request_id: request.id,
      response_data: {
        relationship: form.relationship,
        known_since: form.known_since,
        capacity: form.capacity,
        reliability: form.reliability_rating,
        would_recommend: form.would_recommend,
        comments: form.comments,
        confirmed_name: form.referee_confirm_name,
      },
    });

    if (!respError) {
      await supabase.from("reference_requests").update({ status: "completed" } as any).eq("id", request.id);
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Loading…</p>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-2">
        <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
        <h1 className="text-xl font-bold">Link Not Found</h1>
        <p className="text-sm text-muted-foreground">This reference link is invalid or has been removed.</p>
      </div>
    </div>
  );

  if (expired) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-2">
        <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
        <h1 className="text-xl font-bold">Link Expired</h1>
        <p className="text-sm text-muted-foreground">This reference link has expired. Please ask the tenant to send a new request.</p>
      </div>
    </div>
  );

  if (alreadyDone || submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-2">
        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
        <h1 className="text-xl font-bold">Reference Submitted</h1>
        <p className="text-sm text-muted-foreground">Thank you for providing this reference. You can close this page.</p>
      </div>
    </div>
  );

  const typeLabel = request?.type === "landlord" ? "Previous Landlord" : request?.type === "employer" ? "Employer" : request?.type === "guarantor" ? "Guarantor" : "Character";

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Reference Request</h1>
            <p className="text-sm text-muted-foreground">{typeLabel} reference for {request?.referee_name}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground mb-6">
            You have been asked to provide a {typeLabel.toLowerCase()} reference. Please complete the form below. Your response will be shared with the tenant and their prospective landlord.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Your Relationship to the Tenant *</Label>
              <Input
                value={form.relationship}
                onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))}
                placeholder="e.g., Line manager, Previous landlord"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Known Since</Label>
                <Input
                  type="date"
                  value={form.known_since}
                  onChange={e => setForm(f => ({ ...f, known_since: e.target.value }))}
                />
              </div>
              <div>
                <Label>In What Capacity</Label>
                <Input
                  value={form.capacity}
                  onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                  placeholder="e.g., Tenant, Employee"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Reliability</Label>
                <Select value={form.reliability_rating} onValueChange={v => setForm(f => ({ ...f, reliability_rating: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Would You Recommend?</Label>
                <Select value={form.would_recommend} onValueChange={v => setForm(f => ({ ...f, would_recommend: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="with_reservations">With Reservations</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Additional Comments *</Label>
              <Textarea
                value={form.comments}
                onChange={e => setForm(f => ({ ...f, comments: e.target.value }))}
                placeholder="Please provide any relevant details about the tenant…"
                rows={4}
                required
              />
            </div>

            <div className="border-t border-border pt-4">
              <Label>Confirm Your Full Name *</Label>
              <Input
                value={form.referee_confirm_name}
                onChange={e => setForm(f => ({ ...f, referee_confirm_name: e.target.value }))}
                placeholder="Type your full name to confirm"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">By submitting, you confirm the information above is accurate to the best of your knowledge.</p>
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Submitting…" : "Submit Reference"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
