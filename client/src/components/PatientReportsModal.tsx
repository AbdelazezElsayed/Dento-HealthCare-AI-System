import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Brain, Calendar, AlertCircle, CheckCircle, AlertTriangle, Clock,
    Stethoscope, FileText, Image as ImageIcon, XCircle, Pill, Activity,
    User, Phone, Mail, MapPin, ClipboardList
} from "lucide-react";
import { apiGet, apiPost, apiPut } from "@/services/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { EditTreatmentPlanDialog } from "@/components/EditTreatmentPlanDialog";
import {
    PatientTreatmentPlanError,
    PatientTreatmentPlanLoading,
    PatientTreatmentPlanView,
} from "@/components/PatientTreatmentPlanView";
import { getTreatmentPlanQueryKey } from "@/hooks/usePatientTreatmentPlan";
import { queryClient } from "@/lib/queryClient";

interface PatientReportsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patientUserId: string;
    patientName: string;
}

export default function PatientReportsModal({
    open, onOpenChange, patientUserId, patientName
}: PatientReportsModalProps) {
    const { language } = useLanguage();
    const [diagnosisRecords, setDiagnosisRecords] = useState<any[]>([]);
    const [patientData, setPatientData] = useState<any>(null);
    const [treatmentPlan, setTreatmentPlan] = useState<any>(null);
    const [diagnosisLoading, setDiagnosisLoading] = useState(false);
    const [medicalLoading, setMedicalLoading] = useState(false);
    const [treatmentLoading, setTreatmentLoading] = useState(false);
    const [diagnosisError, setDiagnosisError] = useState<string | null>(null);
    const [medicalError, setMedicalError] = useState<string | null>(null);
    const [treatmentError, setTreatmentError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("medical");

    const { user } = useAuth();
    const [showAddRecord, setShowAddRecord] = useState(false);
    const [showAddMedication, setShowAddMedication] = useState(false);
    const [submittingRecord, setSubmittingRecord] = useState(false);
    const [submittingMedication, setSubmittingMedication] = useState(false);
    const [showEditTreatmentPlan, setShowEditTreatmentPlan] = useState(false);

    const [newRecord, setNewRecord] = useState({ diagnosis: "", treatmentProvided: "", chiefComplaint: "", notes: "" });
    const [editingMedicationId, setEditingMedicationId] = useState<string | null>(null);
    const [newMedication, setNewMedication] = useState({
        name: "",
        dosage: "",
        frequency: "",
        duration: "",
        reason: "",
        instructions: "",
        notes: "",
        startDate: new Date().toISOString().slice(0, 10),
        endDate: "",
        doseTimesText: "",
    });

    const handleAddRecord = async () => {
        if (!newRecord.diagnosis) return;
        try {
            setSubmittingRecord(true);
            const pId = patientData._id || patientData.id;
            const payload = {
                ...newRecord,
                doctorId: user?.id || "unknown_doctor",
                doctorName: user?.fullName || "Doctor",
                date: new Date().toISOString()
            };
            const res = await apiPost(`/patients/${pId}/medical-records`, payload);
            if (res.success || res) {
                setShowAddRecord(false);
                setNewRecord({ diagnosis: "", treatmentProvided: "", chiefComplaint: "", notes: "" });
                fetchMedicalRecords();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSubmittingRecord(false);
        }
    };

    const resetMedicationForm = () => {
        setEditingMedicationId(null);
        setShowAddMedication(false);
        setNewMedication({
            name: "",
            dosage: "",
            frequency: "",
            duration: "",
            reason: "",
            instructions: "",
            notes: "",
            startDate: new Date().toISOString().slice(0, 10),
            endDate: "",
            doseTimesText: "",
        });
    };

    const buildMedicationPayload = () => ({
        name: newMedication.name.trim(),
        dosage: newMedication.dosage.trim(),
        frequency: newMedication.frequency.trim(),
        duration: newMedication.duration.trim(),
        reason: newMedication.reason.trim(),
        instructions: newMedication.instructions.trim(),
        notes: newMedication.notes.trim(),
        startDate: newMedication.startDate,
        endDate: newMedication.endDate || undefined,
        doseTimes: newMedication.doseTimesText
            .split(",")
            .map((time) => time.trim())
            .filter(Boolean)
            .map((time) => ({ time })),
    });

    const handleSaveMedication = async () => {
        if (!newMedication.name || !newMedication.dosage || !newMedication.frequency || !newMedication.doseTimesText) return;
        try {
            setSubmittingMedication(true);
            const pId = patientData._id || patientData.id;
            const payload = buildMedicationPayload();
            const res = editingMedicationId
                ? await apiPut(`/patients/${pId}/medications/${editingMedicationId}`, payload)
                : await apiPost(`/patients/${pId}/medications`, payload);
            if (res.success || res) {
                resetMedicationForm();
                fetchMedicalRecords();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSubmittingMedication(false);
        }
    };

    const handleEditMedication = (med: any) => {
        setEditingMedicationId(med.id || med._id);
        setShowAddMedication(true);
        setNewMedication({
            name: med.name || "",
            dosage: med.dosage || "",
            frequency: med.frequency || "",
            duration: med.duration || "",
            reason: med.reason || "",
            instructions: med.instructions || "",
            notes: med.notes || "",
            startDate: med.startDate ? new Date(med.startDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
            endDate: med.endDate ? new Date(med.endDate).toISOString().slice(0, 10) : "",
            doseTimesText: Array.isArray(med.doseTimes) ? med.doseTimes.map((dose: any) => dose.time).join(", ") : "",
        });
    };

    const handleStopMedication = async (med: any) => {
        const pId = patientData._id || patientData.id;
        const medId = med.id || med._id;
        if (!pId || !medId) return;
        try {
            await apiPut(`/patients/${pId}/medications/${medId}/stop`, {});
            fetchMedicalRecords();
        } catch (e) {
            console.error(e);
        }
    };

    const t = {
        medical: { ar: "السجل المرضي", en: "Medical Records" },
        aiDiagnosis: { ar: "التشخيص الذكي", en: "AI Diagnosis" },
        treatmentPlan: { ar: "الخطة العلاجية", en: "Treatment Plan" },
        loading: { ar: "جاري التحميل...", en: "Loading..." },
        error: { ar: "خطأ", en: "Error" },
        empty: { ar: "لا توجد بيانات", en: "No data available" }
    };

    const getReportErrorMessage = (
        error: unknown,
        fallback: { ar: string; en: string }
    ) => {
        const apiError = error as {
            message?: string;
            status?: number;
            data?: { message?: string; messageEn?: string };
        };

        if (language === "ar" && apiError.data?.message) {
            return apiError.data.message;
        }

        if (language === "en" && apiError.data?.messageEn) {
            return apiError.data.messageEn;
        }

        if (apiError.status === 403) {
            return language === "ar"
                ? "لا تملك صلاحية عرض هذا التقرير. يجب أن يكون لديك علاقة علاجية أو موعد مع هذا المريض."
                : "You are not authorized to view this report. A clinical relationship or appointment with this patient is required.";
        }

        return apiError.message && !apiError.message.includes("status code")
            ? apiError.message
            : fallback[language];
    };

    const renderMedicationForm = () => (
        <div className="p-4 border rounded-lg bg-muted/30 space-y-3 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                    placeholder={language === "ar" ? "اسم الدواء" : "Medication Name"}
                    value={newMedication.name}
                    onChange={e => setNewMedication({ ...newMedication, name: e.target.value })}
                />
                <Input
                    placeholder={language === "ar" ? "الجرعة (مثل: حبة واحدة)" : "Dosage"}
                    value={newMedication.dosage}
                    onChange={e => setNewMedication({ ...newMedication, dosage: e.target.value })}
                />
                <Input
                    placeholder={language === "ar" ? "التكرار (مثل: مرتين يومياً)" : "Frequency"}
                    value={newMedication.frequency}
                    onChange={e => setNewMedication({ ...newMedication, frequency: e.target.value })}
                />
                <Input
                    placeholder={language === "ar" ? "مواعيد الجرعات مثل 08:00, 20:00" : "Dose times, e.g. 08:00, 20:00"}
                    value={newMedication.doseTimesText}
                    onChange={e => setNewMedication({ ...newMedication, doseTimesText: e.target.value })}
                />
                <Input
                    placeholder={language === "ar" ? "مدة العلاج" : "Duration"}
                    value={newMedication.duration}
                    onChange={e => setNewMedication({ ...newMedication, duration: e.target.value })}
                />
                <Input
                    placeholder={language === "ar" ? "سبب الوصف" : "Reason"}
                    value={newMedication.reason}
                    onChange={e => setNewMedication({ ...newMedication, reason: e.target.value })}
                />
                <Input
                    type="date"
                    value={newMedication.startDate}
                    onChange={e => setNewMedication({ ...newMedication, startDate: e.target.value })}
                />
                <Input
                    type="date"
                    value={newMedication.endDate}
                    onChange={e => setNewMedication({ ...newMedication, endDate: e.target.value })}
                />
            </div>
            <Textarea
                placeholder={language === "ar" ? "تعليمات الاستخدام" : "Instructions"}
                value={newMedication.instructions}
                onChange={e => setNewMedication({ ...newMedication, instructions: e.target.value })}
            />
            <Textarea
                placeholder={language === "ar" ? "ملاحظات الطبيب" : "Doctor notes"}
                value={newMedication.notes}
                onChange={e => setNewMedication({ ...newMedication, notes: e.target.value })}
            />
            <div className="flex flex-wrap gap-2">
                <Button
                    disabled={submittingMedication || !newMedication.name || !newMedication.dosage || !newMedication.frequency || !newMedication.doseTimesText}
                    onClick={handleSaveMedication}
                >
                    {submittingMedication
                        ? (language === "ar" ? "جاري الحفظ..." : "Saving...")
                        : editingMedicationId
                            ? (language === "ar" ? "حفظ التعديل" : "Save Changes")
                            : (language === "ar" ? "حفظ الدواء" : "Save Medication")}
                </Button>
                <Button variant="outline" onClick={resetMedicationForm}>
                    {language === "ar" ? "إلغاء" : "Cancel"}
                </Button>
            </div>
        </div>
    );

    useEffect(() => {
        if (open && patientUserId) {
            fetchDiagnosisRecords();
            fetchMedicalRecords();
            fetchTreatmentPlan();
        }
    }, [open, patientUserId]);

    const fetchDiagnosisRecords = async () => {
        try {
            setDiagnosisLoading(true);
            setDiagnosisError(null);
            const response = await apiGet(`/ai/diagnosis/patient/${patientUserId}`);
            if (response.success && response.data) {
                setDiagnosisRecords(response.data);
            }
        } catch (err: unknown) {
            setDiagnosisError(getReportErrorMessage(err, {
                ar: "تعذر تحميل تقارير التشخيص الذكي لهذا المريض.",
                en: "Unable to load AI diagnosis reports for this patient.",
            }));
        } finally {
            setDiagnosisLoading(false);
        }
    };

    const fetchMedicalRecords = async () => {
        try {
            setMedicalLoading(true);
            setMedicalError(null);
            const response = await apiGet(`/patients/user/${patientUserId}`);
            if (response) {
                const pData = response.data || response;
                const pId = pData._id || pData.id;
                
                let records = [];
                let meds = [];
                
                if (pId) {
                    const [recordsRes, medsRes] = await Promise.all([
                        apiGet(`/patients/${pId}/medical-records`),
                        apiGet(`/patients/${pId}/medications`)
                    ]);
                    records = (recordsRes.success ? recordsRes.data : recordsRes) || [];
                    meds = (medsRes.success ? medsRes.data : medsRes) || [];
                }
                
                const enriched = {
                    ...pData,
                    medicalRecords: Array.isArray(records) ? records : [],
                    medications: Array.isArray(meds) ? meds : []
                };
                setPatientData(enriched);
            }
        } catch (err: unknown) {
            setMedicalError(getReportErrorMessage(err, {
                ar: "تعذر تحميل السجل المرضي لهذا المريض.",
                en: "Unable to load this patient's medical record.",
            }));
        } finally {
            setMedicalLoading(false);
        }
    };

    const fetchTreatmentPlan = async () => {
        try {
            setTreatmentLoading(true);
            setTreatmentError(null);
            if (!patientUserId) return;

            const patientResponse = await apiGet(`/patients/user/${patientUserId}`);
            const pData = patientResponse?.data || patientResponse;
            const pId = pData?._id || pData?.id;
            if (pId) {
                const planResponse = await apiGet(`/patients/${pId}/treatment-plan`);
                const planData = planResponse?.data || planResponse;
                if (planData && planData.title) {
                    setTreatmentPlan(planData);
                    return;
                } else {
                    setTreatmentPlan(null);
                }
            } else {
                setTreatmentPlan(null);
            }
        } catch (err: any) {
            if (err?.status === 404) {
                setTreatmentPlan(null);
                return;
            }
            setTreatmentError(language === "ar" ? "تعذر تحميل الخطة العلاجية" : "Unable to load treatment plan");
        } finally {
            setTreatmentLoading(false);
        }
    };

    const selectedPatientId = patientData?._id || patientData?.id || treatmentPlan?.patientId || "";

    const handleTreatmentPlanSaved = async () => {
        if (selectedPatientId) {
            await queryClient.invalidateQueries({ queryKey: getTreatmentPlanQueryKey(selectedPatientId) });
        }
        await fetchTreatmentPlan();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {language === "ar" ? `تقارير المريض: ${patientName}` : `Patient Reports: ${patientName}`}
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="medical">{t.medical[language]}</TabsTrigger>
                        <TabsTrigger value="diagnosis">{t.aiDiagnosis[language]}</TabsTrigger>
                        <TabsTrigger value="treatmentPlan">{t.treatmentPlan[language]}</TabsTrigger>
                    </TabsList>

                    {/* Medical Records Tab */}
                    <TabsContent value="medical" className="mt-6">
                        {medicalLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-40 w-full" />
                                <Skeleton className="h-40 w-full" />
                            </div>
                        ) : medicalError ? (
                            <Card className="border-red-200">
                                <CardContent className="p-6">
                                    <p className="text-red-600">{medicalError}</p>
                                </CardContent>
                            </Card>
                        ) : !patientData ? (
                            <Card>
                                <CardContent className="p-12 text-center">
                                    <p className="text-muted-foreground">{t.empty[language]}</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {/* Patient Info Card */}
                                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-blue-50 dark:from-primary/10 dark:to-blue-900/20">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <User className="h-5 w-5 text-primary" />
                                            {language === "ar" ? "معلومات المريض" : "Patient Information"}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid gap-3">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-semibold">{patientData.fullName}</span>
                                        </div>
                                        {patientData.email && (
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                <span>{patientData.email}</span>
                                            </div>
                                        )}
                                        {patientData.phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-muted-foreground" />
                                                <span>{patientData.phone}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Medical Records */}
                                {patientData.medicalRecords && patientData.medicalRecords.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2 justify-between w-full">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-5 w-5 text-primary" />
                                                    {language === "ar" ? "السجلات الطبية السابقة" : "Previous Medical Records"}
                                                </div>
                                                <Button variant="outline" size="sm" onClick={() => setShowAddRecord(!showAddRecord)}>
                                                    {showAddRecord ? (language === "ar" ? "إلغاء" : "Cancel") : (language === "ar" ? "إضافة سجل" : "Add Record")}
                                                </Button>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {showAddRecord && (
                                                <div className="p-4 border rounded-lg bg-muted/30 space-y-3 mb-4">
                                                    <Input 
                                                        placeholder={language === "ar" ? "التشخيص (مثل: التهاب لثة)" : "Diagnosis"} 
                                                        value={newRecord.diagnosis} 
                                                        onChange={e => setNewRecord({...newRecord, diagnosis: e.target.value})} 
                                                    />
                                                    <Input 
                                                        placeholder={language === "ar" ? "الشكوى الرئيسية" : "Chief Complaint"} 
                                                        value={newRecord.chiefComplaint} 
                                                        onChange={e => setNewRecord({...newRecord, chiefComplaint: e.target.value})} 
                                                    />
                                                    <Textarea 
                                                        placeholder={language === "ar" ? "العلاج المقدم" : "Treatment Provided"} 
                                                        value={newRecord.treatmentProvided} 
                                                        onChange={e => setNewRecord({...newRecord, treatmentProvided: e.target.value})} 
                                                    />
                                                    <Textarea 
                                                        placeholder={language === "ar" ? "ملاحظات / توصيات" : "Notes / Recommendations"} 
                                                        value={newRecord.notes} 
                                                        onChange={e => setNewRecord({...newRecord, notes: e.target.value})} 
                                                    />
                                                    <Button disabled={submittingRecord || !newRecord.diagnosis} onClick={handleAddRecord}>
                                                        {submittingRecord ? (language === "ar" ? "جاري الحفظ..." : "Saving...") : (language === "ar" ? "حفظ السجل" : "Save Record")}
                                                    </Button>
                                                </div>
                                            )}
                                            {patientData.medicalRecords.map((rec: any) => (
                                                <div key={rec._id || rec.id} className={`p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10`}>
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div>
                                                            <p className="font-semibold">{rec.diagnosis || (language === "ar" ? "سجل طبي" : "Medical Record")}</p>
                                                            <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar className="h-3 w-3" />{rec.date ? new Date(rec.date).toISOString().split('T')[0] : ""}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Stethoscope className="h-3 w-3" />{rec.doctorName || "Doctor"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <Badge variant="default" className="text-xs shrink-0">
                                                            {language === "ar" ? "✓ طبيعي" : "✓ Normal"}
                                                        </Badge>
                                                    </div>
                                                    <div className="space-y-2 text-sm pt-2 border-t border-current/10">
                                                        <p>
                                                            <span className="font-semibold text-muted-foreground text-xs">
                                                                {language === "ar" ? "الملاحظات: " : "Findings: "}
                                                            </span>
                                                            {rec.chiefComplaint} {rec.chiefComplaint && rec.treatmentProvided && "-"} {rec.treatmentProvided}
                                                        </p>
                                                        <p className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-xs border border-blue-100 dark:border-blue-800">
                                                            <span className="font-semibold">
                                                                {language === "ar" ? "💡 التوصيات: " : "💡 Recommendations: "}
                                                            </span>
                                                            {rec.notes || rec.nextStep}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}
                                {(!patientData.medicalRecords || patientData.medicalRecords.length === 0) && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2 justify-between w-full">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-5 w-5 text-primary" />
                                                    {language === "ar" ? "السجلات الطبية" : "Medical Records"}
                                                </div>
                                                <Button variant="outline" size="sm" onClick={() => setShowAddRecord(!showAddRecord)}>
                                                    {showAddRecord ? (language === "ar" ? "إلغاء" : "Cancel") : (language === "ar" ? "إضافة سجل" : "Add Record")}
                                                </Button>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {showAddRecord && (
                                                <div className="p-4 border rounded-lg bg-muted/30 space-y-3 mb-4">
                                                    <Input 
                                                        placeholder={language === "ar" ? "التشخيص (مثل: التهاب لثة)" : "Diagnosis"} 
                                                        value={newRecord.diagnosis} 
                                                        onChange={e => setNewRecord({...newRecord, diagnosis: e.target.value})} 
                                                    />
                                                    <Input 
                                                        placeholder={language === "ar" ? "الشكوى الرئيسية" : "Chief Complaint"} 
                                                        value={newRecord.chiefComplaint} 
                                                        onChange={e => setNewRecord({...newRecord, chiefComplaint: e.target.value})} 
                                                    />
                                                    <Textarea 
                                                        placeholder={language === "ar" ? "العلاج المقدم" : "Treatment Provided"} 
                                                        value={newRecord.treatmentProvided} 
                                                        onChange={e => setNewRecord({...newRecord, treatmentProvided: e.target.value})} 
                                                    />
                                                    <Textarea 
                                                        placeholder={language === "ar" ? "ملاحظات / توصيات" : "Notes / Recommendations"} 
                                                        value={newRecord.notes} 
                                                        onChange={e => setNewRecord({...newRecord, notes: e.target.value})} 
                                                    />
                                                    <Button disabled={submittingRecord || !newRecord.diagnosis} onClick={handleAddRecord}>
                                                        {submittingRecord ? (language === "ar" ? "جاري الحفظ..." : "Saving...") : (language === "ar" ? "حفظ السجل" : "Save Record")}
                                                    </Button>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Medications */}
                                {patientData.medications && patientData.medications.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2 justify-between w-full">
                                                <div className="flex items-center gap-2">
                                                    <Pill className="h-5 w-5 text-primary" />
                                                    {language === "ar" ? "الأدوية الموصوفة" : "Prescribed Medications"}
                                                </div>
                                                <Button variant="outline" size="sm" onClick={() => setShowAddMedication(!showAddMedication)}>
                                                    {showAddMedication ? (language === "ar" ? "إلغاء" : "Cancel") : (language === "ar" ? "وصف دواء" : "Prescribe")}
                                                </Button>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            {showAddMedication && renderMedicationForm()}
                                            {patientData.medications.map((med: any) => (
                                                <div key={med._id || med.id} className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg">
                                                    <div>
                                                        <p className="font-semibold text-sm">{med.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {med.dosage} — {med.frequency}
                                                        </p>
                                                        {Array.isArray(med.doseTimes) && med.doseTimes.length > 0 && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {language === "ar" ? "مواعيد الجرعات: " : "Dose times: "}
                                                                {med.doseTimes.map((dose: any) => dose.time).join(", ")}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-muted-foreground">
                                                            {language === "ar" ? "الغرض: " : "Purpose: "}{med.instructions}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button size="sm" variant="outline" onClick={() => handleEditMedication(med)}>
                                                            {language === "ar" ? "تعديل" : "Edit"}
                                                        </Button>
                                                        {(med.status || "active") === "active" && (
                                                            <Button size="sm" variant="destructive" onClick={() => handleStopMedication(med)}>
                                                                {language === "ar" ? "إيقاف" : "Stop"}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}
                                {(!patientData.medications || patientData.medications.length === 0) && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2 justify-between w-full">
                                                <div className="flex items-center gap-2">
                                                    <Pill className="h-5 w-5 text-primary" />
                                                    {language === "ar" ? "الأدوية الموصوفة" : "Prescribed Medications"}
                                                </div>
                                                <Button variant="outline" size="sm" onClick={() => setShowAddMedication(!showAddMedication)}>
                                                    {showAddMedication ? (language === "ar" ? "إلغاء" : "Cancel") : (language === "ar" ? "وصف دواء" : "Prescribe")}
                                                </Button>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {showAddMedication && renderMedicationForm()}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}
                    </TabsContent>

                    {/* AI Diagnosis Tab */}
                    <TabsContent value="diagnosis" className="mt-6">
                        {diagnosisLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-40 w-full" />
                            </div>
                        ) : diagnosisError ? (
                            <Card className="border-red-200">
                                <CardContent className="p-6">
                                    <p className="text-red-600">{diagnosisError}</p>
                                </CardContent>
                            </Card>
                        ) : diagnosisRecords.length === 0 ? (
                            <Card>
                                <CardContent className="p-12 text-center">
                                    <Brain className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                                    <p className="text-muted-foreground">{t.empty[language]}</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-6">
                                {diagnosisRecords.map((record: any) => (
                                    <Card key={record._id} className="border-primary/20">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between flex-wrap gap-2">
                                                <div>
                                                    <CardTitle className="text-lg flex items-center gap-2">
                                                        <Stethoscope className="h-5 w-5 text-primary" />
                                                        {language === "ar" ? "التشخيص الذكي" : "AI Diagnosis"}
                                                    </CardTitle>
                                                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                                        <Calendar className="h-4 w-4" />
                                                        {new Date(record.createdAt).toLocaleDateString(
                                                            language === "ar" ? "ar-EG" : "en-US",
                                                            { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2 items-end">
                                                    <Badge className={
                                                        record.urgency === "high" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" :
                                                            record.urgency === "medium" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100" :
                                                                "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                                    }>
                                                        {record.urgency === "high" ? <AlertCircle className="h-3 w-3 mr-1" /> :
                                                            record.urgency === "medium" ? <AlertTriangle className="h-3 w-3 mr-1" /> :
                                                                <CheckCircle className="h-3 w-3 mr-1" />}
                                                        {record.urgency === "high" ? (language === "ar" ? "عاجل جداً" : "Very Urgent") :
                                                            record.urgency === "medium" ? (language === "ar" ? "متوسط" : "Medium") :
                                                                (language === "ar" ? "عادي" : "Normal")}
                                                    </Badge>
                                                    <Badge variant="outline">
                                                        {language === "ar" ? "مستوى الثقة" : "Confidence"}: {record.confidence}%
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {/* Conditions */}
                                            <div>
                                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                                    <AlertCircle className="h-4 w-4 text-primary" />
                                                    {language === "ar" ? "الحالات المحتملة" : "Possible Conditions"}
                                                </h4>
                                                <div className="space-y-2">
                                                    {record.conditions && record.conditions.map((condition: any, idx: number) => (
                                                        <div key={idx} className="flex items-start justify-between p-3 rounded-lg bg-muted/50">
                                                            <div className="flex-1">
                                                                <div className="font-medium">
                                                                    {language === "ar" ? condition.name : condition.nameEn || condition.name}
                                                                </div>
                                                                {condition.description && (
                                                                    <div className="text-sm text-muted-foreground mt-1">
                                                                        {condition.description}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <Badge className="bg-primary/10 text-primary">
                                                                {condition.probability}%
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Recommendations */}
                                            {record.recommendations && record.recommendations.length > 0 && (
                                                <div>
                                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                                        <CheckCircle className="h-4 w-4 text-primary" />
                                                        {language === "ar" ? "التوصيات" : "Recommendations"}
                                                    </h4>
                                                    <ul className="space-y-1">
                                                        {record.recommendations.map((rec: string, idx: number) => (
                                                            <li key={idx} className="flex items-start gap-2 text-sm">
                                                                <span className="text-primary mt-1">•</span>
                                                                <span>{rec}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Suggested Clinic */}
                                            {record.suggestedClinic && (
                                                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5">
                                                    <Stethoscope className="h-4 w-4 text-primary" />
                                                    <span className="font-medium">{language === "ar" ? "العيادة المقترحة" : "Suggested Clinic"}:</span>
                                                    <span>
                                                        {language === "ar" ?
                                                            record.suggestedClinic.nameAr || record.suggestedClinic.name :
                                                            record.suggestedClinic.nameEn || record.suggestedClinic.name}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Treatment Time */}
                                            {record.estimatedTreatmentTime && (
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Clock className="h-4 w-4" />
                                                    <span>
                                                        {language === "ar" ? "الوقت المقدر للعلاج" : "Estimated Treatment Time"}: {record.estimatedTreatmentTime}
                                                    </span>
                                                </div>
                                            )}

                                            {/* X-Ray */}
                                            {record.xrayFileId && (
                                                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                                                    <ImageIcon className="h-4 w-4 text-primary" />
                                                    <span className="text-sm">
                                                        {language === "ar" ? "صورة أشعة" : "X-Ray Image"}: {record.xrayFilename || "X-ray image"}
                                                    </span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Treatment Plan Tab */}
                    <TabsContent value="treatmentPlan" className="mt-6">
                        {treatmentLoading ? (
                            <PatientTreatmentPlanLoading language={language} />
                        ) : treatmentError ? (
                            <PatientTreatmentPlanError language={language} onRetry={fetchTreatmentPlan} />
                        ) : !treatmentPlan ? (
                            <div className="space-y-4" dir={language === "ar" ? "rtl" : "ltr"}>
                                <Card className="border-dashed shadow-sm">
                                    <CardContent className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
                                        <ClipboardList className="h-14 w-14 text-muted-foreground/50 mb-4" />
                                        <h3 className="text-xl font-bold">
                                            {language === "ar" ? "لا توجد خطة علاجية لهذا المريض حتى الآن" : "No treatment plan for this patient yet"}
                                        </h3>
                                        <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-muted-foreground">
                                            {language === "ar"
                                                ? "ستظهر الخطة العلاجية هنا بعد إنشاء خطة مقترحة من التشخيص الذكي أو بعد إضافتها من الطبيب."
                                                : "The treatment plan will appear here after AI diagnosis creates a proposal or after a doctor adds one."}
                                        </p>
                                        {selectedPatientId && (
                                            <Button className="mt-5" onClick={() => setShowEditTreatmentPlan(true)}>
                                                {language === "ar" ? "إنشاء خطة علاجية" : "Create Treatment Plan"}
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-end">
                                    {selectedPatientId && (
                                        <Button onClick={() => setShowEditTreatmentPlan(true)}>
                                            {language === "ar" ? "مراجعة / تعديل الخطة" : "Review / Edit Plan"}
                                        </Button>
                                    )}
                                </div>
                                <PatientTreatmentPlanView
                                    plan={treatmentPlan}
                                    language={language}
                                    patientName={patientData?.fullName || patientName}
                                />
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
                {selectedPatientId && (
                    <EditTreatmentPlanDialog
                        open={showEditTreatmentPlan}
                        onOpenChange={setShowEditTreatmentPlan}
                        patientId={selectedPatientId}
                        initialData={treatmentPlan || undefined}
                        onSaveSuccess={handleTreatmentPlanSaved}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
