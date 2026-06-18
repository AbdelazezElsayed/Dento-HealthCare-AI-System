import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, FileText, AlertTriangle, Users } from "lucide-react";
import { apiGet } from "@/services/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import PatientReportsModal from "@/components/PatientReportsModal";
import { getClinicBySlug } from "@/constants/clinics";

interface Patient {
  _id: string;
  id?: string;
  fullName: string;
  age?: number;
  dateOfBirth?: string;
  phone: string;
  email?: string;
  status?: "active" | "completed" | "pending";
  lastVisit?: string;
  userId?: string;
  assignedToUserId?: string; // User ID linked to this patient
}

interface PatientListProps {
  clinicName?: string;
  onViewPatient?: (patientId: string) => void;
}

// Helper function to calculate age from date of birth
const calculateAge = (dob: string): number => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export default function PatientList({
  clinicName = getClinicBySlug("oral-diagnosis-periodontology")?.nameAr || "التشخيص وعلاج اللثة",
}: PatientListProps) {
  const { language } = useLanguage();
  const { userType } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diagnosisModalOpen, setDiagnosisModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{ userId: string; name: string } | null>(null);
  const isDoctorScoped = userType === "doctor" || userType === "graduate";

  // Translations
  const t = {
    title: {
      ar: isDoctorScoped ? "مرضاي" : "قائمة المرضى",
      en: isDoctorScoped ? "My Patients" : "Patient List"
    },
    subtitle: {
      ar: isDoctorScoped ? "المرضى الذين لديهم مواعيد أو زيارات مسجلة معك." : "قائمة المرضى المسجلين في النظام.",
      en: isDoctorScoped ? "Patients who have appointments or visits recorded with you." : "Patients registered in the system."
    },
    searchPlaceholder: {
      ar: "البحث عن مريض...",
      en: "Search for patient..."
    },
    headers: {
      id: { ar: "رقم المريض", en: "Patient ID" },
      name: { ar: "الاسم", en: "Name" },
      age: { ar: "العمر", en: "Age" },
      phone: { ar: "رقم الهاتف", en: "Phone Number" },
      lastVisit: { ar: "آخر زيارة", en: "Last Visit" },
      status: { ar: "الحالة", en: "Status" },
      actions: { ar: "الإجراءات", en: "Actions" }
    },
    status: {
      active: { ar: "نشط", en: "Active" },
      pending: { ar: "معلق", en: "Pending" },
      completed: { ar: "مكتمل", en: "Completed" }
    },
    buttons: {
      reports: { ar: "التقارير", en: "Reports" },
      retry: { ar: "إعادة المحاولة", en: "Retry" }
    },
    loading: {
      ar: "جاري تحميل المرضى...",
      en: "Loading patients..."
    },
    error: {
      ar: "حدث خطأ في تحميل قائمة المرضى",
      en: "Error loading patient list"
    },
    empty: {
      ar: isDoctorScoped ? "لا يوجد مرضى مرتبطون بك حتى الآن" : "لا يوجد مرضى",
      en: isDoctorScoped ? "No patients linked to you yet" : "No Patients Found"
    },
    emptyDesc: {
      ar: isDoctorScoped ? "سيظهر هنا المرضى الذين قاموا بحجز مواعيد معك." : "لم يتم العثور على مرضى في النظام",
      en: isDoctorScoped ? "Patients who book appointments with you will appear here." : "No patients found in the system"
    },
    noResults: {
      ar: "لا توجد نتائج للبحث",
      en: "No search results"
    }
  };

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiGet<Patient[]>("/patients");
        if (response.success && response.data) {
          setPatients(response.data);
        } else {
          setError(response.message || "Failed to fetch patients");
        }
      } catch (err: any) {
        console.error("Error fetching patients:", err);
        setError(err.message || "Failed to fetch patients");
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const filteredPatients = patients.filter((patient) =>
    patient.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone?.includes(searchTerm) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status?: Patient["status"]) => {
    const defaultStatus = status || "active";
    const variants = {
      active: {
        label: t.status.active[language],
        className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
      },
      pending: {
        label: t.status.pending[language],
        className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
      },
      completed: {
        label: t.status.completed[language],
        className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
      },
    };
    return variants[defaultStatus];
  };

  // Loading State
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-80" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error State
  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">{t.error[language]}</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={() => window.location.reload()} variant="outline">
              {t.buttons.retry[language]}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle className="text-2xl">
            {t.title[language]} {clinicName && clinicName !== "الكل" && !isDoctorScoped ? `- ${clinicName}` : ""}
          </CardTitle>
          <p className="w-full text-sm text-muted-foreground md:w-auto">
            {t.subtitle[language]}
          </p>
          <div className="relative w-full md:w-80">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.searchPlaceholder[language]}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
              data-testid="input-search-patient"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredPatients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm ? t.noResults[language] : t.empty[language]}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? `${language === "ar" ? "لم يتم العثور على مرضى مطابقين لـ" : "No patients found matching"} "${searchTerm}"`
                : t.emptyDesc[language]
              }
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{t.headers.id[language]}</TableHead>
                  <TableHead className="text-right">{t.headers.name[language]}</TableHead>
                  <TableHead className="text-right">{t.headers.age[language]}</TableHead>
                  <TableHead className="text-right">{t.headers.phone[language]}</TableHead>
                  <TableHead className="text-right">{t.headers.lastVisit[language]}</TableHead>
                  <TableHead className="text-right">{t.headers.status[language]}</TableHead>
                  <TableHead className="text-left">{t.headers.actions[language]}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => {
                  const statusBadge = getStatusBadge(patient.status);
                  const patientId = patient._id || patient.id || "";
                  const age = patient.age || (patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : null);

                  return (
                    <TableRow key={patientId} data-testid={`row-patient-${patientId}`}>
                      <TableCell className="font-medium" data-testid={`text-patient-id-${patientId}`}>
                        #{patientId.slice(-6).toUpperCase()}
                      </TableCell>
                      <TableCell data-testid={`text-patient-name-${patientId}`}>
                        {patient.fullName}
                      </TableCell>
                      <TableCell>{age || "-"}</TableCell>
                      <TableCell dir="ltr" className="text-right">{patient.phone || "-"}</TableCell>
                      <TableCell>
                        {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US") : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-start">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1"
                            onClick={() => {
                              // Open diagnosis reports modal
                              // Use assignedToUserId which links patient record to user who performs diagnosis
                              const userIdForDiagnosis = patient.assignedToUserId || patient.userId || patientId;
                              setSelectedPatient({ userId: userIdForDiagnosis, name: patient.fullName });
                              setDiagnosisModalOpen(true);
                            }}
                            data-testid={`button-reports-${patientId}`}
                          >
                            <FileText className="h-4 w-4" />
                            {t.buttons.reports[language]}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Patient Reports Modal (Medical Records + AI Diagnosis) */}
      {selectedPatient && (
        <PatientReportsModal
          open={diagnosisModalOpen}
          onOpenChange={setDiagnosisModalOpen}
          patientUserId={selectedPatient.userId}
          patientName={selectedPatient.name}
        />
      )}
    </Card>
  );
}
