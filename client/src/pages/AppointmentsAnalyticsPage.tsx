import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, Users, Calendar, CheckCircle } from "lucide-react";

const appointmentData = [
  { month: "سبتمبر", appointments: 45, completed: 42, cancelled: 3 },
  { month: "أكتوبر", appointments: 52, completed: 48, cancelled: 4 },
  { month: "نوفمبر", appointments: 68, completed: 65, cancelled: 3 },
  { month: "ديسمبر", appointments: 75, completed: 70, cancelled: 5 },
];

const statusData = [
  { name: "مكتملة", value: 225, color: "#10b981" },
  { name: "ملغاة", value: 15, color: "#ef4444" },
  { name: "قادمة", value: 60, color: "#3b82f6" },
];

const clinicData = [
  { clinic: "التشخيص واللثة", appointments: 120 },
  { clinic: "العلاج التحفظي", appointments: 95 },
  { clinic: "جراحة الفم", appointments: 75 },
  { clinic: "التركيبات", appointments: 65 },
  { clinic: "تقويم", appointments: 45 },
];

export default function AppointmentsAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">إحصائيات المواعيد</h1>
        <p className="text-muted-foreground">تحليل شامل لأداء المواعيد والحجوزات</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              إجمالي المواعيد
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">300</div>
            <p className="text-xs text-green-600 mt-1">↑ 12% هذا الشهر</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              المكتملة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">225</div>
            <p className="text-xs text-green-600 mt-1">75% نسبة النجاح</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              المرضى
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">185</div>
            <p className="text-xs text-green-600 mt-1">↑ 8% نمو</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              متوسط التقييم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.8</div>
            <p className="text-xs text-yellow-600 mt-1">★ ممتاز</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>اتجاه المواعيد الشهري</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={appointmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="appointments"
                  stroke="#3b82f6"
                  name="إجمالي"
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#10b981"
                  name="مكتملة"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>توزيع حالة المواعيد</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>المواعيد حسب العيادة</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={clinicData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="clinic" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="appointments" fill="#3b82f6" name="المواعيد" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
