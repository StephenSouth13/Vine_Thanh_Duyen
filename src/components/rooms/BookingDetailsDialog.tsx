import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/auth";
import { format } from "date-fns";
import { toast } from "sonner";
import { Users, LogIn, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface BookingDetailsDialogProps {
  booking: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoinLeave?: () => void;
}

const BookingDetailsDialog = ({ booking, open, onOpenChange, onJoinLeave }: BookingDetailsDialogProps) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [roomName, setRoomName] = useState("");
  const [creatorInfo, setCreatorInfo] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    if (open && booking) {
      loadDetails();
    }
  }, [open, booking]);

  const loadDetails = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      setCurrentUser(user);

      const { data: roomData } = await supabase
        .from('meeting_rooms')
        .select('name')
        .eq('id', booking.room_id)
        .single();

      if (roomData) setRoomName(roomData.name);

      const { data: creatorData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .eq('id', booking.user_id)
        .single();

      if (creatorData) setCreatorInfo(creatorData);

      const attendees = booking.attendees || [];
      if (attendees.length > 0) {
        const { data: participantData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', attendees);

        if (participantData) {
          setParticipants(participantData);
          setHasJoined(attendees.includes(user.id));
        }
      } else {
        setParticipants([]);
        setHasJoined(false);
      }
    } catch (error) {
      console.error('Error loading booking details:', error);
    }
  };

  const handleJoinLeave = async () => {
    setIsJoining(true);
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      let newAttendees = booking.attendees || [];

      if (hasJoined) {
        newAttendees = newAttendees.filter((id: string) => id !== user.id);
      } else {
        newAttendees = [...newAttendees, user.id];
      }

      const { error } = await supabase
        .from('room_bookings')
        .update({ attendees: newAttendees })
        .eq('id', booking.id);

      if (error) throw error;

      toast.success(hasJoined ? "Left booking successfully" : "Joined booking successfully");
      setHasJoined(!hasJoined);
      onJoinLeave?.();
      loadDetails();
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error("Failed to update attendance");
    } finally {
      setIsJoining(false);
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{booking.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Room</div>
            <div className="text-lg font-semibold">{roomName}</div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Start</div>
              <div className="font-medium">
                {format(new Date(booking.start_time), 'MMM dd, HH:mm')}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">End</div>
              <div className="font-medium">
                {format(new Date(booking.end_time), 'MMM dd, HH:mm')}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Status</div>
            <Badge
              variant={
                booking.status === 'approved' ? 'default' :
                booking.status === 'rejected' ? 'destructive' : 'secondary'
              }
            >
              {booking.status}
            </Badge>
          </div>

          {booking.description && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Description</div>
              <p className="text-sm">{booking.description}</p>
            </div>
          )}

          <div className="border-t pt-4">
            <div className="space-y-3">
              <div className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Organizer
              </div>
              {creatorInfo && (
                <div className="flex items-center gap-3 p-2 rounded-md bg-secondary/50">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={creatorInfo.avatar_url || ""} />
                    <AvatarFallback>{getInitials(creatorInfo.first_name, creatorInfo.last_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {creatorInfo.first_name} {creatorInfo.last_name}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {participants.length > 0 && (
            <div className="border-t pt-4">
              <div className="space-y-3">
                <div className="text-sm font-medium">Participants ({participants.length})</div>
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-3 p-2 rounded-md bg-secondary/50">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={participant.avatar_url || ""} />
                      <AvatarFallback>{getInitials(participant.first_name, participant.last_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {participant.first_name} {participant.last_name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentUser && currentUser.id !== creatorInfo?.id && (
            <Button
              onClick={handleJoinLeave}
              disabled={isJoining}
              className="w-full"
              variant={hasJoined ? "destructive" : "default"}
            >
              {hasJoined ? (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Leave Meeting
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Join Meeting
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDetailsDialog;
