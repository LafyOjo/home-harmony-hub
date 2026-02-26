import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: t("auth.loginFailed"), description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
    }
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
          <h1 className="font-display text-xl font-bold mb-6">{t("auth.welcomeBack")}</h1>
          <form onSubmit={handleLogin} className="space-y-4" aria-label={t("auth.welcomeBack")}>
            <div>
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("auth.signingIn") : t("common.signIn")}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground text-center mt-4">
            {t("auth.noAccount")}{" "}
            <Link to="/auth/register" className="text-primary font-medium hover:underline">{t("auth.register")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
