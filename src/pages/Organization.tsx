import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getUserRole, getCurrentUser } from "@/lib/auth";
import { UserRole } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeamsManagement from "@/components/organization/TeamsManagement";
import ShiftsManagement from "@/components/organization/ShiftsManagement";
import UsersManagement from "@/components/organization/UsersManagement";
import AttendanceSettings from "@/components/organization/AttendanceSettings";
import SalaryManagement from "@/components/organization/SalaryManagement";
import SalaryStatistics from "@/components/organization/SalaryStatistics";

const Organization = () => {
  const [role, setRole] = useState<UserRole>('staff');

  useEffect(() => {
    const loadRole = async () => {
      const user = await getCurrentUser();
      if (!user) return;
      const userRole = await getUserRole(user.id);
      setRole(userRole);
    };
    loadRole();
  }, []);

  if (role !== 'admin') {
    return (
      <DashboardLayout role={role}>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground mt-2">Only admins can access this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6 animate-fade-in pb-20 md:pb-6">
        <div className="mb-2">
          <h2 className="text-4xl font-heading font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Organization
          </h2>
          <p className="text-muted-foreground mt-2">Manage teams, users, shifts and settings</p>
        </div>

        <Tabs defaultValue="teams" className="w-full">
          <TabsList className="bg-secondary shadow-soft">
            <TabsTrigger value="teams" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Teams</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Users</TabsTrigger>
            <TabsTrigger value="shifts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Shifts</TabsTrigger>
            <TabsTrigger value="salary" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Salary</TabsTrigger>
            <TabsTrigger value="statistics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Statistics</TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Attendance</TabsTrigger>
          </TabsList>
          <TabsContent value="teams" className="mt-6">
            <TeamsManagement />
          </TabsContent>
          <TabsContent value="users" className="mt-6">
            <UsersManagement />
          </TabsContent>
          <TabsContent value="shifts" className="mt-6">
            <ShiftsManagement />
          </TabsContent>
          <TabsContent value="salary" className="mt-6">
            <SalaryManagement />
          </TabsContent>
          <TabsContent value="statistics" className="mt-6">
            <SalaryStatistics />
          </TabsContent>
          <TabsContent value="settings" className="mt-6">
            <AttendanceSettings />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Organization;
