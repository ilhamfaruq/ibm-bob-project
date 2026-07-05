export type ParameterStatus = "normal" | "slightly_high" | "slightly_low" | "high" | "low";
export type ReportStatus = "pending" | "processing" | "completed" | "failed";

export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

export interface LabReport {
  id: number;
  user_id: number;
  file_url: string | null;
  report_date: string | null;
  status: ReportStatus;
  original_filename: string | null;
  created_at: string;
}

export interface LabParameter {
  id: number;
  report_id: number;
  parameter_name: string;
  value: number;
  unit: string | null;
  status: ParameterStatus;
  reference_min: number | null;
  reference_max: number | null;
  explanation: string | null;
}

export interface ClinicalSummary {
  id: number;
  report_id: number;
  summary_text: string | null;
  recommendation_text: string | null;
  abnormal_count: number;
  created_at: string;
}

export interface ReportDetail {
  report: LabReport;
  parameters: LabParameter[];
  clinical_summary: ClinicalSummary | null;
}
