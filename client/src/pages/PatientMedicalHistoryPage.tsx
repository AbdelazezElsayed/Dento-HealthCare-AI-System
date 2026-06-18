import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Calendar, User, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { getClinicBySlug } from "@/constants/clinics";

interface MedicalRecord {
  id: string;
  patient: string;
  date: string;
  diagnosis: string;
  treatment: string;
  doctor: string;
  clinic: string;
  status: string;
  notes: string;
}

const clinicName = (slug: string, fallback: string) => getClinicBySlug(slug)?.nameAr || fallback;

export default function PatientMedicalHistoryPage() {
  const [selectedPatient, setSelectedPatient] = useState("patient1");
  const [records] = useState<Record<string, MedicalRecord[]>>({
    patient1: [
      {
        id: "1",
        patient: "محمد أحمد",
        date: "2025-11-20",
        diagnosis: "تسوس في الضرس الأول",
        treatment: "حشو مركب",
        doctor: "د. أحمد محمد",
        clinic: clinicName("conservative-dentistry", "العلاج التحفظي"),
        status: "مكتمل",
        notes: "حشو ناجح بدون مضاعفات",
      },
      {
        id: "2",
        patient: "محمد أحمد",
        date: "2025-11-10",
        diagnosis: "فحص شامل",
        treatment: "تنظيف وفحص",
        doctor: "د. فاطمة علي",
        clinic: clinicName("oral-diagnosis-periodontology", "التشخيص وعلاج اللثة"),
        status: "مكتمل",
        notes: "حالة جيدة بشكل عام",
      },
    ],
    patient2: [
      {
        id: "3",
        patient: "فاطمة علي",
        date: "2025-11-15",
        diagnosis: "التهاب اللثة",
        treatment: "تنظيف عميق وعلاج",
        doctor: "د. محمود سالم",
        clinic: "جراحة الفم",
        status: "قيد المتابعة",
        notes: "يتحسن تدريجياً",
      },
    ],
  });

  const patients = [
    { id: "patient1", name: "محمد أحمد" },
    { id: "patient2", name: "فاطمة علي" },
  ];

  const patientRecords = records[selectedPatient] || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">السجل الطبي للمريض</h1>
        <p className="text-muted-foreground">عرض والوصول إلى السجلات الطبية الكاملة</p>
      </div>

      <div>
        <label className="text-sm font-medium">اختر المريض</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
          {patients.map((patient) => (
            <Button
              key={patient.id}
              variant={selectedPatient === patient.id ? "default" : "outline"}
              onClick={() => setSelectedPatient(patient.id)}
              className="justify-start"
              data-testid={`button-patient-${patient.id}`}
            >
              <User className="h-4 w-4 mr-2" />
              {patient.name}
            </Button>
          ))}
        </div>
      </div>

      {patientRecords.length > 0 && (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  إجمالي السجلات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{patientRecords.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  المكتملة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {patientRecords.filter((r) => r.status === "مكتمل").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  قيد المتابعة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {patientRecords.filter((r) => r.status === "قيد المتابعة").length}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {patientRecords.map((record, idx) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="hover-elevate">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {record.diagnosis}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            العلاج: {record.treatment}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={
                          record.status === "مكتمل"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        }
                      >
                        {record.status}
                      </Badge>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">التاريخ</p>
                        <div className="flex items-center gap-1 font-medium">
                          <Calendar className="h-4 w-4 text-primary" />
                          {record.date}
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">الطبيب</p>
                        <div className="flex items-center gap-1 font-medium">
                          <User className="h-4 w-4 text-primary" />
                          {record.doctor}
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">العيادة</p>
                        <p className="font-medium">{record.clinic}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">الحالة</p>
                        <p className="font-medium">{record.status}</p>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded mb-4 text-sm">
                      <p className="text-blue-800 dark:text-blue-200">
                        📝 ملاحظات: {record.notes}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`button-view-details-${record.id}`}
                      >
                        عرض التفاصيل
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`button-download-record-${record.id}`}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        تحميل
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {patientRecords.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">لا توجد سجلات طبية لهذا المريض</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
