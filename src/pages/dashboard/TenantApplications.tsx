import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Inbox, ChevronDown, ChevronUp, Send, XCircle, CheckCircle2, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ScreeningResults from "@/components/ScreeningResults";
import { formatCurrency, formatDateShort } from "@/lib/locale-format";

type Application = {
  id: string;
  status: string;
  created_at: string;
  listing_id: string;
  listings?: { title: string; address: string; rent_pcm: number } | null;
};

type Message = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-primary/10 text-primary",
  reviewed: "bg-accent/20 text-accent-foreground",
  shortlisted: "bg-primary/15 text-primary",
  offered: "bg-chart-4/15 text-chart-4",
  accepted: "bg-chart-2/15 text-chart-2",
  rejected: "bg-destructive/10 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
};

export default function TenantApplications() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [apps, setApps] = useState<Application[]>([]);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ appId: string; action: "withdraw" | "accept" } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApps = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("applications")
      .select("id, status, created_at, listing_id, listings(title, address, rent_pcm)")
      .eq("tenant_id", user.id)
      .order("created_at", { ascending: false });
    setApps((data as any) || []);
  };

  useEffect(() => { fetchApps(); }, [user]);

  // Load messages when expanding
  useEffect(() => {
    if (!expandedApp) { setMessages([]); return; }
    supabase.from("messages").select("*").eq("application_id", expandedApp)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data as Message[]) || []));
  }, [expandedApp]);

  const sendMessage = async () => {
    if (!user || !expandedApp || !msgInput.trim()) return;
    setSendingMsg(true);
    const { error } = await supabase.from("messages").insert({
      application_id: expandedApp,
      sender_id: user.id,
      content: msgInput.trim(),
    });
    setSendingMsg(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setMsgInput("");
    const { data } = await supabase.from("messages").select("*").eq("application_id", expandedApp).order("created_at", { ascending: true });
    setMessages((data as Message[]) || []);
  };

  const handleAction = async () => {
    if (!confirmDialog) return;
    setActionLoading(true);
    const newStatus = confirmDialog.action === "withdraw" ? "withdrawn" : "accepted";
    const { error } = await supabase.from("applications").update({ status: newStatus as any }).eq("id", confirmDialog.appId);
    setActionLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: confirmDialog.action === "withdraw" ? "Application withdrawn" : "Offer accepted" });
    setConfirmDialog(null);
    fetchApps();
  };

  const canWithdraw = (status: string) => ["submitted", "reviewed", "shortlisted"].includes(status);
  const canAccept = (status: string) => status === "offered";

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">{t("dashboard.myApplications")}</h1>
        <Button variant="outline" size="sm" asChild>
          <a href="/listings">Browse Listings</a>
        </Button>
      </div>

      {apps.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center" role="status">
          <Inbox className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">{t("dashboard.noApplications")}</p>
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <a href="/listings">Find a property</a>
          </Button>
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
                    <p className="font-medium text-sm">{app.listings?.title || "Listing"}</p>
                    <p className="text-xs text-muted-foreground">{app.listings?.address}</p>
                    {app.listings?.rent_pcm && (
                      <p className="text-xs text-muted-foreground mt-1">{formatCurrency(app.listings.rent_pcm)}/mo</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Applied {formatDateShort(app.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[app.status] || ""} variant="secondary">
                      {app.status}
                    </Badge>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-4">
                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {canWithdraw(app.status) && (
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => setConfirmDialog({ appId: app.id, action: "withdraw" })}>
                          <XCircle className="w-4 h-4" /> Withdraw
                        </Button>
                      )}
                      {canAccept(app.status) && (
                        <Button size="sm" className="gap-1" onClick={() => setConfirmDialog({ appId: app.id, action: "accept" })}>
                          <CheckCircle2 className="w-4 h-4" /> Accept Offer
                        </Button>
                      )}
                    </div>

                    {/* Screening */}
                    <ScreeningResults applicationId={app.id} />

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
                      {!["withdrawn", "rejected", "accepted"].includes(app.status) && (
                        <div className="flex gap-2">
                          <Input
                            value={msgInput}
                            onChange={e => setMsgInput(e.target.value)}
                            placeholder="Send a message…"
                            onKeyDown={e => e.key === "Enter" && sendMessage()}
                          />
                          <Button size="icon" onClick={sendMessage} disabled={sendingMsg || !msgInput.trim()}>
                            <Send className="w-4 h-4" />
                          </Button>
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

      {/* Confirm dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.action === "withdraw" ? "Withdraw Application" : "Accept Offer"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmDialog?.action === "withdraw"
              ? "Are you sure you want to withdraw this application? This cannot be undone."
              : "By accepting this offer, you agree to proceed with the tenancy. The landlord will be notified."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button
              variant={confirmDialog?.action === "withdraw" ? "destructive" : "default"}
              onClick={handleAction}
              disabled={actionLoading}
            >
              {actionLoading ? "Processing…" : confirmDialog?.action === "withdraw" ? "Withdraw" : "Accept"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
