import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TenantProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    date_of_birth: "",
    move_in_preference: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setProfile({
          full_name: data.full_name || "",
          phone: data.phone || "",
          date_of_birth: data.date_of_birth || "",
          move_in_preference: data.move_in_preference || "",
        });
      }
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name,
      phone: profile.phone,
      date_of_birth: profile.date_of_birth || null,
      move_in_preference: profile.move_in_preference || null,
    }).eq("user_id", user.id);
    setLoading(false);
    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile saved" });
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold mb-6">Your Profile</h1>
      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="household">Household</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
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
              <Label htmlFor="movein">Preferred Move-in Date</Label>
              <Input id="movein" type="date" value={profile.move_in_preference} onChange={e => setProfile(p => ({ ...p, move_in_preference: e.target.value }))} />
            </div>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="addresses">
          <div className="bg-card border border-border rounded-xl p-6">
            <p className="text-muted-foreground text-sm">Address history management — add your last 3 years of addresses.</p>
            <p className="text-xs text-muted-foreground mt-2">Coming in next update</p>
          </div>
        </TabsContent>

        <TabsContent value="employment">
          <div className="bg-card border border-border rounded-xl p-6">
            <p className="text-muted-foreground text-sm">Employment and income details.</p>
            <p className="text-xs text-muted-foreground mt-2">Coming in next update</p>
          </div>
        </TabsContent>

        <TabsContent value="household">
          <div className="bg-card border border-border rounded-xl p-6">
            <p className="text-muted-foreground text-sm">Household members.</p>
            <p className="text-xs text-muted-foreground mt-2">Coming in next update</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
