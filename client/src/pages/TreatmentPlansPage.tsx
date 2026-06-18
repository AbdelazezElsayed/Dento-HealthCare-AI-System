import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePatientTreatmentPlan } from "@/hooks/usePatientTreatmentPlan";
import {
  PatientTreatmentPlanEmpty,
  PatientTreatmentPlanError,
  PatientTreatmentPlanLoading,
  PatientTreatmentPlanView,
} from "@/components/PatientTreatmentPlanView";

export default function TreatmentPlansPage() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const { user, patient, plan, isLoading, isError, refetch } = usePatientTreatmentPlan();

  if (isLoading) {
    return <PatientTreatmentPlanLoading language={language} />;
  }

  if (isError) {
    return <PatientTreatmentPlanError language={language} onRetry={() => refetch()} />;
  }

  if (!plan) {
    return (
      <PatientTreatmentPlanEmpty
        language={language}
        onPrimaryAction={() => setLocation("/ai-diagnosis")}
      />
    );
  }

  const patientName = plan.patientName || patient?.fullName || patient?.name || user?.fullName || user?.username;

  return (
    <PatientTreatmentPlanView
      plan={plan}
      language={language}
      patientName={patientName}
    />
  );
}
