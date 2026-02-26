import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Home,
  CalendarDays,
  PoundSterling,
  FileSignature,
  Download,
  Eye,
  Users,
  ShieldCheck,
  RefreshCw,
  XCircle,
  Loader2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/locale-format";
import { useTranslation } from "react-i18next";
import { toast } from "@/hooks/use-toast";

export default function TenantMyTenancy() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [terminationOpen, setTerminationOpen] = useState(false);

  // ── Tenancy ──
  const { data: tenancy, isLoading: tenancyLoading } = useQuery({
    queryKey: ["my-tenancy", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenancies")
        .select("*")
        .eq("tenant_id", user!.id)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // ── Listing (property info) ──
  const { data: listing } = useQuery({
    queryKey: ["tenancy-listing", tenancy?.listing_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("title, address, postcode, bedrooms, bathrooms, property_type")
        .eq("id", tenancy!.listing_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenancy,
  });

  // ── Contracts ──
  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ["tenancy-contracts", tenancy?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("tenancy_id", tenancy!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenancy,
  });

  // ── Household members ──
  const { data: household, isLoading: householdLoading } = useQuery({
    queryKey: ["household-members", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("household_members")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // ── Guarantors ──
  const { data: guarantors, isLoading: guarantorsLoading } = useQuery({
    queryKey: ["guarantors", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guarantors")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // ── Renewal proposal mutation ──
  const renewalMutation = useMutation({
    mutationFn: async (form: {
      new_start_date: string;
      new_end_date: string;
      new_rent_pcm: number;
      notes: string;
    }) => {
      const { error } = await supabase.from("renewal_proposals").insert({
        tenancy_id: tenancy!.id,
        proposed_by: user!.id,
        new_start_date: form.new_start_date,
        new_end_date: form.new_end_date,
        new_rent_pcm: form.new_rent_pcm,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Renewal requested", description: "Your landlord will be notified." });
      setRenewalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["my-tenancy"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // ── Termination notice mutation ──
  const terminationMutation = useMutation({
    mutationFn: async (form: {
      effective_date: string;
      notice_type: string;
      reason: string;
    }) => {
      const { error } = await supabase.from("termination_notices").insert({
        tenancy_id: tenancy!.id,
        issued_by: user!.id,
        effective_date: form.effective_date,
        notice_type: form.notice_type,
        reason: form.reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Termination notice submitted", description: "Your landlord will be notified." });
      setTerminationOpen(false);
      queryClient.invalidateQueries({ queryKey: ["my-tenancy"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // ── Download contract ──
  const handleDownloadContract = async (storageKey: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(storageKey, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "Error", description: "Could not generate download link.", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  // ── Loading state ──
  if (tenancyLoading) {
    return (
      <div className="max-w-4xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  // ── No tenancy ──
  if (!tenancy) {
    return (
      <div className="max-w-3xl">
        <h1 className="font-display text-3xl font-bold mb-4">My Tenancy</h1>
        <Card className="p-8 text-center">
          <Home className="w-12 h-12 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
          <p className="text-muted-foreground">
            No active tenancy found. Once your application is accepted, your tenancy details will appear here.
          </p>
        </Card>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "bg-success/10 text-success",
      ended: "bg-muted text-muted-foreground",
      terminated: "bg-destructive/10 text-destructive",
    };
    return map[status] || "bg-muted text-muted-foreground";
  };

  const contractStatus = (status: string) => {
    const map: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      pending_signature: "bg-warning/10 text-warning",
      tenant_signed: "bg-primary/10 text-primary",
      fully_signed: "bg-success/10 text-success",
    };
    return map[status] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold mb-1">My Tenancy</h1>
            <p className="text-muted-foreground">
              {listing?.title} — {listing?.address}, {listing?.postcode}
            </p>
          </div>
          <Badge className={statusBadge(tenancy.status)} variant="secondary">
            {tenancy.status}
          </Badge>
        </div>
      </motion.div>

      {/* Key details cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CalendarDays className="w-4 h-4" aria-hidden="true" />
            <p className="text-xs">Lease Start</p>
          </div>
          <p className="font-display text-lg font-bold">{formatDate(tenancy.start_date, { month: "short" })}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CalendarDays className="w-4 h-4" aria-hidden="true" />
            <p className="text-xs">Lease End</p>
          </div>
          <p className="font-display text-lg font-bold">{formatDate(tenancy.end_date, { month: "short" })}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <PoundSterling className="w-4 h-4" aria-hidden="true" />
            <p className="text-xs">Monthly Rent</p>
          </div>
          <p className="font-display text-lg font-bold">{formatCurrency(Number(tenancy.rent_pcm))}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            <p className="text-xs">Deposit</p>
          </div>
          <p className="font-display text-lg font-bold">
            {tenancy.deposit ? formatCurrency(Number(tenancy.deposit)) : "—"}
          </p>
        </Card>
      </div>

      {/* Property details */}
      {listing && (listing.bedrooms || listing.bathrooms || listing.property_type) && (
        <Card className="p-5">
          <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
            <Home className="w-5 h-5 text-primary" aria-hidden="true" />
            Property Details
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            {listing.property_type && (
              <div>
                <p className="text-muted-foreground text-xs">Type</p>
                <p className="font-medium capitalize">{listing.property_type}</p>
              </div>
            )}
            {listing.bedrooms && (
              <div>
                <p className="text-muted-foreground text-xs">Bedrooms</p>
                <p className="font-medium">{listing.bedrooms}</p>
              </div>
            )}
            {listing.bathrooms && (
              <div>
                <p className="text-muted-foreground text-xs">Bathrooms</p>
                <p className="font-medium">{listing.bathrooms}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Contracts section */}
      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
          <FileSignature className="w-5 h-5 text-primary" aria-hidden="true" />
          Contracts & Lease Agreements
        </h2>
        {contractsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
        ) : contracts && contracts.length > 0 ? (
          <div className="space-y-2">
            {contracts.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.valid_from && c.valid_to
                      ? `${formatDate(c.valid_from, { month: "short" })} — ${formatDate(c.valid_to, { month: "short" })}`
                      : c.contract_type}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={contractStatus(c.status)} variant="secondary">
                    {c.status.replace(/_/g, " ")}
                  </Badge>
                  {c.storage_key && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Download ${c.title}`}
                      onClick={() => handleDownloadContract(c.storage_key!, c.title)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                  {c.lease_content && !c.storage_key && (
                    <Button variant="ghost" size="icon" aria-label={`View ${c.title}`}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No contracts found for this tenancy.
          </p>
        )}
      </Card>

      {/* Household members */}
      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" aria-hidden="true" />
          Household Members
        </h2>
        {householdLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        ) : household && household.length > 0 ? (
          <div className="divide-y divide-border">
            {household.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{m.relationship}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No household members recorded.
          </p>
        )}
      </Card>

      {/* Guarantors */}
      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
          Guarantors
        </h2>
        {guarantorsLoading ? (
          <Skeleton className="h-10 rounded-lg" />
        ) : guarantors && guarantors.length > 0 ? (
          <div className="divide-y divide-border">
            {guarantors.map((g) => (
              <div key={g.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{g.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.relationship && <span className="capitalize">{g.relationship}</span>}
                    {g.email && <span> · {g.email}</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No guarantors on file.
          </p>
        )}
      </Card>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {/* Renewal Dialog */}
        <Dialog open={renewalOpen} onOpenChange={setRenewalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Request Renewal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Lease Renewal</DialogTitle>
              <DialogDescription>
                Submit a renewal proposal to your landlord. They'll be notified and can accept or negotiate.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                renewalMutation.mutate({
                  new_start_date: fd.get("new_start_date") as string,
                  new_end_date: fd.get("new_end_date") as string,
                  new_rent_pcm: Number(fd.get("new_rent_pcm")),
                  notes: fd.get("notes") as string,
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new_start_date">New start date</Label>
                  <Input
                    id="new_start_date"
                    name="new_start_date"
                    type="date"
                    defaultValue={tenancy.end_date}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="new_end_date">New end date</Label>
                  <Input id="new_end_date" name="new_end_date" type="date" required />
                </div>
              </div>
              <div>
                <Label htmlFor="new_rent_pcm">Proposed monthly rent (£)</Label>
                <Input
                  id="new_rent_pcm"
                  name="new_rent_pcm"
                  type="number"
                  step="0.01"
                  defaultValue={Number(tenancy.rent_pcm)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="renewal_notes">Notes (optional)</Label>
                <Textarea id="renewal_notes" name="notes" placeholder="Any additional comments..." />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setRenewalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={renewalMutation.isPending}>
                  {renewalMutation.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                  Submit Proposal
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Termination Dialog */}
        <Dialog open={terminationOpen} onOpenChange={setTerminationOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5">
              <XCircle className="w-4 h-4" aria-hidden="true" />
              Early Termination
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Early Termination</DialogTitle>
              <DialogDescription>
                Submit a termination notice. Your landlord will be notified. This does not guarantee
                early release — it initiates the process per your contract terms.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                terminationMutation.mutate({
                  effective_date: fd.get("effective_date") as string,
                  notice_type: fd.get("notice_type") as string,
                  reason: fd.get("reason") as string,
                });
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="notice_type">Notice type</Label>
                <Select name="notice_type" defaultValue="tenant_notice">
                  <SelectTrigger id="notice_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant_notice">Tenant Notice</SelectItem>
                    <SelectItem value="mutual_agreement">Mutual Agreement</SelectItem>
                    <SelectItem value="break_clause">Break Clause</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="effective_date">Effective date</Label>
                <Input id="effective_date" name="effective_date" type="date" required />
              </div>
              <div>
                <Label htmlFor="term_reason">Reason</Label>
                <Textarea
                  id="term_reason"
                  name="reason"
                  placeholder="Briefly explain why you need to end the tenancy early..."
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setTerminationOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={terminationMutation.isPending}>
                  {terminationMutation.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                  Submit Notice
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
