import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { setUserRole } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Register() {
  const { t } = useTranslation();
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
      toast({ title: t("auth.acceptTerms"), variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      toast({ title: t("auth.registrationFailed"), description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    if (data.user) {
      try {
        await setUserRole(data.user.id, role);
        await supabase.from("profiles").update({ full_name: fullName }).eq("user_id", data.user.id);
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
    toast({ title: t("auth.checkEmail"), description: t("auth.verificationSent") });
    navigate("/auth/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-between items-center mb-8">
          <Link to="/" className="font-display text-2xl font-bold text-primary" aria-label={t("common.appName")}>
            {t("common.appName")}
          </Link>
          <LanguageSwitcher />
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h1 className="font-display text-xl font-bold mb-6">{t("auth.createAccount")}</h1>
          <form onSubmit={handleRegister} className="space-y-4" aria-label={t("auth.createAccount")}>
            <div>
              <Label htmlFor="fullName">{t("auth.fullName")}</Label>
              <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} required autoComplete="name" />
            </div>
            <div>
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
            </div>
            <fieldset>
              <legend className="text-sm font-medium">{t("auth.iAmA")}</legend>
              <div className="flex gap-3 mt-2">
                <Button type="button" variant={role === "tenant" ? "default" : "outline"} size="sm" onClick={() => setRole("tenant")} aria-pressed={role === "tenant"}>
                  {t("auth.tenant")}
                </Button>
                <Button type="button" variant={role === "landlord" ? "default" : "outline"} size="sm" onClick={() => setRole("landlord")} aria-pressed={role === "landlord"}>
                  {t("auth.landlord")}
                </Button>
              </div>
            </fieldset>
            <div className="flex items-start gap-2">
              <Checkbox id="terms" checked={agreed} onCheckedChange={(c) => setAgreed(c === true)} />
              <Label htmlFor="terms" className="text-sm text-muted-foreground leading-snug">
                {t("auth.agreeTerms")}
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={loading || !agreed}>
              {loading ? t("auth.creatingAccount") : t("auth.createAccount")}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground text-center mt-4">
            {t("auth.haveAccount")}{" "}
            <Link to="/auth/login" className="text-primary font-medium hover:underline">{t("common.signIn")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
