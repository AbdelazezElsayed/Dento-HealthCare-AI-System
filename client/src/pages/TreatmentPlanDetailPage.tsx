import { useLanguage } from "@/contexts/LanguageContext";
import { usePatientTreatmentPlan } from "@/hooks/usePatientTreatmentPlan";
import {
  PatientTreatmentPlanEmpty,
  PatientTreatmentPlanError,
  PatientTreatmentPlanLoading,
  PatientTreatmentPlanView,
} from "@/components/PatientTreatmentPlanView";

interface TreatmentPlanDetailPageProps {
  onBackClick?: () => void;
  patientId?: string;
}

export default function TreatmentPlanDetailPage({ onBackClick, patientId }: TreatmentPlanDetailPageProps) {
  const { language } = useLanguage();
  const { user, patient, plan, isLoading, isError, refetch } = usePatientTreatmentPlan(patientId);

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
        onBackClick={onBackClick}
      />
    );
  }

  const patientName = plan.patientName || patient?.fullName || patient?.name || user?.fullName || user?.username;

  return (
    <PatientTreatmentPlanView
      plan={plan}
      language={language}
      patientName={patientName}
      onBackClick={onBackClick}
    />
  );
}
