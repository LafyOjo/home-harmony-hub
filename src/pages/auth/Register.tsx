import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { setUserRole } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export default function Register() {
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get("role") === "landlord" ? "landlord" : "tenant";
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"tenant" | "landlord">(defaultRole);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast({ title: "Please accept the terms", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    if (data.user) {
      try {
        await setUserRole(data.user.id, role);
        // Update profile name
        await supabase.from("profiles").update({ full_name: fullName }).eq("user_id", data.user.id);
        // Log consent
        await supabase.from("consents").insert({
          user_id: data.user.id,
          consent_type: "terms_and_conditions",
          version: "1.0",
        });
      } catch (err) {
        console.error("Post-registration setup error:", err);
      }
    }
    setLoading(false);
    toast({ title: "Check your email", description: "We sent a verification link to your inbox." });
    navigate("/auth/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="block text-center font-display text-2xl font-bold text-primary mb-8">
          TenantVault
        </Link>
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h1 className="font-display text-xl font-bold mb-6">Create account</h1>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
            </div>
            <div>
              <Label>I am a...</Label>
              <div className="flex gap-3 mt-2">
                <Button type="button" variant={role === "tenant" ? "default" : "outline"} size="sm" onClick={() => setRole("tenant")}>
                  Tenant
                </Button>
                <Button type="button" variant={role === "landlord" ? "default" : "outline"} size="sm" onClick={() => setRole("landlord")}>
                  Landlord / Agent
                </Button>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="terms" checked={agreed} onCheckedChange={(c) => setAgreed(c === true)} />
              <Label htmlFor="terms" className="text-sm text-muted-foreground leading-snug">
                I agree to the Terms of Service and Privacy Policy
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={loading || !agreed}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground text-center mt-4">
            Already have an account?{" "}
            <Link to="/auth/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
