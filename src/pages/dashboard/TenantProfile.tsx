import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  User, Phone, Mail, Calendar, MapPin, Briefcase, Shield, Bell,
  Upload, Trash2, Plus, Camera, Eye, EyeOff, Lock, FileText
} from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/* ─── helpers ─── */
function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

/* ─── types ─── */
interface Address {
  id?: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  postcode: string;
  from_date: string;
  to_date: string;
  is_current: boolean;
}
interface Employment {
  id?: string;
  employer_name: string;
  job_title: string;
  start_date: string;
  annual_income: string;
}

export default function TenantProfile() {
  const { user } = useAuth();
  const { toast } = useToast();

  /* ── personal ── */
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "", phone: "", date_of_birth: "", move_in_preference: "",
    avatar_storage_key: "", notification_email: true, notification_sms: false,
  });
  const avatarRef = useRef<HTMLInputElement>(null);

  /* ── addresses ── */
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addrDialog, setAddrDialog] = useState(false);
  const [editAddr, setEditAddr] = useState<Address>({
    address_line_1: "", address_line_2: "", city: "", postcode: "", from_date: "", to_date: "", is_current: false,
  });
  const [editAddrId, setEditAddrId] = useState<string | null>(null);

  /* ── employment ── */
  const [employments, setEmployments] = useState<Employment[]>([]);
  const [empDialog, setEmpDialog] = useState(false);
  const [editEmp, setEditEmp] = useState<Employment>({
    employer_name: "", job_title: "", start_date: "", annual_income: "",
  });
  const [editEmpId, setEditEmpId] = useState<string | null>(null);

  /* ── documents ── */
  const [documents, setDocuments] = useState<any[]>([]);
  const [docCategory, setDocCategory] = useState("id");
  const docRef = useRef<HTMLInputElement>(null);

  /* ── security ── */
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  /* ── load data ── */
  useEffect(() => {
    if (!user) return;
    // profile
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setProfile({
        full_name: data.full_name || "",
        phone: data.phone || "",
        date_of_birth: data.date_of_birth || "",
        move_in_preference: data.move_in_preference || "",
        avatar_storage_key: (data as any).avatar_storage_key || "",
        notification_email: (data as any).notification_email ?? true,
        notification_sms: (data as any).notification_sms ?? false,
      });
    });
    // addresses
    supabase.from("tenant_addresses").select("*").eq("user_id", user.id).order("from_date", { ascending: false }).then(({ data }) => {
      if (data) setAddresses(data as any);
    });
    // employment
    supabase.from("tenant_employment").select("*").eq("user_id", user.id).order("start_date", { ascending: false }).then(({ data }) => {
      if (data) setEmployments(data.map(e => ({ ...e, annual_income: e.annual_income?.toString() || "" })) as any);
    });
    // documents
    supabase.from("documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setDocuments(data);
    });
  }, [user]);

  /* ── save personal ── */
  const handleSavePersonal = async () => {
    if (!user) return;
    if (!profile.full_name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name,
      phone: profile.phone,
      date_of_birth: profile.date_of_birth || null,
      move_in_preference: profile.move_in_preference || null,
    }).eq("user_id", user.id);
    setSaving(false);
    toast(error ? { title: "Error", description: error.message, variant: "destructive" } : { title: "Profile saved" });
  };

  /* ── avatar upload ── */
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Max 5 MB", variant: "destructive" }); return; }
    const key = `${user.id}/avatar-${Date.now()}`;
    const { error } = await supabase.storage.from("avatars").upload(key, file, { upsert: true });
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); return; }
    await supabase.from("profiles").update({ avatar_storage_key: key } as any).eq("user_id", user.id);
    setProfile(p => ({ ...p, avatar_storage_key: key }));
    toast({ title: "Avatar updated" });
  };

  const avatarUrl = profile.avatar_storage_key
    ? `${SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_storage_key}`
    : undefined;

  /* ── addresses CRUD ── */
  const openNewAddr = () => { setEditAddrId(null); setEditAddr({ address_line_1: "", address_line_2: "", city: "", postcode: "", from_date: "", to_date: "", is_current: false }); setAddrDialog(true); };
  const openEditAddr = (a: Address) => { setEditAddrId(a.id!); setEditAddr(a); setAddrDialog(true); };
  const saveAddr = async () => {
    if (!user) return;
    if (!editAddr.address_line_1 || !editAddr.city || !editAddr.postcode || !editAddr.from_date) {
      toast({ title: "Fill required fields", variant: "destructive" }); return;
    }
    if (editAddrId) {
      await supabase.from("tenant_addresses").update({ ...editAddr } as any).eq("id", editAddrId);
    } else {
      await supabase.from("tenant_addresses").insert({ ...editAddr, user_id: user.id } as any);
    }
    const { data } = await supabase.from("tenant_addresses").select("*").eq("user_id", user.id).order("from_date", { ascending: false });
    setAddresses(data as any || []);
    setAddrDialog(false);
    toast({ title: editAddrId ? "Address updated" : "Address added" });
  };
  const deleteAddr = async (id: string) => {
    await supabase.from("tenant_addresses").delete().eq("id", id);
    setAddresses(prev => prev.filter(a => a.id !== id));
    toast({ title: "Address removed" });
  };

  /* ── employment CRUD ── */
  const openNewEmp = () => { setEditEmpId(null); setEditEmp({ employer_name: "", job_title: "", start_date: "", annual_income: "" }); setEmpDialog(true); };
  const openEditEmp = (e: Employment) => { setEditEmpId(e.id!); setEditEmp(e); setEmpDialog(true); };
  const saveEmp = async () => {
    if (!user) return;
    if (!editEmp.employer_name || !editEmp.job_title || !editEmp.start_date) {
      toast({ title: "Fill required fields", variant: "destructive" }); return;
    }
    const payload = { employer_name: editEmp.employer_name, job_title: editEmp.job_title, start_date: editEmp.start_date, annual_income: editEmp.annual_income ? Number(editEmp.annual_income) : null };
    if (editEmpId) {
      await supabase.from("tenant_employment").update(payload).eq("id", editEmpId);
    } else {
      await supabase.from("tenant_employment").insert({ ...payload, user_id: user.id });
    }
    const { data } = await supabase.from("tenant_employment").select("*").eq("user_id", user.id).order("start_date", { ascending: false });
    setEmployments((data || []).map(e => ({ ...e, annual_income: e.annual_income?.toString() || "" })) as any);
    setEmpDialog(false);
    toast({ title: editEmpId ? "Employment updated" : "Employment added" });
  };
  const deleteEmp = async (id: string) => {
    await supabase.from("tenant_employment").delete().eq("id", id);
    setEmployments(prev => prev.filter(e => e.id !== id));
    toast({ title: "Employment removed" });
  };

  /* ── document upload ── */
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const key = `${user.id}/${docCategory}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("documents").upload(key, file);
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); return; }
    await supabase.from("documents").insert({ user_id: user.id, file_name: file.name, storage_key: key, category: docCategory, content_type: file.type, file_size: file.size });
    const { data } = await supabase.from("documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setDocuments(data || []);
    toast({ title: "Document uploaded" });
  };
  const deleteDoc = async (doc: any) => {
    await supabase.storage.from("documents").remove([doc.storage_key]);
    await supabase.from("documents").delete().eq("id", doc.id);
    setDocuments(prev => prev.filter(d => d.id !== doc.id));
    toast({ title: "Document deleted" });
  };

  /* ── password change ── */
  const handlePasswordChange = async () => {
    if (newPassword.length < 8) { toast({ title: "Password must be at least 8 characters", variant: "destructive" }); return; }
    if (newPassword !== confirmPassword) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
    setChangingPw(true);
    // re-authenticate with current password
    const { error: reAuthError } = await supabase.auth.signInWithPassword({
      email: user?.email || "", password: currentPassword,
    });
    if (reAuthError) { setChangingPw(false); toast({ title: "Current password incorrect", variant: "destructive" }); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPw(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    toast({ title: "Password updated" });
  };

  /* ── notification prefs ── */
  const saveNotifPrefs = async (key: "notification_email" | "notification_sms", val: boolean) => {
    if (!user) return;
    setProfile(p => ({ ...p, [key]: val }));
    await supabase.from("profiles").update({ [key]: val } as any).eq("user_id", user.id);
    toast({ title: "Preferences saved" });
  };

  /* ── fmt ── */
  const fmtCurrency = (v: string | number | null) => v ? `£${Number(v).toLocaleString()}` : "—";

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold mb-6">Your Profile</h1>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="personal"><User className="h-4 w-4 mr-1" />Personal</TabsTrigger>
          <TabsTrigger value="addresses"><MapPin className="h-4 w-4 mr-1" />Addresses</TabsTrigger>
          <TabsTrigger value="employment"><Briefcase className="h-4 w-4 mr-1" />Employment</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="h-4 w-4 mr-1" />Documents</TabsTrigger>
          <TabsTrigger value="security"><Shield className="h-4 w-4 mr-1" />Security</TabsTrigger>
          <TabsTrigger value="preferences"><Bell className="h-4 w-4 mr-1" />Preferences</TabsTrigger>
        </TabsList>

        {/* ═══ PERSONAL ═══ */}
        <TabsContent value="personal" className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            {/* avatar */}
            <div className="flex items-center gap-4">
              <div className="relative group cursor-pointer" onClick={() => avatarRef.current?.click()}>
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="text-lg">{initials(profile.full_name || "U")}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <div>
                <p className="font-semibold text-lg">{profile.full_name || "Your Name"}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="dob">Date of Birth</Label>
                <Input id="dob" type="date" value={profile.date_of_birth} onChange={e => setProfile(p => ({ ...p, date_of_birth: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="movein">Preferred Move-in</Label>
                <Input id="movein" type="date" value={profile.move_in_preference} onChange={e => setProfile(p => ({ ...p, move_in_preference: e.target.value }))} />
              </div>
            </div>
            <Button onClick={handleSavePersonal} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
          </div>
        </TabsContent>

        {/* ═══ ADDRESSES ═══ */}
        <TabsContent value="addresses" className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold">Address History</p>
              <Button size="sm" onClick={openNewAddr}><Plus className="h-4 w-4 mr-1" />Add Address</Button>
            </div>
            {addresses.length === 0 && <p className="text-sm text-muted-foreground">No addresses yet. Add your last 3 years of addresses.</p>}
            <div className="space-y-3">
              {addresses.map(a => (
                <div key={a.id} className="border border-border rounded-lg p-4 flex justify-between items-start">
                  <div>
                    <p className="font-medium">{a.address_line_1}{a.address_line_2 ? `, ${a.address_line_2}` : ""}</p>
                    <p className="text-sm text-muted-foreground">{a.city}, {a.postcode}</p>
                    <p className="text-xs text-muted-foreground mt-1">{a.from_date} → {a.to_date || "Present"}</p>
                    {a.is_current && <Badge variant="secondary" className="mt-1">Current</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEditAddr(a)}><FileText className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteAddr(a.id!)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ═══ EMPLOYMENT ═══ */}
        <TabsContent value="employment" className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold">Employment & Income</p>
              <Button size="sm" onClick={openNewEmp}><Plus className="h-4 w-4 mr-1" />Add Employment</Button>
            </div>
            {employments.length === 0 && <p className="text-sm text-muted-foreground">No employment records yet.</p>}
            <div className="space-y-3">
              {employments.map(e => (
                <div key={e.id} className="border border-border rounded-lg p-4 flex justify-between items-start">
                  <div>
                    <p className="font-medium">{e.job_title}</p>
                    <p className="text-sm text-muted-foreground">{e.employer_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">Since {e.start_date} · {fmtCurrency(e.annual_income)}/yr</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEditEmp(e)}><FileText className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteEmp(e.id!)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ═══ DOCUMENTS ═══ */}
        <TabsContent value="documents" className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold">Identity & Income Documents</p>
              <div className="flex gap-2 items-center">
                <Select value={docCategory} onValueChange={setDocCategory}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id">Photo ID</SelectItem>
                    <SelectItem value="proof_of_income">Proof of Income</SelectItem>
                    <SelectItem value="bank_statement">Bank Statement</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => docRef.current?.click()}><Upload className="h-4 w-4 mr-1" />Upload</Button>
                <input ref={docRef} type="file" className="hidden" onChange={handleDocUpload} />
              </div>
            </div>
            {documents.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>}
            <div className="space-y-2">
              {documents.map(d => (
                <div key={d.id} className="border border-border rounded-lg p-3 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{d.file_name}</p>
                      <p className="text-xs text-muted-foreground">{d.category} · {d.file_size ? `${(d.file_size / 1024).toFixed(0)} KB` : ""}</p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => deleteDoc(d)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ═══ SECURITY ═══ */}
        <TabsContent value="security" className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <p className="font-semibold flex items-center gap-2"><Lock className="h-4 w-4" />Change Password</p>
            <div className="max-w-sm space-y-3">
              <div>
                <Label>Current Password</Label>
                <div className="relative">
                  <Input type={showPw ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                  <button type="button" className="absolute right-2 top-2.5 text-muted-foreground" onClick={() => setShowPw(!showPw)}>
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>New Password</Label>
                <Input type={showPw ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
              <div>
                <Label>Confirm New Password</Label>
                <Input type={showPw ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>
              {newPassword && newPassword.length < 8 && <p className="text-xs text-destructive">Min 8 characters</p>}
              {confirmPassword && newPassword !== confirmPassword && <p className="text-xs text-destructive">Passwords don't match</p>}
              <Button onClick={handlePasswordChange} disabled={changingPw || !currentPassword || !newPassword}>
                {changingPw ? "Updating…" : "Update Password"}
              </Button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-2">
            <p className="font-semibold">Email</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="text-xs text-muted-foreground">To change your email, contact support.</p>
          </div>
        </TabsContent>

        {/* ═══ PREFERENCES ═══ */}
        <TabsContent value="preferences" className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <p className="font-semibold flex items-center gap-2"><Bell className="h-4 w-4" />Notification Preferences</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-muted-foreground">Receive updates via email</p>
              </div>
              <Switch checked={profile.notification_email} onCheckedChange={v => saveNotifPrefs("notification_email", v)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">SMS Notifications</p>
                <p className="text-xs text-muted-foreground">Receive urgent alerts via SMS</p>
              </div>
              <Switch checked={profile.notification_sms} onCheckedChange={v => saveNotifPrefs("notification_sms", v)} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Address Dialog ── */}
      <Dialog open={addrDialog} onOpenChange={setAddrDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editAddrId ? "Edit Address" : "Add Address"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Address Line 1 *</Label><Input value={editAddr.address_line_1} onChange={e => setEditAddr(p => ({ ...p, address_line_1: e.target.value }))} /></div>
            <div><Label>Address Line 2</Label><Input value={editAddr.address_line_2} onChange={e => setEditAddr(p => ({ ...p, address_line_2: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>City *</Label><Input value={editAddr.city} onChange={e => setEditAddr(p => ({ ...p, city: e.target.value }))} /></div>
              <div><Label>Postcode *</Label><Input value={editAddr.postcode} onChange={e => setEditAddr(p => ({ ...p, postcode: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>From *</Label><Input type="date" value={editAddr.from_date} onChange={e => setEditAddr(p => ({ ...p, from_date: e.target.value }))} /></div>
              <div><Label>To</Label><Input type="date" value={editAddr.to_date} onChange={e => setEditAddr(p => ({ ...p, to_date: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editAddr.is_current} onCheckedChange={v => setEditAddr(p => ({ ...p, is_current: v, to_date: v ? "" : p.to_date }))} />
              <Label>Current address</Label>
            </div>
          </div>
          <DialogFooter><Button onClick={saveAddr}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Employment Dialog ── */}
      <Dialog open={empDialog} onOpenChange={setEmpDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editEmpId ? "Edit Employment" : "Add Employment"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Employer *</Label><Input value={editEmp.employer_name} onChange={e => setEditEmp(p => ({ ...p, employer_name: e.target.value }))} /></div>
            <div><Label>Job Title *</Label><Input value={editEmp.job_title} onChange={e => setEditEmp(p => ({ ...p, job_title: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date *</Label><Input type="date" value={editEmp.start_date} onChange={e => setEditEmp(p => ({ ...p, start_date: e.target.value }))} /></div>
              <div><Label>Annual Income</Label><Input type="number" value={editEmp.annual_income} onChange={e => setEditEmp(p => ({ ...p, annual_income: e.target.value }))} placeholder="£" /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={saveEmp}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
