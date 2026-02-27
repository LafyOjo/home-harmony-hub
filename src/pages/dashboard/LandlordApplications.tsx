import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ScreeningResults from "@/components/ScreeningResults";
import LandlordReferenceReview from "@/components/LandlordReferenceReview";
import {
  Inbox, ChevronDown, ChevronUp, Send, MessageSquare, User, FileText,
  CheckCircle2, Home, Calendar, Phone, Mail,
} from "lucide-react";

/* ── types ── */
type Listing = { id: string; title: string };
type Profile = { user_id: string; full_name: string | null; email: string; phone: string | null; date_of_birth: string | null };
type App = {
  id: string; status: string; tenant_id: string; listing_id: string; created_at: string;
  listings: { title: string; address: string; rent_pcm: number } | null;
  profile?: Profile | null;
};
type Message = { id: string; content: string; sender_id: string; created_at: string };

const statuses = ["submitted", "reviewed", "shortlisted", "offered", "accepted", "rejected"] as const;
const statusColors: Record<string, string> = {
  submitted: "bg-primary/10 text-primary",
  reviewed: "bg-accent/20 text-accent-foreground",
  shortlisted: "bg-primary/15 text-primary",
  offered: "bg-chart-4/15 text-chart-4",
  accepted: "bg-chart-2/15 text-chart-2",
  rejected: "bg-destructive/10 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
};

