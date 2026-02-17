import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, List, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
          { label: "Pending Review", value: "—", color: "text-warning" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className={`font-display text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mb-6">
        <h2 className="font-display text-lg font-semibold">Quick Actions</h2>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          to="/dashboard/listings/new"
          className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Create Listing</p>
            <p className="text-xs text-muted-foreground">Add a new property</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
        <Link
          to="/dashboard/pipeline"
          className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <List className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">View Pipeline</p>
            <p className="text-xs text-muted-foreground">Review applicants</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
      </div>
    </div>
  );
}
