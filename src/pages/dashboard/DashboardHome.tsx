import { useAuth } from "@/contexts/AuthContext";
import TenantHome from "./TenantHome";
import LandlordHome from "./LandlordHome";

export default function DashboardHome() {
  const { role } = useAuth();
  
  if (role === "landlord" || role === "agent") {
    return <LandlordHome />;
  }
  return <TenantHome />;
}
