import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getUserRole, getCurrentUser, getUserProfile } from "@/lib/auth";
import { UserRole } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LeaveRequestForm from "@/components/leave/LeaveRequestForm";
import LeaveHistory from "@/components/leave/LeaveHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

const Leave = () => {
  const [role, setRole] = useState<UserRole>('staff');
  const [leaveBalance, setLeaveBalance] = useState(0);

  useEffect(() => {
    const loadUserData = async () => {
      const user = await getCurrentUser();
      if (!user) return;
      
      const userRole = await getUserRole(user.id);
      setRole(userRole);

      const profile = await getUserProfile(user.id);
      if (profile) {
        setLeaveBalance(profile.annual_leave_balance);
      }
    };
    loadUserData();
  }, []);

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6 animate-fade-in pb-20 md:pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-4xl font-heading font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Leave Management
            </h2>
            <p className="text-muted-foreground mt-2">Request and manage your leave</p>
          </div>

          <Card className="w-full md:w-64 shadow-strong overflow-hidden bg-gradient-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary-foreground">
                <Calendar className="h-4 w-4" />
                Leave Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary-foreground">{leaveBalance} days</div>
              <p className="text-xs text-primary-foreground/80 mt-1">Available to use</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="request" className="w-full">
          <TabsList className="bg-secondary shadow-soft">
            <TabsTrigger value="request" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">New Request</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">History</TabsTrigger>
          </TabsList>
          <TabsContent value="request" className="mt-6">
            <LeaveRequestForm />
          </TabsContent>
          <TabsContent value="history" className="mt-6">
            <LeaveHistory role={role} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Leave;
