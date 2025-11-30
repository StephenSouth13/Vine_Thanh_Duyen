import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface CreateBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingCreated: () => void;
}

const CreateBookingDialog = ({ open, onOpenChange, onBookingCreated }: CreateBookingDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [roomId, setRoomId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchRooms();
    }
  }, [open]);

  const fetchRooms = async () => {
    const { data } = await supabase
      .from('meeting_rooms')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    
    if (data) setRooms(data);
  };

  const checkTimeConflict = async (roomId: string, startTime: string, endTime: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('room_bookings')
        .select('*')
        .eq('room_id', roomId)
        .eq('status', 'approved');

      if (error) throw error;

      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();

      const hasConflict = data?.some(booking => {
        const existingStart = new Date(booking.start_time).getTime();
        const existingEnd = new Date(booking.end_time).getTime();

        return !(end <= existingStart || start >= existingEnd);
      });

      return hasConflict || false;
    } catch (error) {
      console.error('Error checking time conflict:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      const hasConflict = await checkTimeConflict(roomId, startTime, endTime);
      if (hasConflict) {
        toast({
          title: "Booking Conflict",
          description: "This room is already booked for the selected time. Please choose a different time or room.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('room_bookings').insert([{
        title,
        description: description || null,
        room_id: roomId,
        user_id: user.id,
        start_time: startTime,
        end_time: endTime,
        status: 'pending'
      }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Booking created successfully"
      });

      onBookingCreated();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Error",
        description: "Failed to create booking",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setRoomId("");
    setStartTime("");
    setEndTime("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Booking</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Meeting Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="room">Room *</Label>
            <Select value={roomId} onValueChange={setRoomId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select room" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start">Start Time *</Label>
              <Input
                id="start"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="end">End Time *</Label>
              <Input
                id="end"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Booking"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBookingDialog;
