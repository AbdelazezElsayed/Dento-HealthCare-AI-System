import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CreditCard,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Download,
  Eye,
  Smartphone,
  Wallet,
  Zap,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/services/api/client";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Invoice {
  id: string;
  _id?: string;
  patientId: string;
  sessionId?: string;
  amount: number;
  status: "paid" | "pending" | "overdue" | "cancelled";
  paymentMethod?: string;
  paymentDate?: string;
  createdAt?: string;
  // Enriched from join (not always present)
  serviceName?: string;
  doctorName?: string;
}

interface Balance {
  totalDue: number;
  totalPaid: number;
  balance: number;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getStatusBadge(status: string) {
  switch (status) {
    case "paid":    return { variant: "default" as const,      label: "✓ مدفوع",         color: "bg-green-100 dark:bg-green-900/30" };
    case "pending": return { variant: "secondary" as const,    label: "⏳ قيد الانتظار", color: "bg-yellow-100 dark:bg-yellow-900/30" };
    case "overdue": return { variant: "destructive" as const,  label: "✕ متأخر",         color: "bg-red-100 dark:bg-red-900/30" };
    default:        return { variant: "outline" as const,      label: status,             color: "" };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaymentPageNew() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [filterStatus, setFilterStatus] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [payingId, setPayingId] = useState<string | null>(null);

  // Step 1: resolve patient profile from session user
  const { data: patientProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ["my-patient-profile", user?.id],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/patients/user/${user?.id}`);
      return res.data;
    },
    enabled: !!user?.id,
  });
  const patientId = patientProfile?.id || patientProfile?._id;

  // Step 2: FIX (H9) — fetch REAL invoices for this patient
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["patient-invoices", patientId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/payments/patient/${patientId}`);
      // API returns array directly
      return (Array.isArray(res.data) ? res.data : res.data?.data ?? []).map((p: any) => ({
        ...p,
        id: p._id || p.id,
      }));
    },
    enabled: !!patientId,
  });

  // Step 3: FIX (H9) — fetch REAL balance summary
  const { data: balance, isLoading: loadingBalance } = useQuery<Balance>({
    queryKey: ["patient-balance", patientId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/patient/${patientId}/balance`);
      return res.data;
    },
    enabled: !!patientId,
  });

  // Step 4: FIX (H9) — wire Pay Now to PATCH /payments/:id/pay
  const payMutation = useMutation({
    mutationFn: async ({ id, method }: { id: string; method: string }) => {
      const res = await apiClient.patch(`/api/v1/payments/${id}/pay`, { paymentMethod: method });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-invoices", patientId] });
      queryClient.invalidateQueries({ queryKey: ["patient-balance", patientId] });
      setPayingId(null);
      toast({ title: "تم الدفع بنجاح", description: "تم تسجيل دفعتك وتحديث الرصيد." });
    },
    onError: (err: any) => {
      setPayingId(null);
      toast({
        title: "فشل الدفع",
        description: err?.response?.data?.message || "حدث خطأ أثناء معالجة الدفع",
        variant: "destructive",
      });
    },
  });

  const handlePay = (invoiceId: string) => {
    setPayingId(invoiceId);
    payMutation.mutate({ id: invoiceId, method: paymentMethod });
  };

  const filteredInvoices = invoices.filter((inv) =>
    filterStatus === "all" ? true : inv.status === filterStatus
  );

  const isLoading = loadingProfile || loadingInvoices || loadingBalance;

  // Derive totals from real balance API (fall back to local calc if balance not loaded yet)
  const totalDue  = balance?.totalDue  ?? invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = balance?.totalPaid ?? invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const totalPending = balance?.balance ?? invoices.filter(i => i.status === "pending").reduce((s, i) => s + i.amount, 0);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">الفواتير والدفع</h1>
        <p className="text-muted-foreground text-lg">إدارة فواتيرك ودفع الخدمات بسهولة</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الفواتير</p>
                {loadingBalance ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-primary">{totalDue} ج.م</p>
                )}
              </div>
              <DollarSign className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">المدفوع</p>
                {loadingBalance ? (
                  <Loader2 className="h-6 w-6 animate-spin text-green-600 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-green-600">{totalPaid} ج.م</p>
                )}
              </div>
              <CheckCircle className="h-8 w-8 text-green-600/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">المتبقي</p>
                {loadingBalance ? (
                  <Loader2 className="h-6 w-6 animate-spin text-red-600 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-red-600">{totalPending} ج.م</p>
                )}
              </div>
              <AlertCircle className="h-8 w-8 text-red-600/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invoices">الفواتير ({filteredInvoices.length})</TabsTrigger>
          <TabsTrigger value="payment">الدفع</TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="mt-6 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {["all", "paid", "pending", "overdue"].map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(status)}
                data-testid={`button-filter-${status}`}
              >
                {status === "all" ? "جميع الفواتير"
                  : status === "paid" ? "مدفوعة"
                  : status === "pending" ? "قيد الانتظار"
                  : "متأخرة"}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-muted-foreground">
                  {filterStatus === "all" ? "لا توجد فواتير بعد" : "لا توجد فواتير بهذه الحالة"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredInvoices.map((invoice) => {
                const statusInfo = getStatusBadge(invoice.status);
                const isBusy = payingId === invoice.id && payMutation.isPending;
                return (
                  <Card key={invoice.id} data-testid={`card-invoice-${invoice.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold">{invoice.serviceName || "جلسة علاجية"}</h3>
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {invoice.doctorName && `${invoice.doctorName} • `}
                            {invoice.paymentDate || invoice.createdAt?.split("T")[0] || "—"}
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-primary">{invoice.amount} ج.م</p>
                      </div>

                      <div className="flex gap-2 pt-4 border-t">
                        <Button size="sm" variant="outline" className="flex-1" data-testid={`button-view-${invoice.id}`} disabled>
                          <Eye className="h-4 w-4 ml-2" />
                          عرض
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" data-testid={`button-download-${invoice.id}`} disabled>
                          <Download className="h-4 w-4 ml-2" />
                          تحميل PDF
                        </Button>
                        {invoice.status === "pending" && (
                          <Button
                            size="sm"
                            className="flex-1"
                            disabled={isBusy}
                            onClick={() => handlePay(invoice.id)}
                            data-testid={`button-pay-${invoice.id}`}
                          >
                            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "ادفع الآن"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Payment Method Tab */}
        <TabsContent value="payment" className="mt-6 space-y-6">
          {totalPending > 0 ? (
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle>دفع الفواتير المعلقة</CardTitle>
                <CardDescription>المبلغ المتبقي: {totalPending} ج.م</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Payment Method Selector */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold">طريقة الدفع</label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger data-testid="select-payment-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4" />
                          نقداً
                        </div>
                      </SelectItem>
                      <SelectItem value="credit-card">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          بطاقة ائتمان
                        </div>
                      </SelectItem>
                      <SelectItem value="bank">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          تحويل بنكي
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Pending invoices list for bulk action hint */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">الفواتير المعلقة:</p>
                  {invoices
                    .filter((i) => i.status === "pending")
                    .map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="text-sm">{inv.serviceName || "جلسة علاجية"}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{inv.amount} ج.م</span>
                          <Button
                            size="sm"
                            disabled={payingId === inv.id && payMutation.isPending}
                            onClick={() => handlePay(inv.id)}
                            data-testid={`button-pay-tab-${inv.id}`}
                          >
                            {payingId === inv.id && payMutation.isPending
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : "ادفع"}
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Price Summary */}
                <Card className="bg-primary/5 dark:bg-primary/10">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>إجمالي المستحق:</span>
                      <span>{totalDue} ج.م</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>المدفوع:</span>
                      <span>{totalPaid} ج.م</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>المبلغ النهائي المتبقي:</span>
                      <span className="text-primary">{totalPending} ج.م</span>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-400 mb-4" />
                <p className="text-lg font-semibold mb-2">جميع الفواتير مدفوعة!</p>
                <p className="text-muted-foreground">لا توجد فواتير معلقة للدفع</p>
              </CardContent>
            </Card>
          )}

          {/* Payment note */}
          <p className="text-xs text-muted-foreground text-center">
            <Smartphone className="h-3 w-3 inline ml-1" />
            يتم تسجيل الدفع فوراً في النظام — لا حاجة لبوابة دفع إلكترونية في هذه المرحلة
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
