import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiPut } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface Procedure {
    name: string;
    description: string;
    status: "scheduled" | "in-progress" | "completed";
    scheduledDate: string;
    scheduledTime?: string;
}

interface Appointment {
    type: string;
    clinic: string;
    date: string;
    time: string;
}

interface TreatmentPlan {
    title: string;
    description: string;
    planStartDate: string;
    estimatedDuration: string;
    procedures: Procedure[];
    appointments: Appointment[];
    notes: string;
    status: "active" | "completed" | "cancelled";
}

interface EditTreatmentPlanDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patientId: string;
    initialData?: Partial<TreatmentPlan>;
    onSaveSuccess?: () => void;
}

export function EditTreatmentPlanDialog({
    open,
    onOpenChange,
    patientId,
    initialData,
    onSaveSuccess
}: EditTreatmentPlanDialogProps) {
    const { language } = useLanguage();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState<TreatmentPlan>({
        title: "",
        description: "",
        planStartDate: "",
        estimatedDuration: "",
        procedures: [],
        appointments: [],
        notes: "",
        status: "active"
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title || "",
                description: initialData.description || "",
                planStartDate: initialData.planStartDate || "",
                estimatedDuration: initialData.estimatedDuration || "",
                procedures: initialData.procedures || [],
                appointments: initialData.appointments || [],
                notes: initialData.notes || "",
                status: initialData.status || "active"
            });
        }
    }, [initialData, open]);

    const handleAddProcedure = () => {
        setFormData({
            ...formData,
            procedures: [
                ...formData.procedures,
                { name: "", description: "", status: "scheduled", scheduledDate: "", scheduledTime: "" }
            ]
        });
    };

    const handleRemoveProcedure = (index: number) => {
        setFormData({
            ...formData,
            procedures: formData.procedures.filter((_, i) => i !== index)
        });
    };

    const handleProcedureChange = (index: number, field: keyof Procedure, value: string) => {
        const updated = [...formData.procedures];
        updated[index] = { ...updated[index], [field]: value };
        setFormData({ ...formData, procedures: updated });
    };

    const handleAddAppointment = () => {
        setFormData({
            ...formData,
            appointments: [
                ...formData.appointments,
                { type: "", clinic: "", date: "", time: "" }
            ]
        });
    };

    const handleRemoveAppointment = (index: number) => {
        setFormData({
            ...formData,
            appointments: formData.appointments.filter((_, i) => i !== index)
        });
    };

    const handleAppointmentChange = (index: number, field: keyof Appointment, value: string) => {
        const updated = [...formData.appointments];
        updated[index] = { ...updated[index], [field]: value };
        setFormData({ ...formData, appointments: updated });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await apiPut(`/patients/${patientId}/treatment-plan`, formData);

            if (response.success) {
                toast({
                    title: language === "ar" ? "تم الحفظ بنجاح" : "Saved successfully",
                    description: response.message || (language === "ar" ? "تم حفظ الخطة العلاجية" : "Treatment plan saved"),
                });
                onSaveSuccess?.();
                onOpenChange(false);
            } else {
                throw new Error(response.message);
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: language === "ar" ? "خطأ" : "Error",
                description: error.message || (language === "ar" ? "فشل في حفظ الخطة العلاجية" : "Failed to save treatment plan"),
            });
        } finally {
            setIsSaving(false);
        }
    };

    const t = {
        title: language === "ar" ? "تعديل الخطة العلاجية" : "Edit Treatment Plan",
        overview: language === "ar" ? "نظرة عامة" : "Overview",
        planTitle: language === "ar" ? "عنوان الخطة" : "Plan Title",
        description: language === "ar" ? "الوصف" : "Description",
        startDate: language === "ar" ? "تاريخ البدء" : "Start Date",
        duration: language === "ar" ? "المدة المتوقعة" : "Expected Duration",
        procedures: language === "ar" ? "الإجراءات" : "Procedures",
        procedureName: language === "ar" ? "اسم الإجراء" : "Procedure Name",
        procedureDesc: language === "ar" ? "وصف الإجراء" : "Procedure Description",
        status: language === "ar" ? "الحالة" : "Status",
        scheduledDate: language === "ar" ? "تاريخ الموعد" : "Scheduled Date",
        scheduledTime: language === "ar" ? "وقت الموعد" : "Scheduled Time",
        scheduled: language === "ar" ? "مجدول" : "Scheduled",
        inProgress: language === "ar" ? "قيد التنفيذ" : "In Progress",
        completed: language === "ar" ? "مكتمل" : "Completed",
        addProcedure: language === "ar" ? "+ إضافة إجراء" : "+ Add Procedure",
        appointments: language === "ar" ? "المواعيد" : "Appointments",
        appointmentType: language === "ar" ? "نوع الموعد" : "Appointment Type",
        clinic: language === "ar" ? "العيادة" : "Clinic",
        date: language === "ar" ? "التاريخ" : "Date",
        time: language === "ar" ? "الوقت" : "Time",
        addAppointment: language === "ar" ? "+ إضافة موعد" : "+ Add Appointment",
        notes: language === "ar" ? "ملاحظات الطبيب" : "Doctor's Notes",
        cancel: language === "ar" ? "إلغاء" : "Cancel",
        save: language === "ar" ? "حفظ التغييرات" : "Save Changes",
        saving: language === "ar" ? "جاري الحفظ..." : "Saving..."
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t.title}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Overview Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t.overview}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="title">{t.planTitle}</Label>
                                    <Input
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder={language === "ar" ? "مثل: خطة علاج الأسنان الشاملة" : "e.g., Comprehensive Dental Treatment"}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="startDate">{t.startDate}</Label>
                                    <Input
                                        id="startDate"
                                        type="date"
                                        value={formData.planStartDate}
                                        onChange={(e) => setFormData({ ...formData, planStartDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="duration">{t.duration}</Label>
                                <Input
                                    id="duration"
                                    value={formData.estimatedDuration}
                                    onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                                    placeholder={language === "ar" ? "مثل: 3-6 أشهر" : "e.g., 3-6 months"}
                                />
                            </div>
                            <div>
                                <Label htmlFor="description">{t.description}</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Procedures Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>{t.procedures}</span>
                                <Button size="sm" variant="outline" onClick={handleAddProcedure}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    {t.addProcedure}
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {formData.procedures.map((proc, idx) => (
                                <Card key={idx} className="border-dashed">
                                    <CardContent className="pt-4 space-y-3">
                                        <div className="flex justify-end">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleRemoveProcedure(idx)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <Label>{t.procedureName}</Label>
                                                <Input
                                                    value={proc.name}
                                                    onChange={(e) => handleProcedureChange(idx, "name", e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <Label>{t.status}</Label>
                                                <Select
                                                    value={proc.status}
                                                    onValueChange={(value) => handleProcedureChange(idx, "status", value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="scheduled">{t.scheduled}</SelectItem>
                                                        <SelectItem value="in-progress">{t.inProgress}</SelectItem>
                                                        <SelectItem value="completed">{t.completed}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label>{t.procedureDesc}</Label>
                                                <Input
                                                    value={proc.description}
                                                    onChange={(e) => handleProcedureChange(idx, "description", e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <Label>{t.scheduledDate}</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="date"
                                                        value={proc.scheduledDate}
                                                        onChange={(e) => handleProcedureChange(idx, "scheduledDate", e.target.value)}
                                                    />
                                                    <Input
                                                        type="time"
                                                        value={proc.scheduledTime || ""}
                                                        onChange={(e) => handleProcedureChange(idx, "scheduledTime", e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Appointments Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>{t.appointments}</span>
                                <Button size="sm" variant="outline" onClick={handleAddAppointment}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    {t.addAppointment}
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {formData.appointments.map((apt, idx) => (
                                <Card key={idx} className="border-dashed">
                                    <CardContent className="pt-4 space-y-3">
                                        <div className="flex justify-end">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleRemoveAppointment(idx)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <Label>{t.appointmentType}</Label>
                                                <Input
                                                    value={apt.type}
                                                    onChange={(e) => handleAppointmentChange(idx, "type", e.target.value)}
                                                    placeholder={language === "ar" ? "موعد متابعة" : "Follow-up"}
                                                />
                                            </div>
                                            <div>
                                                <Label>{t.clinic}</Label>
                                                <Input
                                                    value={apt.clinic}
                                                    onChange={(e) => handleAppointmentChange(idx, "clinic", e.target.value)}
                                                    placeholder={language === "ar" ? "العيادة العامة" : "General Clinic"}
                                                />
                                            </div>
                                            <div>
                                                <Label>{t.date}</Label>
                                                <Input
                                                    type="date"
                                                    value={apt.date}
                                                    onChange={(e) => handleAppointmentChange(idx, "date", e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <Label>{t.time}</Label>
                                                <Input
                                                    type="time"
                                                    value={apt.time}
                                                    onChange={(e) => handleAppointmentChange(idx, "time", e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Notes Section */}
                    <div>
                        <Label htmlFor="notes">{t.notes}</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={4}
                            placeholder={language === "ar" ? "أدخل ملاحظات حول الخطة العلاجية..." : "Enter notes about the treatment plan..."}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        {t.cancel}
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {isSaving ? t.saving : t.save}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
