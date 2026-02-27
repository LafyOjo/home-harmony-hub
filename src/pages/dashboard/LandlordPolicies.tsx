import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Plus, Pencil, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const POLICY_TYPES = [
  { value: "no_smoking", label: "No Smoking" },
  { value: "no_pets", label: "Pet Policy" },
  { value: "no_subletting", label: "No Subletting" },
  { value: "quiet_hours", label: "Quiet Hours" },
  { value: "maintenance_reporting", label: "Maintenance Reporting" },
  { value: "property_inspection", label: "Property Inspection" },
  { value: "garden_maintenance", label: "Garden Maintenance" },
  { value: "waste_disposal", label: "Waste & Recycling" },
  { value: "parking", label: "Parking Rules" },
  { value: "custom", label: "Custom Policy" },
];

export default function LandlordPolicies() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selListing, setSelListing] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [policyType, setPolicyType] = useState("no_smoking");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isMandatory, setIsMandatory] = useState(true);
  const [version, setVersion] = useState("1.0");

  const { data: listings } = useQuery({
    queryKey: ["landlord-listings", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("id, title, address")
        .eq("owner_id", user!.id)
        .order("title");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: policies } = useQuery({
    queryKey: ["landlord-property-policies", selListing],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_policies" as any)
        .select("*")
        .eq("listing_id", selListing)
        .order("created_at");
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!selListing,
  });

  // Acceptance stats per policy
  const { data: consentStats } = useQuery({
    queryKey: ["policy-consent-stats", selListing],
    queryFn: async () => {
      // Get all active tenancies for this listing
      const { data: tenancies } = await supabase
        .from("tenancies")
        .select("id, tenant_id")
        .eq("listing_id", selListing)
        .eq("status", "active");
      if (!tenancies?.length) return {};

      const tenancyIds = tenancies.map(t => t.id);
      const { data: consents } = await supabase
        .from("policy_consents")
        .select("*")
        .in("tenancy_id", tenancyIds);

      // Group by policy_type
      const stats: Record<string, { accepted: number; total: number }> = {};
      policies?.forEach((p: any) => {
        const matching = (consents || []).filter(
          (c: any) => c.policy_type === p.policy_type && c.consented && c.policy_version === p.version
        );
        stats[p.policy_type] = { accepted: matching.length, total: tenancies.length };
      });
      return stats;
    },
    enabled: !!selListing && !!policies && policies.length > 0,
  });

  const resetForm = () => {
    setPolicyType("no_smoking");
    setTitle("");
    setDescription("");
    setIsMandatory(true);
    setVersion("1.0");
    setEditId(null);
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (p: any) => {
    setEditId(p.id);
    setPolicyType(p.policy_type);
    setTitle(p.title);
    setDescription(p.description);
    setIsMandatory(p.is_mandatory);
    setVersion(p.version);
    setFormOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase
          .from("property_policies" as any)
          .update({ policy_type: policyType, title, description, is_mandatory: isMandatory, version } as any)
          .eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("property_policies" as any)
          .insert({
            listing_id: selListing,
            owner_id: user!.id,
            policy_type: policyType,
            title,
            description,
            is_mandatory: isMandatory,
            version,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord-property-policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy-consent-stats"] });
      toast({ title: editId ? "Policy updated" : "Policy published" });
      setFormOpen(false);
      resetForm();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("property_policies" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord-property-policies"] });
      toast({ title: "Policy deleted" });
      setDeleteId(null);
    },
  });

  return (
    <div className="max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">Property Policies</h1>
          <p className="text-muted-foreground">Manage policies for your properties and track tenant acceptance</p>
        </div>
        {selListing && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add Policy
          </Button>
        )}
      </motion.div>

      {/* Listing selector */}
      <Card className="p-4">
        <Label>Select Property</Label>
        <Select value={selListing} onValueChange={setSelListing}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a property..." /></SelectTrigger>
          <SelectContent>
            {listings?.map(l => (
              <SelectItem key={l.id} value={l.id}>{l.title || l.address}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {/* Policy list */}
      {selListing && (
        <div className="space-y-3">
          {policies && policies.length > 0 ? (
            policies.map((p: any) => {
              const stats = consentStats?.[p.policy_type];
              return (
                <Card key={p.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-medium">{p.title}</p>
                        {p.is_mandatory && <Badge variant="outline" className="text-xs">Mandatory</Badge>}
                        <span className="text-xs text-muted-foreground">v{p.version}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{p.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Type: {POLICY_TYPES.find(t => t.value === p.policy_type)?.label || p.policy_type}</span>
                        <span>Created: {format(parseISO(p.created_at), "d MMM yyyy")}</span>
                        {stats && (
                          <span className={stats.accepted === stats.total ? "text-emerald-600" : "text-amber-600"}>
                            {stats.accepted}/{stats.total} tenants accepted
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          ) : (
            <Card className="p-8 text-center">
              <ShieldCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No policies for this property yet.</p>
              <Button className="mt-3" onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Create First Policy</Button>
            </Card>
          )}
        </div>
      )}

      {!selListing && (
        <Card className="p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Select a property above to manage its policies.</p>
        </Card>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={open => { if (!open) { setFormOpen(false); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Policy" : "Create Policy"}</DialogTitle>
            <DialogDescription>
              {editId ? "Update the policy details. Tenants will be notified of changes." : "Publish a new policy. Active tenants will be notified."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Policy Type *</Label>
              <Select value={policyType} onValueChange={setPolicyType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POLICY_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. No Smoking Policy" />
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Full policy text..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Version</Label>
                <Input value={version} onChange={e => setVersion(e.target.value)} placeholder="1.0" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <Checkbox checked={isMandatory} onCheckedChange={v => setIsMandatory(v === true)} />
                  <span className="text-sm">Mandatory acceptance</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFormOpen(false); resetForm(); }}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!title.trim() || !description.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : editId ? "Update" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Policy</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this policy and its acceptance records will no longer be tied to it.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
