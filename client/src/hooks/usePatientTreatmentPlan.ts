import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api/client";

export interface PatientProfile {
  id?: string;
  _id?: string;
  fullName?: string;
  name?: string;
}

export interface TreatmentPlanProcedure {
  name?: string;
  title?: string;
  description?: string;
  status?: string;
  scheduledDate?: string;
  completedDate?: string;
  notes?: string;
  clinic?: string;
  department?: string;
  tooth?: string;
  toothNumber?: string;
  condition?: string;
  estimatedDuration?: string;
  estimatedCost?: string | number;
  cost?: string | number;
}

export interface TreatmentPlanAppointment {
  type?: string;
  clinic?: string;
  date?: string;
  time?: string;
}

export interface PatientTreatmentPlan {
  id?: string;
  _id?: string;
  patientId: string;
  doctorId?: string;
  doctorName?: string;
  patientName?: string;
  title?: string;
  description?: string;
  planStartDate?: string;
  estimatedDuration?: string;
  procedures?: TreatmentPlanProcedure[];
  appointments?: TreatmentPlanAppointment[];
  notes?: string;
  status?: string;
  source?: "ai" | "doctor";
  reviewStatus?: "pending_doctor_review" | "approved" | "revision_requested" | "rejected" | "draft";
  isAiDraft?: boolean;
  isFinal?: boolean;
  diagnosisRecordId?: string;
  appointmentId?: string;
  aiDisclaimer?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

function unwrapApiData<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function getHttpStatus(error: unknown) {
  if (error && typeof error === "object" && "response" in error) {
    return (error as { response?: { status?: number } }).response?.status;
  }
  return undefined;
}

export const getTreatmentPlanQueryKey = (patientId?: string) => ["treatment-plan", patientId || "me"];

export function usePatientTreatmentPlan(patientIdOverride?: string) {
  const { user, isLoading: authLoading } = useAuth();

  const patientQuery = useQuery<PatientProfile | null>({
    queryKey: ["my-patient-profile", user?.id],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/patients/user/${user?.id}`);
        return unwrapApiData<PatientProfile>(response.data);
      } catch (error) {
        if (getHttpStatus(error) === 404) return null;
        throw error;
      }
    },
    enabled: !patientIdOverride && !!user?.id,
    retry: false,
  });

  const patient = patientIdOverride ? undefined : patientQuery.data || undefined;
  const patientId = patientIdOverride || patient?.id || patient?._id;

  const treatmentPlanQuery = useQuery<PatientTreatmentPlan | null>({
    queryKey: getTreatmentPlanQueryKey(patientId),
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/patients/${patientId}/treatment-plan`);
        return unwrapApiData<PatientTreatmentPlan>(response.data);
      } catch (error) {
        if (getHttpStatus(error) === 404) return null;
        throw error;
      }
    },
    enabled: !!patientId,
    retry: false,
  });

  return {
    user,
    patient,
    patientId,
    plan: treatmentPlanQuery.data || null,
    isLoading: authLoading || patientQuery.isLoading || treatmentPlanQuery.isLoading,
    isError: patientQuery.isError || treatmentPlanQuery.isError,
    error: patientQuery.error || treatmentPlanQuery.error,
    refetch: async () => {
      if (!patientIdOverride) {
        await patientQuery.refetch();
      }
      await treatmentPlanQuery.refetch();
    },
  };
}
