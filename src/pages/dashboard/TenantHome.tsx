import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { User, FileText, Send, Inbox, ArrowRight } from "lucide-react";

const quickActions = [
  { to: "/dashboard/profile", icon: User, label: "Complete Profile", desc: "Fill in your details" },
  { to: "/dashboard/documents", icon: FileText, label: "Upload Documents", desc: "ID, payslips & more" },
  { to: "/dashboard/references", icon: Send, label: "Request References", desc: "Employer & landlord" },
  { to: "/dashboard/applications", icon: Inbox, label: "My Applications", desc: "Track your progress" },
];

export default function TenantHome() {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold mb-1">Welcome back</h1>
        <p className="text-muted-foreground mb-8">{user?.email}</p>
      </motion.div>

      {/* Profile completeness placeholder */}
      <div className="bg-card border border-border rounded-xl p-5 mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Profile Completeness</span>
          <span className="text-sm text-muted-foreground">25%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: "25%" }} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">Complete your profile to generate your Tenant Pack</p>
      </div>

      {/* Quick actions */}
      <h2 className="font-display text-lg font-semibold mb-4">Quick Actions</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {quickActions.map((action, i) => (
          <motion.div
            key={action.to}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              to={action.to}
              className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <action.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
