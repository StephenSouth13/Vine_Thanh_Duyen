import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, DollarSign, TrendingUp, Clock, Download, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { SkeletonStatCard } from "@/components/ui/skeleton-card";
import * as XLSX from 'xlsx';

interface Salary {
  id: string;
  user_id: string;
  month: string;
  base_salary: number;
  bonus: number;
  deductions: number;
  total_salary: number;
  hours_worked: number;
  notes: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const SalaryManagement = () => {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    base_salary: "",
    bonus: "0",
    deductions: "0",
    notes: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all salaries
      const { data: salaryData, error: salaryError } = await supabase
        .from('salaries')
        .select('*')
        .order('month', { ascending: false });

      if (salaryError) throw salaryError;

      // Fetch all profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email');

      if (profileError) throw profileError;

      // Fetch attendance data for hours calculation
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('user_id, timestamp, type')
        .order('timestamp', { ascending: false });

      if (attendanceError) throw attendanceError;

      setSalaries(salaryData || []);
      setProfiles(profileData || []);
      setAttendanceData(attendanceData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateHoursWorked = (userId: string, month: string) => {
    const monthStart = new Date(month + '-01');
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

    const userAttendance = attendanceData.filter(a => {
      const date = new Date(a.timestamp);
      return a.user_id === userId && date >= monthStart && date <= monthEnd;
    });

    // Group by date and calculate hours
    const dateGroups: { [key: string]: any[] } = {};
    userAttendance.forEach(record => {
      const date = record.timestamp.split('T')[0];
      if (!dateGroups[date]) dateGroups[date] = [];
      dateGroups[date].push(record);
    });

    let totalHours = 0;
    Object.values(dateGroups).forEach(dayRecords => {
      const checkIn = dayRecords.find(r => r.type === 'check_in');
      const checkOut = dayRecords.find(r => r.type === 'check_out');
      
      if (checkIn && checkOut) {
        const hours = (new Date(checkOut.timestamp).getTime() - new Date(checkIn.timestamp).getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }
    });

    return Math.round(totalHours * 100) / 100;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser || !selectedMonth) {
      toast({
        title: "Error",
        description: "Please select a user and month",
        variant: "destructive"
      });
      return;
    }

    try {
      const hoursWorked = calculateHoursWorked(selectedUser, selectedMonth);

      const { error } = await supabase
        .from('salaries')
        .upsert({
          user_id: selectedUser,
          month: selectedMonth + '-01',
          base_salary: parseFloat(formData.base_salary),
          bonus: parseFloat(formData.bonus),
          deductions: parseFloat(formData.deductions),
          hours_worked: hoursWorked,
          notes: formData.notes || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Salary record saved successfully"
      });

      setIsDialogOpen(false);
      setFormData({ base_salary: "", bonus: "0", deductions: "0", notes: "" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getUserName = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    return profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown';
  };

  const exportToExcel = (type: 'salary' | 'attendance') => {
    if (type === 'salary') {
      // Prepare salary data for export
      const exportData = salaries.map(salary => ({
        'Employee': getUserName(salary.user_id),
        'Email': profiles.find(p => p.id === salary.user_id)?.email || '',
        'Month': format(new Date(salary.month), 'MMM yyyy'),
        'Base Salary': Number(salary.base_salary).toFixed(2),
        'Bonus': Number(salary.bonus).toFixed(2),
        'Deductions': Number(salary.deductions).toFixed(2),
        'Total Salary': Number(salary.total_salary).toFixed(2),
        'Hours Worked': Number(salary.hours_worked).toFixed(2),
        'Notes': salary.notes || '',
        'Created At': format(new Date(salary.created_at), 'yyyy-MM-dd HH:mm')
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Salary Records");
      
      // Auto-size columns
      const maxWidth = exportData.reduce((w, r) => Math.max(w, r.Employee.length), 10);
      ws['!cols'] = [
        { wch: maxWidth },
        { wch: 25 },
        { wch: 12 },
        { wch: 12 },
        { wch: 10 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 30 },
        { wch: 18 }
      ];

      XLSX.writeFile(wb, `Salary_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      
      toast({
        title: "Export Successful",
        description: "Salary data exported to Excel"
      });
    } else {
      // Export attendance data
      exportAttendanceData();
    }
  };

  const exportToCSV = (type: 'salary' | 'attendance') => {
    if (type === 'salary') {
      const exportData = salaries.map(salary => ({
        'Employee': getUserName(salary.user_id),
        'Email': profiles.find(p => p.id === salary.user_id)?.email || '',
        'Month': format(new Date(salary.month), 'MMM yyyy'),
        'Base Salary': Number(salary.base_salary).toFixed(2),
        'Bonus': Number(salary.bonus).toFixed(2),
        'Deductions': Number(salary.deductions).toFixed(2),
        'Total Salary': Number(salary.total_salary).toFixed(2),
        'Hours Worked': Number(salary.hours_worked).toFixed(2),
        'Notes': salary.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Salary_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "Salary data exported to CSV"
      });
    } else {
      exportAttendanceDataCSV();
    }
  };

  const exportAttendanceData = async () => {
    try {
      const { data: allAttendance, error } = await supabase
        .from('attendance')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const exportData = allAttendance?.map(record => ({
        'Employee': getUserName(record.user_id),
        'Email': profiles.find(p => p.id === record.user_id)?.email || '',
        'Type': record.type === 'check_in' ? 'Check In' : 'Check Out',
        'Date': format(new Date(record.timestamp), 'yyyy-MM-dd'),
        'Time': format(new Date(record.timestamp), 'HH:mm:ss'),
        'Location': record.location || 'N/A',
        'Notes': record.notes || ''
      })) || [];

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Attendance Records");
      
      ws['!cols'] = [
        { wch: 20 },
        { wch: 25 },
        { wch: 12 },
        { wch: 12 },
        { wch: 10 },
        { wch: 25 },
        { wch: 30 }
      ];

      XLSX.writeFile(wb, `Attendance_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

      toast({
        title: "Export Successful",
        description: "Attendance data exported to Excel"
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const exportAttendanceDataCSV = async () => {
    try {
      const { data: allAttendance, error } = await supabase
        .from('attendance')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const exportData = allAttendance?.map(record => ({
        'Employee': getUserName(record.user_id),
        'Email': profiles.find(p => p.id === record.user_id)?.email || '',
        'Type': record.type === 'check_in' ? 'Check In' : 'Check Out',
        'Date': format(new Date(record.timestamp), 'yyyy-MM-dd'),
        'Time': format(new Date(record.timestamp), 'HH:mm:ss'),
        'Location': record.location || 'N/A',
        'Notes': record.notes || ''
      })) || [];

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Attendance_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "Attendance data exported to CSV"
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const totalPayout = salaries.reduce((sum, s) => sum + Number(s.total_salary), 0);
  const totalBonus = salaries.reduce((sum, s) => sum + Number(s.bonus), 0);
  const totalHours = salaries.reduce((sum, s) => sum + Number(s.hours_worked), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
        <SkeletonTable rows={8} columns={7} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="shadow-medium overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-primary opacity-10 rounded-full -mr-8 -mt-8" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payout</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalPayout.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card className="shadow-medium overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-success/20 to-success/5 rounded-full -mr-8 -mt-8" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bonus</CardTitle>
            <div className="p-2 bg-success/10 rounded-lg">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalBonus.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Paid out</p>
          </CardContent>
        </Card>

        <Card className="shadow-medium overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-warning/20 to-warning/5 rounded-full -mr-8 -mt-8" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <div className="p-2 bg-warning/10 rounded-lg">
              <Clock className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalHours.toFixed(0)}h</div>
            <p className="text-xs text-muted-foreground mt-1">Tracked</p>
          </CardContent>
        </Card>
      </div>

      {/* Salary Records */}
      <Card className="shadow-strong">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Salary Records</CardTitle>
              <CardDescription>Manage employee salaries and bonuses</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => exportToCSV('salary')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportToExcel('salary')}>
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Salary
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add Salary Record</DialogTitle>
                    <DialogDescription>Create or update salary information for an employee</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Employee</Label>
                      <Select value={selectedUser} onValueChange={setSelectedUser}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles.map(profile => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.first_name} {profile.last_name} - {profile.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Month</Label>
                      <Input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Base Salary ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.base_salary}
                        onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Bonus ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.bonus}
                          onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Deductions ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.deductions}
                          onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Any additional notes..."
                      />
                    </div>

                    <Button type="submit" className="w-full">Save Salary Record</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Base Salary</TableHead>
                  <TableHead>Bonus</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Hours Worked</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No salary records yet
                    </TableCell>
                  </TableRow>
                ) : (
                  salaries.map((salary) => (
                    <TableRow key={salary.id}>
                      <TableCell className="font-medium">{getUserName(salary.user_id)}</TableCell>
                      <TableCell>{format(new Date(salary.month), 'MMM yyyy')}</TableCell>
                      <TableCell>${Number(salary.base_salary).toLocaleString()}</TableCell>
                      <TableCell className="text-success">${Number(salary.bonus).toLocaleString()}</TableCell>
                      <TableCell className="text-destructive">${Number(salary.deductions).toLocaleString()}</TableCell>
                      <TableCell>{Number(salary.hours_worked).toFixed(1)}h</TableCell>
                      <TableCell className="font-bold">${Number(salary.total_salary).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Export Section */}
      <Card className="shadow-strong">
        <CardHeader>
          <CardTitle>Attendance Data Export</CardTitle>
          <CardDescription>Export complete attendance records for all employees</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={() => exportToCSV('attendance')} className="flex-1">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Attendance to CSV
            </Button>
            <Button variant="outline" onClick={() => exportToExcel('attendance')} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Export Attendance to Excel
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Exports up to 1,000 most recent attendance records with employee details, check-in/out times, and locations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalaryManagement;
