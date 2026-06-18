import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Calendar,
  DollarSign,
  Heart,
  TrendingUp,
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
} from "lucide-react";
import { getClinicBySlug } from "@/constants/clinics";

const clinicName = (slug: string, fallback: string) => getClinicBySlug(slug)?.nameAr || fallback;

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("month");

  // My Appointments History
  const appointmentHistory = [
    { date: "2025-06-15", clinic: clinicName("conservative-dentistry", "العلاج التحفظي"), doctor: "د. محمد أحمد", status: "مكتمل", cost: 250 },
    { date: "2025-06-08", clinic: clinicName("oral-diagnosis-periodontology", "التشخيص وعلاج اللثة"), doctor: "د. فاطمة علي", status: "مكتمل", cost: 150 },
    { date: "2025-05-30", clinic: "تنظيف أسنان", doctor: "د. سارة حسن", status: "مكتمل", cost: 200 },
    { date: "2025-05-20", clinic: "الفحص العام", doctor: "د. علي محمود", status: "مكتمل", cost: 100 },
    { date: "2025-05-10", clinic: clinicName("conservative-dentistry", "العلاج التحفظي"), doctor: "د. رشا محمد", status: "ملغى", cost: 0 },
  ];

  // Payment History
  const paymentHistory = [
    { date: "2025-06-15", description: "علاج تجميلي", amount: 500, status: "مدفوع", method: "بطاقة ائتمان" },
    { date: "2025-06-08", description: "أشعة سينية", amount: 150, status: "مدفوع", method: "محفظة رقمية" },
    { date: "2025-05-30", description: "تنظيف عميق", amount: 300, status: "مدفوع", method: "تحويل بنكي" },
    { date: "2025-05-20", description: "فحص عام", amount: 100, status: "مدفوع", method: "بطاقة ائتمان" },
  ];

  // Treatment Plan Progress
  const treatmentProgress = [
    { month: "يناير", visits: 2, completed: 1, pending: 1 },
    { month: "فبراير", visits: 3, completed: 3, pending: 0 },
    { month: "مارس", visits: 2, completed: 1, pending: 1 },
    { month: "أبريل", visits: 4, completed: 3, pending: 1 },
    { month: "مايو", visits: 3, completed: 2, pending: 1 },
    { month: "يونيو", visits: 2, completed: 2, pending: 0 },
  ];

  // Medical Services Usage
  const servicesUsed = [
    { name: "الفحص العام", count: 6, cost: 600 },
    { name: "تنظيف عميق", count: 4, cost: 800 },
    { name: "حشو تجميلي", count: 3, cost: 600 },
    { name: "أشعات سينية", count: 5, cost: 375 },
    { name: "استشارة", count: 8, cost: 400 },
  ];

  // Payment Methods Distribution
  const paymentMethods = [
    { name: "بطاقة ائتمان", value: 45, color: "#3b82f6" },
    { name: "محفظة رقمية", value: 35, color: "#10b981" },
    { name: "تحويل بنكي", value: 20, color: "#f59e0b" },
  ];

  // Statistics
  const stats = [
    {
      title: "عدد الزيارات",
      value: "16",
      change: "+3",
      icon: Calendar,
      color: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "إجمالي المبالغ",
      value: "3,775 ج.م",
      change: "+500 ج.م",
      icon: DollarSign,
      color: "bg-green-50 dark:bg-green-900/20",
    },
    {
      title: "متوسط التقييم",
      value: "4.8⭐",
      change: "+0.1",
      icon: Heart,
      color: "bg-red-50 dark:bg-red-900/20",
    },
    {
      title: "الخطط المكتملة",
      value: "12",
      change: "+2",
      icon: TrendingUp,
      color: "bg-purple-50 dark:bg-purple-900/20",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">تقاريري الطبية</h1>
        <p className="text-muted-foreground text-lg">
          سجلك الطبي الشامل والمواعيد والفواتير
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Button
          variant={dateRange === "week" ? "default" : "outline"}
          onClick={() => setDateRange("week")}
          data-testid="button-range-week"
        >
          أسبوع
        </Button>
        <Button
          variant={dateRange === "month" ? "default" : "outline"}
          onClick={() => setDateRange("month")}
          data-testid="button-range-month"
        >
          شهر
        </Button>
        <Button
          variant={dateRange === "quarter" ? "default" : "outline"}
          onClick={() => setDateRange("quarter")}
          data-testid="button-range-quarter"
        >
          ربع سنة
        </Button>
        <Button
          variant={dateRange === "year" ? "default" : "outline"}
          onClick={() => setDateRange("year")}
          data-testid="button-range-year"
        >
          سنة
        </Button>
        <Button variant="outline" className="gap-2" data-testid="button-download">
          <Download className="h-4 w-4" />
          تحميل
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className={stat.color}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <Icon className="h-6 w-6 text-muted-foreground" />
                  <Badge
                    variant="secondary"
                    className="text-xs text-green-600 dark:text-green-400"
                  >
                    {stat.change}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                <p className="text-3xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="appointments" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="appointments">المواعيد</TabsTrigger>
          <TabsTrigger value="payments">الفواتير</TabsTrigger>
          <TabsTrigger value="treatments">الخطط العلاجية</TabsTrigger>
          <TabsTrigger value="services">الخدمات</TabsTrigger>
        </TabsList>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>سجل المواعيد</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {appointmentHistory.map((appointment, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg hover-elevate"
                    data-testid={`card-appointment-${idx}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{appointment.clinic}</p>
                        <Badge
                          variant={
                            appointment.status === "مكتمل"
                              ? "secondary"
                              : "destructive"
                          }
                          className="text-xs"
                        >
                          {appointment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {appointment.doctor} • {appointment.date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        {appointment.cost} ج.م
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Appointment Statistics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm text-muted-foreground mb-1">المواعيد المكتملة</p>
                <p className="text-2xl font-bold">15</p>
                <p className="text-xs text-green-600 mt-2">94% من المواعيد</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                </div>
                <p className="text-sm text-muted-foreground mb-1">الموعد القادم</p>
                <p className="text-2xl font-bold">2025-07-05</p>
                <p className="text-xs text-yellow-600 mt-2">بعد 9 أيام</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-sm text-muted-foreground mb-1">متوسط الانتظار</p>
                <p className="text-2xl font-bold">18 دقيقة</p>
                <p className="text-xs text-blue-600 mt-2">أقل من المتوسط</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>سجل الفواتير والدفعات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {paymentHistory.map((payment, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg hover-elevate"
                    data-testid={`card-payment-${idx}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <p className="font-semibold">{payment.description}</p>
                        <Badge variant="secondary" className="text-xs">
                          {payment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {payment.method} • {payment.date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {payment.amount} ج.م
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Payment Statistics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">إجمالي المبالغ</p>
                <p className="text-3xl font-bold text-green-600">1,050 ج.م</p>
                <p className="text-xs text-muted-foreground mt-2">هذا الشهر</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">الفواتير المدفوعة</p>
                <p className="text-3xl font-bold">4</p>
                <p className="text-xs text-green-600 mt-2">100% مدفوعة</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">طريقة الدفع المفضلة</p>
                <p className="text-2xl font-bold">بطاقة ائتمان</p>
                <p className="text-xs text-muted-foreground mt-2">45% من المبالغ</p>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>توزيع طرق الدفع</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={paymentMethods}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Treatment Plans Tab */}
        <TabsContent value="treatments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>تطور الخطة العلاجية</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={treatmentProgress}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" fill="#10b981" name="مكتمل" />
                  <Bar dataKey="pending" fill="#f59e0b" name="قيد الانتظار" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Treatment Plans Details */}
          <Card>
            <CardHeader>
              <CardTitle>الخطط العلاجية الحالية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold">تنظيف عميق وحشوات تجميلية</p>
                    <Badge variant="secondary">قيد التنفيذ</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    خطة متكاملة للتنظيف العميق وإصلاح الأسنان التالفة
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: "65%" }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">65% مكتملة</p>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold">تبيض الأسنان</p>
                    <Badge variant="secondary" className="bg-green-100">
                      مكتملة
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    تبيض احترافي مع المتابعة الدورية
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <p className="text-xs text-green-600 mt-2">100% مكتملة</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>أكثر الخدمات استخداماً</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={servicesUsed}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={140} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#3b82f6" name="عدد المرات" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Services Details */}
          <div className="grid gap-4 md:grid-cols-2">
            {servicesUsed.map((service) => (
              <Card
                key={service.name}
                className="hover-elevate"
                data-testid={`card-service-${service.name}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-semibold text-lg">{service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {service.count} مرات
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {service.cost.toLocaleString()} ج.م
                    </Badge>
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground">
                      السعر المتوسط:{" "}
                      <span className="font-bold">
                        {Math.round(service.cost / service.count)} ج.م
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle>ملخص صحتك</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-2">حالة الأسنان</p>
              <p className="text-2xl font-bold">جيدة جداً</p>
              <p className="text-xs text-green-600">تحسن 20% هذا العام</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-2">الالتزام بالمواعيد</p>
              <p className="text-2xl font-bold">94%</p>
              <p className="text-xs text-green-600">ممتاز جداً</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-2">الخطط المكتملة</p>
              <p className="text-2xl font-bold">12/15</p>
              <p className="text-xs text-yellow-600">قريب من الاكتمال</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-2">التقييم الطبي</p>
              <p className="text-2xl font-bold">4.8⭐</p>
              <p className="text-xs text-green-600">ممتاز</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
