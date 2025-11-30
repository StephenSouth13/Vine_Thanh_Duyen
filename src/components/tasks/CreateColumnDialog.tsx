import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "sonner";

interface CreateColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onColumnCreated: () => void;
}

const colors = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

const CreateColumnDialog = ({ open, onOpenChange, onColumnCreated }: CreateColumnDialogProps) => {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Column name is required");
      return;
    }

    setLoading(true);

    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error("User not found");
        return;
      }

      // Get the next position
      const { data: existingColumns, error: fetchError } = await supabase
        .from('task_columns')
        .select('position')
        .eq('created_by', user.id)
        .order('position', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      const nextPosition = (existingColumns?.[0]?.position ?? -1) + 1;

      const { error } = await supabase
        .from('task_columns')
        .insert({
          name: name.trim(),
          color: selectedColor,
          position: nextPosition,
          created_by: user.id,
          is_default: false,
        });

      if (error) throw error;

      toast.success("Column created successfully");
      setName("");
      setSelectedColor(colors[0]);
      onColumnCreated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating column:', error);
      toast.error("Failed to create column");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Column</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="column-name">Column Name *</Label>
            <Input
              id="column-name"
              placeholder="e.g., Backlog, Testing, Deployed"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Color</Label>
            <div className="grid grid-cols-4 gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full transition-transform ${
                    selectedColor === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Column"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateColumnDialog;
