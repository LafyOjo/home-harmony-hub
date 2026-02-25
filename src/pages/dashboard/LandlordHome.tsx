import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, List, Plus, ArrowRight, Users, Wrench, ShieldCheck } from "lucide-react";

export default function LandlordHome() {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold mb-1">Dashboard</h1>
        <p className="text-muted-foreground mb-8">{user?.email}</p>
      </motion.div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Active Listings", value: "—", color: "text-primary" },
          { label: "Total Applicants", value: "—", color: "text-accent" },
          { label: "Active Tenancies", value: "—", color: "text-success" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className={`font-display text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <h2 className="font-display text-lg font-semibold mb-4">Quick Actions</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { to: "/dashboard/listings/new", icon: Plus, label: "Create Listing", desc: "Add a new property", color: "bg-primary/10 text-primary" },
          { to: "/dashboard/pipeline", icon: List, label: "View Pipeline", desc: "Review applicants", color: "bg-accent/20 text-accent" },
          { to: "/dashboard/tenancies", icon: Users, label: "Manage Tenancies", desc: "Payments, utilities & more", color: "bg-success/10 text-success" },
          { to: "/dashboard/workers", icon: Wrench, label: "Workers & Fixers", desc: "Manage maintenance team", color: "bg-muted text-muted-foreground" },
          { to: "/dashboard/landlord-verification", icon: ShieldCheck, label: "Verification", desc: "Verify ID & properties", color: "bg-primary/10 text-primary" },
        ].map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors group"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color}`}>
              <action.icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{action.label}</p>
              <p className="text-xs text-muted-foreground">{action.desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
