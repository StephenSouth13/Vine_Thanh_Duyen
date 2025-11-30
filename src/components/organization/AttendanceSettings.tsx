import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MapPin } from "lucide-react";

const AttendanceSettings = () => {
  const [officeLocation, setOfficeLocation] = useState({ lat: "", lng: "" });
  const [radius, setRadius] = useState("100");
  const { toast } = useToast();

  useEffect(() => {
    const savedSettings = localStorage.getItem('attendanceSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setOfficeLocation(settings.officeLocation || { lat: "", lng: "" });
      setRadius(settings.radius || "100");
    }
  }, []);

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setOfficeLocation({
            lat: position.coords.latitude.toString(),
            lng: position.coords.longitude.toString()
          });
          toast({
            title: "Location captured",
            description: "Current location set as office location"
          });
        },
        (error) => {
          toast({
            title: "Error",
            description: "Failed to get current location",
            variant: "destructive"
          });
        }
      );
    } else {
      toast({
        title: "Error",
        description: "Geolocation is not supported by this browser",
        variant: "destructive"
      });
    }
  };

  const handleSave = () => {
    const settings = {
      officeLocation,
      radius
    };
    localStorage.setItem('attendanceSettings', JSON.stringify(settings));
    toast({
      title: "Success",
      description: "Attendance settings saved"
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Attendance Location Settings
        </CardTitle>
        <CardDescription>
          Configure office location and check-in radius for attendance validation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                type="number"
                step="any"
                value={officeLocation.lat}
                onChange={(e) => setOfficeLocation({ ...officeLocation, lat: e.target.value })}
                placeholder="e.g., 21.028511"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="lng">Longitude</Label>
              <Input
                id="lng"
                type="number"
                step="any"
                value={officeLocation.lng}
                onChange={(e) => setOfficeLocation({ ...officeLocation, lng: e.target.value })}
                placeholder="e.g., 105.804817"
              />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGetCurrentLocation}
            className="w-full"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Use Current Location
          </Button>

          <div>
            <Label htmlFor="radius">Check-in Radius (meters)</Label>
            <Input
              id="radius"
              type="number"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              placeholder="100"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Employees must be within this radius to check in/out
            </p>
          </div>

          <div className="pt-4">
            <Button onClick={handleSave} className="w-full">
              Save Settings
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceSettings;
