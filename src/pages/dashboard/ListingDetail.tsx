import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Copy, Link as LinkIcon, ShieldCheck, Upload, UserPlus, Trash2 } from "lucide-react";

type Listing = {
  id: string;
  title: string;
  address: string;
  postcode: string;
  rent_pcm: number;
  deposit: number | null;
  available_from: string | null;
  description: string | null;
};

type ApplyLink = {
  id: string;
  token: string;
  created_at: string;
};

type ListingTenant = {
  id: string;
  tenant_name: string;
  tenant_email: string | null;
  tenant_user_id: string | null;
  verification_status: string;
  created_at: string;
};

type VerificationRequest = {
  id: string;
  status: string;
  verification_type: string;
  listing_id: string | null;
  created_at: string;
};

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [applyLinks, setApplyLinks] = useState<ApplyLink[]>([]);
  const [tenants, setTenants] = useState<ListingTenant[]>([]);
  const [propertyVerification, setPropertyVerification] = useState<VerificationRequest | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [uploading, setUploading] = useState(false);

  const reload = () => {
    if (!id) return;
    supabase.from("listings").select("*").eq("id", id).single().then(({ data }) => setListing(data as any));
    supabase.from("listing_apply_links").select("*").eq("listing_id", id).order("created_at", { ascending: false }).then(({ data }) => setApplyLinks((data as any) || []));
    // listing_tenants is not in generated types, use .from() with type assertion
    (supabase as any).from("listing_tenants").select("*").eq("listing_id", id).order("created_at", { ascending: false }).then(({ data }: any) => setTenants(data || []));
    supabase.from("verification_requests").select("*").eq("listing_id", id).eq("verification_type", "property").order("created_at", { ascending: false }).limit(1).then(({ data }) => setPropertyVerification((data as any)?.[0] || null));
  };

  useEffect(() => { reload(); }, [id]);

  const generateLink = async () => {
    if (!id) return;
    const { error } = await supabase.from("listing_apply_links").insert({ listing_id: id });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Apply link generated" });
      reload();
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/apply/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard" });
  };

  /* ── Add Tenant ── */
  const addTenant = async () => {
    if (!id || !user || !newName.trim()) return;
    const { error } = await (supabase as any).from("listing_tenants").insert({
      listing_id: id,
      tenant_name: newName.trim(),
      tenant_email: newEmail.trim() || null,
      added_by: user.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tenant added" });
      setNewName(""); setNewEmail(""); setAddOpen(false);
      reload();
    }
  };

  const removeTenant = async (tenantId: string) => {
    const { error } = await (supabase as any).from("listing_tenants").delete().eq("id", tenantId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tenant removed" }); reload();
    }
  };

  /* ── Property Verification Upload ── */
  const handlePropertyVerification = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !id) return;
    setUploading(true);
    try {
      const key = `${user.id}/verification/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("documents").upload(key, file);
      if (uploadErr) throw uploadErr;

      await supabase.from("documents").insert({
        user_id: user.id, file_name: file.name, category: "Property",
        storage_key: key, content_type: file.type, file_size: file.size,
      });

      const { error } = await supabase.from("verification_requests").insert({
        user_id: user.id, verification_type: "property", document_ids: [key], listing_id: id,
      });
      if (error) throw error;

      toast({ title: "Property verification submitted" });
      reload();
    } catch {
      toast({ title: "Error uploading", variant: "destructive" });
    } finally { setUploading(false); }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case "verified": return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Verified</Badge>;
      case "pending": return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Pending</Badge>;
      case "rejected": return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="outline">Unverified</Badge>;
    }
  };

  if (!listing) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold mb-2">{listing.title}</h1>
        <p className="text-muted-foreground">{listing.address}, {listing.postcode}</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Rent</p>
          <p className="font-display text-xl font-bold text-primary">£{listing.rent_pcm}/mo</p>
        </div>
        {listing.deposit && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Deposit</p>
            <p className="font-display text-xl font-bold">£{listing.deposit}</p>
          </div>
        )}
        {listing.available_from && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="font-display text-xl font-bold">{listing.available_from}</p>
          </div>
        )}
      </div>

      {listing.description && (
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm">{listing.description}</p>
        </div>
      )}

      {/* ── Property Verification Card ── */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${propertyVerification?.status === 'verified' ? 'bg-emerald-500/10' : 'bg-muted'}`}>
            <ShieldCheck className={`w-5 h-5 ${propertyVerification?.status === 'verified' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex-1">
            <p className="font-medium">Property Verification</p>
            {propertyVerification ? statusBadge(propertyVerification.status) : <span className="text-sm text-muted-foreground">Not submitted</span>}
          </div>
          {!propertyVerification && (
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild disabled={uploading}>
                <span><Upload className="w-4 h-4 mr-1" />{uploading ? "Uploading…" : "Upload Proof"}</span>
              </Button>
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={handlePropertyVerification} />
            </label>
          )}
        </div>
      </Card>

      {/* ── Registered Tenants ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold">Registered Tenants</h2>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><UserPlus className="w-4 h-4" /> Add Tenant</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Tenant to Property</DialogTitle>
                <DialogDescription>Enter the tenant's name and optionally their email to link verification.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Full Name *</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Jane Smith" />
                </div>
                <div>
                  <Label>Email (optional)</Label>
                  <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="jane@example.com" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={addTenant} disabled={!newName.trim()}>Add Tenant</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {tenants.length > 0 ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.tenant_name}</TableCell>
                    <TableCell className="text-muted-foreground">{t.tenant_email || "—"}</TableCell>
                    <TableCell>{statusBadge(t.verification_status)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeTenant(t.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">No tenants registered for this property yet.</p>
        )}
      </div>

      {/* ── Apply Links ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold">Apply Links</h2>
          <Button size="sm" onClick={generateLink} className="gap-2">
            <LinkIcon className="w-4 h-4" /> Generate Link
          </Button>
        </div>
        <div className="space-y-2">
          {applyLinks.map(link => (
            <div key={link.id} className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
              <code className="text-xs text-muted-foreground flex-1 truncate">
                {window.location.origin}/apply/{link.token}
              </code>
              <Button variant="ghost" size="icon" onClick={() => copyLink(link.token)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {applyLinks.length === 0 && (
            <p className="text-sm text-muted-foreground">No apply links yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
