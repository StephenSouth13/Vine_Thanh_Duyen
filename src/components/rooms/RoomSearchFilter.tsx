import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface RoomSearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  capacityFilter: string;
  onCapacityChange: (capacity: string) => void;
  equipmentFilter: string;
  onEquipmentChange: (equipment: string) => void;
  availableEquipment: string[];
}

const RoomSearchFilter = ({
  searchQuery,
  onSearchChange,
  capacityFilter,
  onCapacityChange,
  equipmentFilter,
  onEquipmentChange,
  availableEquipment,
}: RoomSearchFilterProps) => {
  const hasActiveFilters = searchQuery || capacityFilter !== "all" || equipmentFilter !== "all";

  const handleClearFilters = () => {
    onSearchChange("");
    onCapacityChange("all");
    onEquipmentChange("all");
  };

  return (
    <div className="space-y-4 mb-6 p-4 bg-secondary/30 rounded-lg border border-border">
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search rooms by name or location..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-background"
          />
        </div>

        <div className="min-w-[150px]">
          <Select value={capacityFilter} onValueChange={onCapacityChange}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Filter by capacity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Capacity</SelectItem>
              <SelectItem value="1-5">1-5 people</SelectItem>
              <SelectItem value="6-10">6-10 people</SelectItem>
              <SelectItem value="11-20">11-20 people</SelectItem>
              <SelectItem value="20+">20+ people</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[150px]">
          <Select value={equipmentFilter} onValueChange={onEquipmentChange}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Filter by equipment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Equipment</SelectItem>
              {availableEquipment.map((equipment) => (
                <SelectItem key={equipment} value={equipment}>
                  {equipment}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={handleClearFilters} className="gap-1">
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
};

export default RoomSearchFilter;
