import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Users, Monitor } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CreateRoomDialog from "./CreateRoomDialog";
import RoomSearchFilter from "./RoomSearchFilter";
import { SkeletonCard } from "@/components/ui/skeleton-card";

const RoomList = ({ role }: { role: UserRole }) => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [capacityFilter, setCapacityFilter] = useState("all");
  const [equipmentFilter, setEquipmentFilter] = useState("all");

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_rooms')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAllEquipment = (): string[] => {
    const equipmentSet = new Set<string>();
    rooms.forEach(room => {
      if (room.equipment && Array.isArray(room.equipment)) {
        room.equipment.forEach((item: string) => equipmentSet.add(item));
      }
    });
    return Array.from(equipmentSet).sort();
  };

  const getFilteredRooms = () => {
    return rooms.filter(room => {
      const matchesSearch = !searchQuery ||
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (room.location && room.location.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCapacity = capacityFilter === "all" || (() => {
        switch (capacityFilter) {
          case "1-5":
            return room.capacity >= 1 && room.capacity <= 5;
          case "6-10":
            return room.capacity >= 6 && room.capacity <= 10;
          case "11-20":
            return room.capacity >= 11 && room.capacity <= 20;
          case "20+":
            return room.capacity > 20;
          default:
            return true;
        }
      })();

      const matchesEquipment = equipmentFilter === "all" ||
        (room.equipment && Array.isArray(room.equipment) && room.equipment.includes(equipmentFilter));

      return matchesSearch && matchesCapacity && matchesEquipment;
    });
  };

  const filteredRooms = getFilteredRooms();

  useEffect(() => {
    fetchRooms();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <RoomSearchFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        capacityFilter={capacityFilter}
        onCapacityChange={setCapacityFilter}
        equipmentFilter={equipmentFilter}
        onEquipmentChange={setEquipmentFilter}
        availableEquipment={getAllEquipment()}
      />

      {role === 'admin' && (
        <div className="flex justify-end">
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Room
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRooms.map((room) => (
          <Card key={room.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {room.name}
                <Badge variant="outline">Active</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {room.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {room.location}
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                Capacity: {room.capacity} people
              </div>

              {room.equipment && room.equipment.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Monitor className="h-4 w-4" />
                    Equipment:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {room.equipment.map((item: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {role === 'admin' && (
        <CreateRoomDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onRoomCreated={fetchRooms}
        />
      )}
    </div>
  );
};

export default RoomList;
