import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Home, Building2 } from "lucide-react";
import { setUserRole } from "@/lib/supabase-helpers";
import { useToast } from "@/hooks/use-toast";

interface RoleSelectorProps {
  userId: string;
  onRoleSelected: (role: "tenant" | "landlord") => void;
}

export default function RoleSelector({ userId, onRoleSelected }: RoleSelectorProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSelect = async (role: "tenant" | "landlord") => {
    setLoading(true);
    try {
      await setUserRole(userId, role);
      onRoleSelected(role);
    } catch (err: any) {
      toast({ title: "Error setting role", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold">{t("auth.iAmA") || "How will you use RentReady?"}</h1>
          <p className="text-muted-foreground mt-2">Choose your role to get started</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => !loading && handleSelect("tenant")}
          >
            <CardHeader className="text-center pb-2">
              <Home className="w-10 h-10 mx-auto text-primary" />
              <CardTitle className="text-lg">{t("auth.tenant") || "Tenant"}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-xs">
                Find a home, manage rent, and track your tenancy
              </CardDescription>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => !loading && handleSelect("landlord")}
          >
            <CardHeader className="text-center pb-2">
              <Building2 className="w-10 h-10 mx-auto text-primary" />
              <CardTitle className="text-lg">{t("auth.landlord") || "Landlord"}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-xs">
                List properties, manage tenants, and track payments
              </CardDescription>
            </CardContent>
          </Card>
        </div>
        {loading && (
          <div className="flex justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
