import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import TaskCard from "./TaskCard";
import TaskSearchFilter from "./TaskSearchFilter";
import CreateTaskDialog from "./CreateTaskDialog";
import EditTaskDialog from "./EditTaskDialog";
import CreateColumnDialog from "./CreateColumnDialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline: string | null;
  column_id: string | null;
  assignee_id: string | null;
  creator_id: string;
  created_at: string;
  assignee?: { first_name: string; last_name: string; avatar_url: string | null };
  creator?: { first_name: string; last_name: string; avatar_url: string | null };
}

interface TaskColumn {
  id: string;
  name: string;
  description: string | null;
  color: string;
  position: number;
  is_default: boolean;
  created_by: string;
  created_at: string;
}

const TaskBoard = ({ role }: { role: UserRole }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<TaskColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateColumnOpen, setIsCreateColumnOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [users, setUsers] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .order('first_name');

      if (data) setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchColumns = async (retries = 0) => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('task_columns')
        .select()
        .eq('created_by', user.id)
        .order('position', { ascending: true });

      if (error) throw error;

      // If no columns exist, create default ones
      if (!data || data.length === 0) {
        await createDefaultColumns(user.id);
      } else {
        setColumns(data || []);
      }
    } catch (error: any) {
      let errorMessage = "Unknown error";
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      console.error('Error fetching columns:', errorMessage, error);

      // Retry once if schema cache error
      if ((errorMessage.includes('schema cache') || errorMessage.includes('Could not find')) && retries < 1) {
        console.log('Schema cache not ready, retrying in 3 seconds...');
        setTimeout(() => fetchColumns(retries + 1), 3000);
      } else if (retries === 0) {
        toast({
          title: "Error",
          description: `Failed to load columns: ${errorMessage}`,
          variant: "destructive"
        });
      }
    }
  };

  const createDefaultColumns = async (userId: string, retries = 0) => {
    try {
      const defaultColumns = [
        { name: 'To Do', position: 0, color: '#ef4444' },
        { name: 'In Progress', position: 1, color: '#f59e0b' },
        { name: 'Review', position: 2, color: '#3b82f6' },
        { name: 'Done', position: 3, color: '#10b981' }
      ];

      const { data, error } = await supabase
        .from('task_columns')
        .insert(
          defaultColumns.map(col => ({
            ...col,
            created_by: userId,
            is_default: true
          }))
        )
        .select();

      if (error) throw error;
      setColumns(data || []);
    } catch (error: any) {
      let errorMessage = "Unknown error";
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      console.error('Error creating default columns:', errorMessage, error);

      // If schema cache issue, retry after delay
      if ((errorMessage.includes('schema cache') || errorMessage.includes('Could not find') || errorMessage.includes('400')) && retries < 2) {
        console.log(`Schema cache not ready (attempt ${retries + 1}/3), retrying in 3 seconds...`);
        setTimeout(() => createDefaultColumns(userId, retries + 1), 3000);
      } else if (retries === 0) {
        toast({
          title: "Error",
          description: `Failed to create default columns: ${errorMessage}`,
          variant: "destructive"
        });
      }
    }
  };

  const fetchTasks = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchColumns(), fetchUsers()]);

    const channel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_columns' }, () => {
        fetchColumns();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (columns.length > 0) {
      fetchTasks();
    }
  }, [columns]);

  const handleStatusChange = async (taskId: string, newColumnId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ column_id: newColumnId })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task moved successfully"
      });
    } catch (error: any) {
      let errorMessage = "Unknown error";
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      console.error('Error updating task:', errorMessage, error);
      toast({
        title: "Error",
        description: `Failed to move task: ${errorMessage}`,
        variant: "destructive"
      });
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!confirm("Delete this column? Tasks in this column will be unassigned.")) return;

    try {
      const { error } = await supabase
        .from('task_columns')
        .delete()
        .eq('id', columnId);

      if (error) throw error;
      
      setColumns(columns.filter(col => col.id !== columnId));
      toast({
        title: "Success",
        description: "Column deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting column:', error);
      toast({
        title: "Error",
        description: "Failed to delete column",
        variant: "destructive"
      });
    }
  };

  const getFilteredTasks = (columnId: string) => {
    return tasks.filter(task => {
      const matchesSearch = !searchQuery ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const matchesAssignee = assigneeFilter === "all" ||
        (assigneeFilter === "unassigned" ? !task.assignee_id : task.assignee_id === assigneeFilter);

      const matchesColumn = task.column_id === columnId;

      return matchesSearch && matchesPriority && matchesAssignee && matchesColumn;
    });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-card/50">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TaskSearchFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        assigneeFilter={assigneeFilter}
        onAssigneeChange={setAssigneeFilter}
        users={users}
      />

      <div className="flex justify-end gap-2">
        <Button onClick={() => setIsCreateColumnOpen(true)} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          New Column
        </Button>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column) => {
          const filteredTasks = getFilteredTasks(column.id);
          return (
            <Card key={column.id} className="bg-card/50">
              <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: column.color }}
                  />
                  <CardTitle className="text-sm font-medium">
                    {column.name}
                    <span className="ml-2 text-muted-foreground">
                      ({filteredTasks.length})
                    </span>
                  </CardTitle>
                </div>
                {!column.is_default && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteColumn(column.id)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={handleStatusChange}
                    columns={columns}
                    onTaskClick={(task) => {
                      setSelectedTask(task);
                      setEditDialogOpen(true);
                    }}
                    role={role}
                    onTaskDeleted={fetchTasks}
                  />
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CreateTaskDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onTaskCreated={fetchTasks}
        columns={columns}
      />
      <CreateColumnDialog
        open={isCreateColumnOpen}
        onOpenChange={setIsCreateColumnOpen}
        onColumnCreated={fetchColumns}
      />
      <EditTaskDialog
        task={selectedTask}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onTaskUpdated={fetchTasks}
        columns={columns}
      />
    </div>
  );
};

export default TaskBoard;
