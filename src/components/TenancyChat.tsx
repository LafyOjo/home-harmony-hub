import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useEffect, useRef, useState } from "react";

interface TenancyChatProps {
  tenancyId: string;
  className?: string;
}

export default function TenancyChat({ tenancyId, className = "" }: TenancyChatProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useQuery({
    queryKey: ["tenancy-messages", tenancyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenancy_messages" as any)
        .select("*")
        .eq("tenancy_id", tenancyId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!tenancyId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!tenancyId) return;
    const channel = supabase
      .channel(`tenancy-chat-${tenancyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tenancy_messages",
          filter: `tenancy_id=eq.${tenancyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tenancy-messages", tenancyId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenancyId, queryClient]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("tenancy_messages").insert({
        tenancy_id: tenancyId,
        sender_id: user!.id,
        content: message.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenancy-messages", tenancyId] });
      setMessage("");
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate();
  };

  return (
    <div className={`flex flex-col border border-border rounded-lg bg-card ${className}`}>
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-display text-sm font-semibold flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          Messages
        </h3>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
        <div className="space-y-3">
          {messages && messages.length > 0 ? (
            messages.map((msg: any) => {
              const isMe = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                    <p className="text-sm">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {format(parseISO(msg.created_at), "HH:mm")}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!message.trim() || sendMutation.isPending}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
