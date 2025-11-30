import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/auth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const MyBookings = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyBookings = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('room_bookings')
          .select('*')
          .eq('user_id', user.id)
          .order('start_time', { ascending: false });

        if (error) throw error;
        setBookings(data || []);
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyBookings();
  }, []);

  if (loading) {
    return <div className="text-muted-foreground">Loading your bookings...</div>;
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Room</TableHead>
            <TableHead>Start Time</TableHead>
            <TableHead>End Time</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell className="font-medium">{booking.title}</TableCell>
              <TableCell>Room {booking.room_id?.substring(0, 8)}</TableCell>
              <TableCell>{format(new Date(booking.start_time), 'MMM dd, yyyy HH:mm')}</TableCell>
              <TableCell>{format(new Date(booking.end_time), 'MMM dd, yyyy HH:mm')}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    booking.status === 'approved' ? 'default' :
                    booking.status === 'rejected' ? 'destructive' : 'secondary'
                  }
                >
                  {booking.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default MyBookings;
