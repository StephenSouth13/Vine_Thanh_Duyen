import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@/lib/auth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { SkeletonTable } from "@/components/ui/skeleton-table";

const LeaveHistory = ({ role }: { role: UserRole }) => {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLeaves = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      let query = supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (role === 'staff') {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLeaves(data || []);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();

    const channel = supabase
      .channel('leaves-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => {
        fetchLeaves();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role]);

  const handleApprove = async (leaveId: string) => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', leaveId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Leave request approved"
      });
    } catch (error) {
      console.error('Error approving leave:', error);
      toast({
        title: "Error",
        description: "Failed to approve leave",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (leaveId: string) => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', leaveId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Leave request rejected"
      });
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast({
        title: "Error",
        description: "Failed to reject leave",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <SkeletonTable rows={6} columns={role === 'leader' || role === 'admin' ? 7 : 5} />;
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            {(role === 'leader' || role === 'admin') && <TableHead>Employee</TableHead>}
            <TableHead>Type</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted</TableHead>
            {(role === 'leader' || role === 'admin') && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaves.map((leave) => (
            <TableRow key={leave.id}>
              {(role === 'leader' || role === 'admin') && (
                <TableCell>
                  User {leave.user_id?.substring(0, 8)}
                </TableCell>
              )}
              <TableCell className="capitalize">{leave.type.replace('_', ' ')}</TableCell>
              <TableCell>{format(new Date(leave.start_date), 'MMM dd, yyyy')}</TableCell>
              <TableCell>{format(new Date(leave.end_date), 'MMM dd, yyyy')}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    leave.status === 'approved' ? 'default' :
                    leave.status === 'rejected' ? 'destructive' : 'secondary'
                  }
                >
                  {leave.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(leave.created_at), 'MMM dd, yyyy')}
              </TableCell>
              {(role === 'leader' || role === 'admin') && (
                <TableCell>
                  {leave.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(leave.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(leave.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default LeaveHistory;
