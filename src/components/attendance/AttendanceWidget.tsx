import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Clock, MapPin, Calendar as CalendarIcon, TrendingUp, CheckCircle2, XCircle } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInHours, differenceInMinutes } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";

interface AttendanceRecord {
  id: string;
  type: 'check_in' | 'check_out';
  timestamp: string;
  location: string | null;
  notes: string | null;
}

interface AttendanceStats {
  totalHours: number;
  totalDays: number;
  averageHoursPerDay: number;
  onTimeRate: number;
}

const AttendanceWidget = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [stats, setStats] = useState<AttendanceStats>({
    totalHours: 0,
    totalDays: 0,
    averageHoursPerDay: 0,
    onTimeRate: 100
  });
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    const initUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        setUserId(user.id);
        await loadTodayAttendance(user.id);
        await loadAllAttendance(user.id);
      }
    };
    initUser();
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Setup realtime subscription
    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Attendance change:', payload);
          loadTodayAttendance(userId);
          loadAllAttendance(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadTodayAttendance = async (uid: string) => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', uid)
      .gte('timestamp', `${today}T00:00:00`)
      .lte('timestamp', `${today}T23:59:59`)
      .order('timestamp', { ascending: false });

    if (!error && data) {
      setTodayRecords(data);
    }
  };

  const loadAllAttendance = async (uid: string) => {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', uid)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (!error && data) {
      setAllRecords(data);
      calculateStats(data);
    }
  };

  const calculateStats = (records: AttendanceRecord[]) => {
    // Group by date
    const dateGroups: { [key: string]: AttendanceRecord[] } = {};
    records.forEach(record => {
      const date = record.timestamp.split('T')[0];
      if (!dateGroups[date]) dateGroups[date] = [];
      dateGroups[date].push(record);
    });

    let totalHours = 0;
    let validDays = 0;

    Object.values(dateGroups).forEach(dayRecords => {
      const checkIn = dayRecords.find(r => r.type === 'check_in');
      const checkOut = dayRecords.find(r => r.type === 'check_out');
      
      if (checkIn && checkOut) {
        const hours = differenceInHours(
          new Date(checkOut.timestamp),
          new Date(checkIn.timestamp)
        );
        totalHours += hours;
        validDays++;
      }
    });

    setStats({
      totalHours,
      totalDays: Object.keys(dateGroups).length,
      averageHoursPerDay: validDays > 0 ? totalHours / validDays : 0,
      onTimeRate: 95 // Mock for now
    });
  };

  const handleCheckIn = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const location = await getLocation();
      
      const { error } = await supabase
        .from('attendance')
        .insert({
          user_id: userId,
          type: 'check_in',
          location: location,
          timestamp: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Checked In Successfully",
        description: `Welcome! Checked in at ${format(new Date(), 'HH:mm')}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Check-in Failed",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const location = await getLocation();
      
      const { error } = await supabase
        .from('attendance')
        .insert({
          user_id: userId,
          type: 'check_out',
          location: location,
          timestamp: new Date().toISOString()
        });

      if (error) throw error;

      // Calculate hours worked today
      const checkInRecord = todayRecords.find(r => r.type === 'check_in');
      if (checkInRecord) {
        const hours = differenceInHours(new Date(), new Date(checkInRecord.timestamp));
        const minutes = differenceInMinutes(new Date(), new Date(checkInRecord.timestamp)) % 60;
        
        toast({
          title: "Checked Out Successfully",
          description: `Great work! You worked ${hours}h ${minutes}m today`,
        });
      } else {
        toast({
          title: "Checked Out Successfully",
          description: `See you tomorrow!`,
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Check-out Failed",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getLocation = async (): Promise<string> => {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve(`${position.coords.latitude}, ${position.coords.longitude}`);
          },
          () => {
            resolve("Location unavailable");
          }
        );
      } else {
        resolve("Geolocation not supported");
      }
    });
  };

  const hasCheckedIn = todayRecords.some(r => r.type === 'check_in');
  const hasCheckedOut = todayRecords.some(r => r.type === 'check_out');
  const latestCheckIn = todayRecords.find(r => r.type === 'check_in');

  let workingHoursToday = 0;
  if (latestCheckIn) {
    const endTime = hasCheckedOut 
      ? new Date(todayRecords.find(r => r.type === 'check_out')?.timestamp || new Date())
      : new Date();
    workingHoursToday = differenceInHours(endTime, new Date(latestCheckIn.timestamp));
  }

  return (
    <div className="space-y-6">
      {/* Check-in/Check-out Card */}
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today's Attendance
          </CardTitle>
          <CardDescription>{format(new Date(), 'EEEE, MMMM dd, yyyy')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <div className="flex items-center gap-2 mt-1">
                {hasCheckedIn && !hasCheckedOut && (
                  <Badge className="bg-success">Working</Badge>
                )}
                {hasCheckedIn && hasCheckedOut && (
                  <Badge variant="outline">Completed</Badge>
                )}
                {!hasCheckedIn && (
                  <Badge variant="outline">Not Checked In</Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-muted-foreground">Hours Today</p>
              <p className="text-2xl font-bold">{workingHoursToday}h</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              size="lg"
              onClick={handleCheckIn}
              disabled={isLoading || hasCheckedIn}
              className="h-auto py-6 flex flex-col gap-2"
            >
              <CheckCircle2 className="h-6 w-6" />
              <span>Check In</span>
              {latestCheckIn && (
                <span className="text-xs opacity-80">
                  {format(new Date(latestCheckIn.timestamp), 'HH:mm')}
                </span>
              )}
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              onClick={handleCheckOut}
              disabled={isLoading || !hasCheckedIn || hasCheckedOut}
              className="h-auto py-6 flex flex-col gap-2"
            >
              <XCircle className="h-6 w-6" />
              <span>Check Out</span>
              {todayRecords.find(r => r.type === 'check_out') && (
                <span className="text-xs opacity-80">
                  {format(new Date(todayRecords.find(r => r.type === 'check_out')!.timestamp), 'HH:mm')}
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHours}h</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Work Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDays}</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Hours/Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageHoursPerDay.toFixed(1)}h</div>
            <p className="text-xs text-success mt-1">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              On track
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">On-time Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.onTimeRate}%</div>
            <p className="text-xs text-success mt-1">Excellent</p>
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
          <CardDescription>Your recent check-in and check-out records</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="week">This Week</TabsTrigger>
              <TabsTrigger value="month">This Month</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-2 mt-4">
              {allRecords.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No attendance records yet</p>
              ) : (
                allRecords.slice(0, 10).map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        record.type === 'check_in' ? 'bg-success/10' : 'bg-muted'
                      }`}>
                        {record.type === 'check_in' ? (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium capitalize">{record.type.replace('_', ' ')}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(record.timestamp), 'MMM dd, yyyy · HH:mm')}
                        </p>
                      </div>
                    </div>
                    {record.location && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="hidden sm:inline">Location tracked</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="week" className="space-y-2 mt-4">
              {allRecords
                .filter(r => {
                  const recordDate = new Date(r.timestamp);
                  return recordDate >= startOfWeek(new Date()) && recordDate <= endOfWeek(new Date());
                })
                .map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        record.type === 'check_in' ? 'bg-success/10' : 'bg-muted'
                      }`}>
                        {record.type === 'check_in' ? (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium capitalize">{record.type.replace('_', ' ')}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(record.timestamp), 'MMM dd, yyyy · HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </TabsContent>

            <TabsContent value="month" className="space-y-2 mt-4">
              {allRecords
                .filter(r => {
                  const recordDate = new Date(r.timestamp);
                  return recordDate >= startOfMonth(new Date()) && recordDate <= endOfMonth(new Date());
                })
                .map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        record.type === 'check_in' ? 'bg-success/10' : 'bg-muted'
                      }`}>
                        {record.type === 'check_in' ? (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium capitalize">{record.type.replace('_', ' ')}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(record.timestamp), 'MMM dd, yyyy · HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </TabsContent>

            <TabsContent value="calendar" className="mt-4">
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border pointer-events-auto"
                  modifiers={{
                    attended: allRecords.map(r => new Date(r.timestamp.split('T')[0]))
                  }}
                  modifiersStyles={{
                    attended: { fontWeight: 'bold', color: 'hsl(var(--success))' }
                  }}
                />
              </div>
              
              {selectedDate && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-semibold">
                    {format(selectedDate, 'MMMM dd, yyyy')}
                  </h4>
                  {allRecords
                    .filter(r => r.timestamp.split('T')[0] === format(selectedDate, 'yyyy-MM-dd'))
                    .map((record) => (
                      <div key={record.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          record.type === 'check_in' ? 'bg-success/10' : 'bg-muted'
                        }`}>
                          {record.type === 'check_in' ? (
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          ) : (
                            <XCircle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium capitalize">{record.type.replace('_', ' ')}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(record.timestamp), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  {allRecords.filter(r => r.timestamp.split('T')[0] === format(selectedDate, 'yyyy-MM-dd')).length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No records for this date</p>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceWidget;