export default function LandlordApplications() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [listings, setListings] = useState<Listing[]>([]);
  const [filterListing, setFilterListing] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [apps, setApps] = useState<App[]>([]);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  // Tenancy creation dialog
  const [createTenancy, setCreateTenancy] = useState<App | null>(null);
  const [tenancyForm, setTenancyForm] = useState({ start_date: "", end_date: "", rent_pcm: "", deposit: "" });
  const [creatingTenancy, setCreatingTenancy] = useState(false);

  /* ── fetch listings ── */
  useEffect(() => {
    if (!user) return;
    supabase.from("listings").select("id, title").eq("owner_id", user.id).then(({ data }) => setListings(data || []));
  }, [user]);

  /* ── fetch apps ── */
  const fetchApps = async () => {
    if (!user) return;
    const { data: myListings } = await supabase.from("listings").select("id").eq("owner_id", user.id);
    if (!myListings?.length) return;
    const ids = myListings.map(l => l.id);

    let q = supabase
      .from("applications")
      .select("id, status, tenant_id, listing_id, created_at, listings(title, address, rent_pcm)")
      .in("listing_id", ids)
      .neq("status", "draft")
      .order("created_at", { ascending: false });

    if (filterListing !== "all") q = q.eq("listing_id", filterListing);
    if (filterStatus !== "all") q = q.eq("status", filterStatus as any);

    const { data } = await q;
    if (!data) { setApps([]); return; }

    // Fetch tenant profiles
    const tenantIds = [...new Set(data.map(a => a.tenant_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email, phone, date_of_birth").in("user_id", tenantIds);
    const pMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    setApps(data.map(a => ({ ...a, profile: pMap.get(a.tenant_id) || null })) as any);
  };

  useEffect(() => { fetchApps(); }, [user, filterListing, filterStatus]);

  /* ── messages ── */
  useEffect(() => {
    if (!expandedApp) { setMessages([]); return; }
    supabase.from("messages").select("*").eq("application_id", expandedApp)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data as Message[]) || []));
  }, [expandedApp]);

  const sendMessage = async () => {
    if (!user || !expandedApp || !msgInput.trim()) return;
    setSendingMsg(true);
    await supabase.from("messages").insert({ application_id: expandedApp, sender_id: user.id, content: msgInput.trim() });
    setSendingMsg(false);
    setMsgInput("");
    const { data } = await supabase.from("messages").select("*").eq("application_id", expandedApp).order("created_at", { ascending: true });
    setMessages((data as Message[]) || []);
  };

  /* ── status update ── */
  const updateStatus = async (appId: string, newStatus: string) => {
    const { error } = await supabase.from("applications").update({ status: newStatus as any }).eq("id", appId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Status → ${newStatus}` });

    // Notify tenant
    const app = apps.find(a => a.id === appId);
    if (app) {
      await supabase.rpc("create_notification", {
        _user_id: app.tenant_id,
        _title: `Application ${newStatus}`,
        _message: `Your application for "${app.listings?.title}" has been ${newStatus}.`,
        _link: "/dashboard/applications",
      });
    }

    fetchApps();
  };

  /* ── create tenancy from accepted app ── */
  const openCreateTenancy = (app: App) => {
    setCreateTenancy(app);
    setTenancyForm({
      start_date: "",
      end_date: "",
      rent_pcm: app.listings?.rent_pcm?.toString() || "",
      deposit: "",
    });
  };

  const handleCreateTenancy = async () => {
    if (!user || !createTenancy) return;
    if (!tenancyForm.start_date || !tenancyForm.end_date || !tenancyForm.rent_pcm) {
      toast({ title: "Fill all required fields", variant: "destructive" }); return;
    }
    setCreatingTenancy(true);

    // Create tenancy
    const { data: tenancy, error: tErr } = await supabase.from("tenancies").insert({
      tenant_id: createTenancy.tenant_id,
      landlord_id: user.id,
      listing_id: createTenancy.listing_id,
      application_id: createTenancy.id,
      start_date: tenancyForm.start_date,
      end_date: tenancyForm.end_date,
      rent_pcm: Number(tenancyForm.rent_pcm),
      deposit: tenancyForm.deposit ? Number(tenancyForm.deposit) : null,
      status: "active",
    }).select().single();

    if (tErr) { toast({ title: "Error", description: tErr.message, variant: "destructive" }); setCreatingTenancy(false); return; }

    // Create initial contract
    const tenancyId = (tenancy as any).id;
    await supabase.from("contracts").insert({
      tenancy_id: tenancyId,
      title: `Tenancy Agreement – ${createTenancy.listings?.title}`,
      contract_type: "initial",
      status: "sent",
      valid_from: tenancyForm.start_date,
      valid_to: tenancyForm.end_date,
    });

    // Notify tenant
    await supabase.rpc("create_notification", {
      _user_id: createTenancy.tenant_id,
      _title: "Tenancy created",
      _message: `Your tenancy for "${createTenancy.listings?.title}" has been set up. Please review your contract.`,
      _link: "/dashboard/tenancy",
    });

    setCreatingTenancy(false);
    setCreateTenancy(null);
    toast({ title: "Tenancy and contract created" });
    fetchApps();
  };

  const fmtCurrency = (v: number) => `£${v.toLocaleString()}`;

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold mb-6">Applications</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={filterListing} onValueChange={setFilterListing}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Properties" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {listings.map(l => <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-muted-foreground self-center">{apps.length} application{apps.length !== 1 ? "s" : ""}</div>
      </div>

      {apps.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Inbox className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No applications found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map(app => {
            const isExpanded = expandedApp === app.id;
            return (
              <div key={app.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-start justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors text-start"
                  onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                  aria-expanded={isExpanded}
                >
                  <div>
                    <p className="font-medium text-sm">{app.profile?.full_name || app.profile?.email || "Applicant"}</p>
                    <p className="text-xs text-muted-foreground">{app.listings?.title} · {app.listings?.address}</p>
                    <p className="text-xs text-muted-foreground mt-1">Applied {new Date(app.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[app.status] || ""} variant="secondary">{app.status}</Badge>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-5">
                    {/* Applicant profile */}
                    {app.profile && (
                      <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <User className="w-3 h-3" /> Applicant Profile
                        </p>
                        <div className="grid sm:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-muted-foreground" />{app.profile.full_name || "—"}</div>
                          <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-muted-foreground" />{app.profile.email}</div>
                          {app.profile.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-muted-foreground" />{app.profile.phone}</div>}
                          {app.profile.date_of_birth && <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-muted-foreground" />{app.profile.date_of_birth}</div>}
                        </div>
                      </div>
                    )}

                    {/* Screening */}
                    <ScreeningResults applicationId={app.id} canTrigger />

                    {/* References */}
                    <LandlordReferenceReview applicationId={app.id} />

                    {/* Status actions */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Update Status</p>
                      <div className="flex gap-1 flex-wrap">
                        {statuses.filter(s => s !== app.status).map(s => (
                          <Button key={s} variant="ghost" size="sm" className="h-7 text-xs px-2 capitalize" onClick={() => updateStatus(app.id, s)}>
                            → {s}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Create tenancy for accepted */}
                    {app.status === "accepted" && (
                      <Button size="sm" className="gap-1" onClick={() => openCreateTenancy(app)}>
                        <Home className="w-4 h-4" /> Create Tenancy & Contract
                      </Button>
                    )}

                    {/* Messages */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Messages
                      </p>
                      {messages.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No messages yet.</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {messages.map(msg => (
                            <div key={msg.id} className={`rounded-lg p-2 text-sm ${msg.sender_id === user?.id ? "bg-primary/10 ml-8" : "bg-muted mr-8"}`}>
                              <p>{msg.content}</p>
                              <p className="text-xs text-muted-foreground mt-1">{new Date(msg.created_at).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {!["withdrawn", "rejected"].includes(app.status) && (
                        <div className="flex gap-2">
                          <Input value={msgInput} onChange={e => setMsgInput(e.target.value)} placeholder="Send a message…" onKeyDown={e => e.key === "Enter" && sendMessage()} />
                          <Button size="icon" onClick={sendMessage} disabled={sendingMsg || !msgInput.trim()}><Send className="w-4 h-4" /></Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Tenancy Dialog */}
      <Dialog open={!!createTenancy} onOpenChange={() => setCreateTenancy(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Tenancy</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">
            Set up the tenancy for <strong>{createTenancy?.profile?.full_name || "tenant"}</strong> at <strong>{createTenancy?.listings?.title}</strong>. A contract will be automatically created.
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Start Date *</label>
                <Input type="date" value={tenancyForm.start_date} onChange={e => setTenancyForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">End Date *</label>
                <Input type="date" value={tenancyForm.end_date} onChange={e => setTenancyForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Rent PCM (£) *</label>
                <Input type="number" value={tenancyForm.rent_pcm} onChange={e => setTenancyForm(f => ({ ...f, rent_pcm: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Deposit (£)</label>
                <Input type="number" value={tenancyForm.deposit} onChange={e => setTenancyForm(f => ({ ...f, deposit: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTenancy(null)}>Cancel</Button>
            <Button onClick={handleCreateTenancy} disabled={creatingTenancy}>
              {creatingTenancy ? "Creating…" : "Create Tenancy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
