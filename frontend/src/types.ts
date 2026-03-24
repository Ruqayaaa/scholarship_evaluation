export type ApplicantStatus = "Pending" | "In Review" | "Submitted" | "Incomplete" | "Evaluated" | "Accepted" | "Waitlisted" | "Rejected";

export interface PsScores {
  interests_and_values: number;
  academic_commitment: number;
  clarity_of_vision: number;
  organization: number;
  language_quality: number;
  overall_score: number;
  grade_pct?: number;
  strengths: string[];
  improvements: string[];
}

export interface ResumeScores {
  academic_achievement: number;
  leadership_and_extracurriculars: number;
  community_service: number;
  research_and_work_experience: number;
  skills_and_certifications: number;
  awards_and_recognition: number;
  overall_score: number;
  justification?: string;
}

export interface Applicant {
  id: string;
  name: string;
  status: ApplicantStatus;
  scholarship: string;

  // Personal info fields for display
  formFields: { label: string; value: string }[];
  // Full text answers (PS text, leadership, etc.)
  answers: { question: string; answer: string }[];
  documents: { name: string; uploaded: boolean; url: string }[];

  // Summarised AI scores for the bar chart (0–10 scale each)
  aiScore: number;
  aiBreakdown: {
    academic: number;
    leadership: number;
    financial: number;
    statement: number;
    portfolio?: number;
  };
  aiFeedback: string;
  aiSummary: {
    strengths: string[];
    weaknesses: string[];
  };

  // Raw per-criterion scores from the model
  psScores?: PsScores;
  resumeScores?: ResumeScores;

  portfolio?: {
    summary: string;
    items: { title: string; description: string; url: string }[];
  };
}
