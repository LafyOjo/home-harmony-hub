import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RoleSelector from "@/components/RoleSelector";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading, refreshRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth/login" replace />;

  if (!role) {
    return (
      <RoleSelector
        userId={user.id}
        onRoleSelected={() => refreshRole()}
      />
    );
  }

  return <>{children}</>;
}
