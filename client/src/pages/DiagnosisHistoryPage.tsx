import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Calendar, ChevronLeft, ChevronRight, Activity, Sparkles } from "lucide-react";
import { apiGet } from "@/services/api";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useState } from "react";
import { useLocation } from "wouter";

interface DiagnosisRecord {
  id: string;
  createdAt: string;
  conditions: any[];
  recommendations: any[];
  urgency: string;
  confidence: number;
  suggestedClinic: string;
  estimatedTreatmentTime: string;
}

export default function DiagnosisHistoryPage() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const [selectedRecord, setSelectedRecord] = useState<DiagnosisRecord | null>(null);

  const { data: history, isLoading, error } = useQuery<DiagnosisRecord[]>({
    queryKey: ["diagnosisHistory"],
    queryFn: async () => {
      const response = await apiGet<any>("/v1/ai/history");
      console.log("HISTORY RESPONSE DATA:", response.data);
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if (response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      return [];
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const translations = {
    ar: {
      title: "سجل التشخيص الذكي",
      subtitle: "عرض جميع التشخيصات السابقة التي قمت بها",
      noRecords: "لا يوجد سجل تشخيصات حتى الآن.",
      startDiagnosis: "ابدأ تشخيص جديد الآن",
      date: "تاريخ التشخيص",
      urgency: "مستوى الحالة",
      conditions: "الأمراض المكتشفة",
      confidence: "نسبة الثقة",
      viewDetails: "عرض التفاصيل",
      back: "العودة للسجل",
      urgencyLabels: {
        high: "عاجل",
        low: "روتينية",
        medium: "متوسطة"
      },
      loading: "جاري تحميل السجل..."
    },
    en: {
      title: "AI Diagnosis History",
      subtitle: "View all your previous AI diagnoses",
      noRecords: "No diagnosis records found.",
      startDiagnosis: "Start a new diagnosis now",
      date: "Diagnosis Date",
      urgency: "Urgency Level",
      conditions: "Detected Conditions",
      confidence: "Confidence Score",
      viewDetails: "View Details",
      back: "Back to History",
      urgencyLabels: {
        high: "Urgent",
        low: "Routine",
        medium: "Medium"
      },
      loading: "Loading history..."
    }
  };

  const t = translations[language as "ar" | "en"] || translations.ar;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Activity className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg text-muted-foreground">{t.loading}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        <p>حدث خطأ أثناء تحميل السجل.</p>
        <p className="text-sm mt-2 opacity-70" dir="ltr">{error instanceof Error ? error.message : JSON.stringify(error)}</p>
      </div>
    );
  }

  // Details View
  if (selectedRecord) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <Button variant="ghost" onClick={() => setSelectedRecord(null)} className="mb-4">
          {language === "ar" ? <ChevronRight className="w-4 h-4 ml-2" /> : <ChevronLeft className="w-4 h-4 mr-2" />}
          {t.back}
        </Button>
        
        <Card className="border-t-4 border-t-primary shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-primary" />
                  {t.title} - {format(new Date(selectedRecord.createdAt), "dd MMMM yyyy", { locale: language === "ar" ? ar : enUS })}
                </CardTitle>
              </div>
              <Badge variant={selectedRecord.urgency === "high" ? "destructive" : selectedRecord.urgency === "low" ? "secondary" : "default"}>
                {t.urgencyLabels[selectedRecord.urgency as keyof typeof t.urgencyLabels] || t.urgencyLabels.medium}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted p-4 rounded-lg flex items-center gap-4">
              <Activity className="w-8 h-8 text-primary" />
              <div>
                <p className="font-semibold">{t.confidence}</p>
                <p className="text-2xl text-primary">{selectedRecord.confidence}%</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-lg">
                <Brain className="w-5 h-5 text-primary" />
                الحالات المكتشفة
              </h4>
              <div className="grid gap-3">
                {selectedRecord.conditions?.map((condition: any, idx: number) => (
                  <div key={idx} className="bg-muted/50 p-4 rounded-lg border-l-4 border-primary">
                    <p className="font-medium text-lg">{language === "ar" ? condition.nameAr || condition.name : condition.nameEn || condition.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {language === "ar" ? condition.descriptionAr || condition.description : condition.descriptionEn || condition.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {selectedRecord.recommendations?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">التوصيات</h4>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  {selectedRecord.recommendations.map((rec: string, idx: number) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // List View
  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary" />
            {t.title}
          </h1>
          <p className="text-muted-foreground mt-1">{t.subtitle}</p>
        </div>
        <Button onClick={() => setLocation("/ai-diagnosis")} className="bg-gradient-to-r from-primary to-blue-600">
          <Sparkles className="w-4 h-4 mr-2" />
          {t.startDiagnosis}
        </Button>
      </div>

      {!history || history.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-xl text-muted-foreground">{t.noRecords}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {history.map((record) => (
            <Card key={record.id} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setSelectedRecord(record)}>
              <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(record.createdAt), "dd MMMM yyyy, HH:mm", { locale: language === "ar" ? ar : enUS })}
                  </div>
                  <div className="font-medium text-lg">
                    {record.conditions?.length} {t.conditions}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                  <Badge variant={record.urgency === "high" ? "destructive" : record.urgency === "low" ? "secondary" : "default"}>
                    {t.urgencyLabels[record.urgency as keyof typeof t.urgencyLabels] || t.urgencyLabels.medium}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedRecord(record); }}>
                    {t.viewDetails}
                    {language === "ar" ? <ChevronLeft className="w-4 h-4 ml-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
