import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { TrendingUp, Users, DollarSign, Calendar } from "lucide-react";
import { format, parseISO, subMonths, startOfMonth } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface SalaryData {
  id: string;
  user_id: string;
  month: string;
  base_salary: number;
  bonus: number;
  deductions: number;
  total_salary: number;
  hours_worked: number;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface MonthlyTrend {
  month: string;
  total: number;
  avgSalary: number;
  totalBonus: number;
}

interface EmployeeComparison {
  name: string;
  salary: number;
  bonus: number;
  total: number;
}

const SalaryStatistics = () => {
  const [loading, setLoading] = useState(true);
  const [salaryData, setSalaryData] = useState<SalaryData[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [employeeComparisons, setEmployeeComparisons] = useState<EmployeeComparison[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("6");

  useEffect(() => {
    fetchSalaryData();
  }, [selectedPeriod]);

  const fetchSalaryData = async () => {
    try {
      setLoading(true);
      const monthsToFetch = parseInt(selectedPeriod);
      const startDate = startOfMonth(subMonths(new Date(), monthsToFetch));

      const { data, error } = await supabase
        .from("salaries")
        .select(`
          id,
          user_id,
          month,
          base_salary,
          bonus,
          deductions,
          total_salary,
          hours_worked,
          profiles!salaries_user_id_fkey (
            first_name,
            last_name
          )
        `)
        .gte("month", format(startDate, "yyyy-MM-dd"))
        .order("month", { ascending: true });

      if (error) throw error;

      setSalaryData(data as any || []);
      processMonthlyTrends(data as any || []);
      processEmployeeComparisons(data as any || []);
    } catch (error) {
      console.error("Error fetching salary data:", error);
    } finally {
      setLoading(false);
    }
  };

  const processMonthlyTrends = (data: SalaryData[]) => {
    const monthlyMap = new Map<string, { total: number; count: number; bonus: number }>();

    data.forEach((record) => {
      const monthKey = format(parseISO(record.month), "MMM yyyy");
      const existing = monthlyMap.get(monthKey) || { total: 0, count: 0, bonus: 0 };
      
      monthlyMap.set(monthKey, {
        total: existing.total + Number(record.total_salary || 0),
        count: existing.count + 1,
        bonus: existing.bonus + Number(record.bonus || 0),
      });
    });

    const trends = Array.from(monthlyMap.entries()).map(([month, stats]) => ({
      month,
      total: Math.round(stats.total),
      avgSalary: Math.round(stats.total / stats.count),
      totalBonus: Math.round(stats.bonus),
    }));

    setMonthlyTrends(trends);
  };

  const processEmployeeComparisons = (data: SalaryData[]) => {
    // Get latest month data for each employee
    const employeeMap = new Map<string, SalaryData>();

    data.forEach((record) => {
      const existing = employeeMap.get(record.user_id);
      if (!existing || parseISO(record.month) > parseISO(existing.month)) {
        employeeMap.set(record.user_id, record);
      }
    });

    const comparisons = Array.from(employeeMap.values())
      .map((record) => ({
        name: `${record.profiles?.first_name} ${record.profiles?.last_name}`,
        salary: Number(record.base_salary || 0),
        bonus: Number(record.bonus || 0),
        total: Number(record.total_salary || 0),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Top 10 employees

    setEmployeeComparisons(comparisons);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const totalPayout = salaryData.reduce((sum, record) => sum + Number(record.total_salary || 0), 0);
  const avgSalary = salaryData.length > 0 ? totalPayout / salaryData.length : 0;
  const totalEmployees = new Set(salaryData.map(r => r.user_id)).size;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-medium hover:shadow-strong transition-smooth">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng Chi Lương</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              {formatCurrency(totalPayout)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedPeriod} tháng gần đây
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-medium hover:shadow-strong transition-smooth">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lương TB/Nhân Viên</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              {formatCurrency(avgSalary)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Trung bình {selectedPeriod} tháng
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-medium hover:shadow-strong transition-smooth">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng Nhân Viên</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              {totalEmployees}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Đang nhận lương
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-4">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 tháng gần đây</SelectItem>
            <SelectItem value="6">6 tháng gần đây</SelectItem>
            <SelectItem value="12">12 tháng gần đây</SelectItem>
            <SelectItem value="24">24 tháng gần đây</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trend" className="w-full">
        <TabsList className="bg-secondary shadow-soft">
          <TabsTrigger value="trend" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Xu Hướng Tăng Trưởng
          </TabsTrigger>
          <TabsTrigger value="comparison" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            So Sánh Nhân Viên
          </TabsTrigger>
          <TabsTrigger value="bonus" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Thưởng & Phụ Cấp
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trend" className="mt-6">
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Xu Hướng Lương Theo Tháng</CardTitle>
              <CardDescription>
                Biểu đồ tổng chi lương và lương trung bình theo từng tháng
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={monthlyTrends}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary-glow))" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(var(--primary-glow))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Tổng Chi Lương"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                  />
                  <Area
                    type="monotone"
                    dataKey="avgSalary"
                    name="Lương Trung Bình"
                    stroke="hsl(var(--primary-glow))"
                    fillOpacity={1}
                    fill="url(#colorAvg)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="mt-6">
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Top 10 Nhân Viên - Lương Cao Nhất</CardTitle>
              <CardDescription>
                So sánh lương cơ bản và tổng lương giữa các nhân viên (tháng gần nhất)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={employeeComparisons}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    interval={0}
                  />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="salary" 
                    name="Lương Cơ Bản" 
                    fill="hsl(var(--primary))" 
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar 
                    dataKey="bonus" 
                    name="Thưởng" 
                    fill="hsl(var(--primary-glow))" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bonus" className="mt-6">
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Tổng Thưởng Theo Tháng</CardTitle>
              <CardDescription>
                Xu hướng chi trả thưởng và phụ cấp theo từng tháng
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalBonus"
                    name="Tổng Thưởng"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ r: 6, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalaryStatistics;
