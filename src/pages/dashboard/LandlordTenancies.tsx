import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Home, PoundSterling, Users, Wrench, MessageSquare, FileSignature } from "lucide-react";
import { format, parseISO, eachMonthOfInterval, addMonths } from "date-fns";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function LandlordTenancies() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tenancies, isLoading } = useQuery({
    queryKey: ["landlord-tenancies", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenancies")
        .select("*, listings(title, address)")
        .eq("landlord_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return "bg-success text-success-foreground";
      case "ended": return "bg-muted text-muted-foreground";
      case "terminated": return "bg-destructive text-destructive-foreground";
      default: return "bg-primary text-primary-foreground";
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">Tenancies</h1>
          <p className="text-muted-foreground">Manage active and past tenancies</p>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <div className="space-y-4">
          {tenancies?.map(t => (
            <Link key={t.id} to={`/dashboard/tenancies/${t.id}`}>
              <Card className="p-5 hover:border-primary/30 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{(t.listings as any)?.title}</p>
                    <p className="text-sm text-muted-foreground">{(t.listings as any)?.address}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(parseISO(t.start_date), "d MMM yyyy")} – {format(parseISO(t.end_date), "d MMM yyyy")} · £{Number(t.rent_pcm).toLocaleString()}/mo
                    </p>
                  </div>
                  <Badge className={statusColor(t.status)}>{t.status}</Badge>
                </div>
              </Card>
            </Link>
          ))}
          {(!tenancies || tenancies.length === 0) && (
            <Card className="p-8 text-center">
              <Home className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No tenancies yet. Accept an application to create a tenancy.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
