import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getUserRole, getCurrentUser } from "@/lib/auth";
import { UserRole } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TaskBoard from "@/components/tasks/TaskBoard";
import TaskList from "@/components/tasks/TaskList";

const Tasks = () => {
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
            Tasks
          </h2>
          <p className="text-muted-foreground mt-2">Manage and track your tasks</p>
        </div>

        <Tabs defaultValue="board" className="w-full">
          <TabsList className="bg-secondary shadow-soft">
            <TabsTrigger value="board" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Board</TabsTrigger>
            <TabsTrigger value="list" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">List</TabsTrigger>
          </TabsList>
          <TabsContent value="board" className="mt-6">
            <TaskBoard role={role} />
          </TabsContent>
          <TabsContent value="list" className="mt-6">
            <TaskList role={role} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Tasks;
