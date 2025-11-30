import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AttendanceWidget from "@/components/attendance/AttendanceWidget";
import { getUserRole, getCurrentUser } from "@/lib/auth";
import { UserRole } from "@/lib/auth";

const Attendance = () => {
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

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6 animate-fade-in pb-20 md:pb-6">
        <div className="mb-2">
          <h2 className="text-4xl font-heading font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Attendance
          </h2>
          <p className="text-muted-foreground mt-2">Track your work hours and attendance</p>
        </div>

        <div className="shadow-strong rounded-lg">
          <AttendanceWidget />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Attendance;
