import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Video, MapPin } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  listingId: string;
  landlordId: string;
  listingTitle: string;
};

export default function BookViewingDialog({ listingId, landlordId, listingTitle }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [viewingType, setViewingType] = useState("in_person");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !date || !time) return;
    setSubmitting(true);

    const proposedDatetime = new Date(`${date}T${time}:00`).toISOString();

    const { error } = await (supabase as any).from("viewing_appointments").insert({
      listing_id: listingId,
      tenant_id: user.id,
      landlord_id: landlordId,
      proposed_datetime: proposedDatetime,
      viewing_type: viewingType,
      notes: notes || null,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Viewing requested!", description: "The landlord will confirm your appointment." });
      setOpen(false);
      setDate(""); setTime("10:00"); setNotes("");
    }
    setSubmitting(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <Calendar className="w-4 h-4" /> Book a Viewing
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book a Viewing — {listingTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Preferred Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
          </div>
          <div>
            <Label>Preferred Time</Label>
            <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
          <div>
            <Label>Viewing Type</Label>
            <div className="flex gap-2 mt-1">
              <Button
                type="button"
                variant={viewingType === "in_person" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewingType("in_person")}
                className="gap-1"
              >
                <MapPin className="w-3 h-3" /> In Person
              </Button>
              <Button
                type="button"
                variant={viewingType === "video" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewingType("video")}
                className="gap-1"
              >
                <Video className="w-3 h-3" /> Video Call
              </Button>
            </div>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any specific requirements or questions..." rows={2} />
          </div>
          <Button onClick={handleSubmit} disabled={submitting || !date} className="w-full">
            {submitting ? "Requesting..." : "Request Viewing"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
