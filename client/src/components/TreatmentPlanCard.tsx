import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, Clock, AlertCircle, ArrowRight } from "lucide-react";

interface TreatmentStep {
  id: string;
  title: string;
  description: string;
  status: "completed" | "in-progress" | "pending";
  date?: string;
}

interface TreatmentPlanCardProps {
  patientName: string;
  planTitle: string;
  steps: TreatmentStep[];
  reviewStatus?: "pending_doctor_review" | "approved" | "revision_requested" | "rejected";
  isAiDraft?: boolean;
  isFinal?: boolean;
  aiDisclaimer?: string;
  onViewDetails?: () => void;
}

export default function TreatmentPlanCard({
  patientName,
  planTitle,
  steps,
  reviewStatus,
  isAiDraft,
  isFinal,
  onViewDetails
}: TreatmentPlanCardProps) {
  const isNeedsReevaluation = reviewStatus === "revision_requested";
  const isApprovedFinal = !isNeedsReevaluation && (!!isFinal || reviewStatus === "approved");
  const isPendingAiDraft = !isNeedsReevaluation && !!isAiDraft && reviewStatus === "pending_doctor_review";

  const planNotice = isNeedsReevaluation
    ? {
        title: "تحتاج الحالة إلى إعادة تقييم",
        message: "طلب الطبيب إعادة تقييم الحالة قبل اعتماد خطة علاجية نهائية.",
        className: "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100",
        badgeClassName: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
      }
    : isApprovedFinal
      ? {
          title: "خطة علاجية معتمدة",
          message: "تمت مراجعة هذه الخطة واعتمادها من الطبيب.",
          className: "border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/30 dark:text-green-100",
          badgeClassName: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
        }
      : isPendingAiDraft
        ? {
            title: "خطة علاجية مقترحة",
            message: "هذه الخطة تم إنشاؤها بمساعدة الذكاء الاصطناعي، وسيتم اعتمادها بعد مراجعة الطبيب.",
            className: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100",
            badgeClassName: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
          }
        : null;

  const getStatusIcon = (status: TreatmentStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "in-progress":
        return <Clock className="h-5 w-5 text-blue-600" />;
      case "pending":
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TreatmentStep["status"]) => {
    const variants = {
      completed: { label: "مكتمل", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
      "in-progress": { label: "قيد التنفيذ", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" },
      pending: { label: "معلق", className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100" },
    };
    return variants[status];
  };

  return (
    <Card data-testid="card-treatment-plan">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">{planTitle}</CardTitle>
            <CardDescription className="text-base">المريض: {patientName}</CardDescription>
            {planNotice && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge className={planNotice.badgeClassName}>
                  {planNotice.title}
                </Badge>
              </div>
            )}
          </div>
          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewDetails}
              className="gap-2"
              data-testid="button-view-treatment-details"
            >
              عرض التفاصيل
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {planNotice && (
          <div className={`rounded-md border p-3 text-sm ${planNotice.className}`}>
            <p className="font-semibold">{planNotice.title}</p>
            <p className="mt-1">{planNotice.message}</p>
          </div>
        )}

        <div className="relative">
          <div className="absolute right-[22px] top-0 h-full w-0.5 bg-border"></div>

          <div className="space-y-6">
            {steps.map((step, index) => {
              const statusBadge = getStatusBadge(step.status);
              return (
                <div key={step.id} className="relative flex gap-4" data-testid={`step-${step.id}`}>
                  <div className="relative z-10 flex-shrink-0">
                    {getStatusIcon(step.status)}
                  </div>

                  <Card className="flex-1 hover-elevate bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <h4 className="font-semibold text-lg">{step.title}</h4>
                        <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                      {step.date && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{step.date}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
