import { useEffect, useState } from "react";
import { Step1PersonalInfo } from "../components/Step1PersonalInfo";
import { Step2PersonalStatement } from "../components/Step2PersonalStatement";
import { Step3Resume } from "../components/Step3Resume";
import { Step4Portfolio } from "../components/Step4Portfolio";
import { Step5OtherUploads } from "../components/Step5OtherUploads";
import { Step6Review } from "../components/Step6Review";
import type { ApplicationData } from "../application";
import StepIndicator from "../components/StepIndicator";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { NODE_API } from "../lib/api";

const DRAFT_KEY = "applicationDraft";

const DECISION_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  Accepted:   { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", color: "#166534" },
  Rejected:   { bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.25)",  color: "#991b1b" },
  Waitlisted: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", color: "#92400e" },
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

const BLANK_RESUME_EDUCATION   = () => [{ id: uid(), institution: "", degree: "", startYear: "", endYear: "", gpa: "" }];
const BLANK_RESUME_EXPERIENCE  = () => [{ id: uid(), jobTitle: "", organization: "", startDate: "", endDate: "", responsibilities: "" }];
const BLANK_RESUME_AWARDS      = () => [{ id: uid(), name: "", year: "", description: "" }];
const BLANK_RESUME_COMMUNITY   = () => [{ id: uid(), organization: "", role: "", startDate: "", endDate: "", description: "" }];
const BLANK_RESUME_LEADERSHIP  = () => [{ id: uid(), role: "", organization: "", startDate: "", endDate: "", description: "" }];

function buildDefaultAppData(): ApplicationData {
  return {
    personalInfo: {
      fullName: "",
      dateOfBirth: "",
      country: "",
      chosenMajor: "",
      university: "",
      gpa: "",
      graduationYear: "",
      ieltsScore: "",
    },
    personalStatement: {
      valuesGoals: "",
      whyMajor: "",
      interests: "",
      summary: "",
      uploadedFile: [],
    },
    resume: {
      uploadedFile: [],
      education:   BLANK_RESUME_EDUCATION(),
      experience:  BLANK_RESUME_EXPERIENCE(),
      skills:      [],
      awards:      BLANK_RESUME_AWARDS(),
      community:   BLANK_RESUME_COMMUNITY(),
      leadership:  BLANK_RESUME_LEADERSHIP(),
    },
    portfolio: { links: [], files: [] },
    documents: {
      transcript: [],
      ielts: [],
      cvOptional: [],
      statementOptional: [],
      additional: [],
    },
  };
}

function loadDraft(): ApplicationData {
  const defaults = buildDefaultAppData();
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return defaults;
    const saved = JSON.parse(raw);
    return {
      personalInfo: { ...defaults.personalInfo, ...(saved.personalInfo ?? {}) },
      personalStatement: {
        ...defaults.personalStatement,
        ...(saved.personalStatement ?? {}),
        uploadedFile: [],
      },
      resume: {
        uploadedFile: [],
        education:  saved.resume?.education?.length  ? saved.resume.education  : defaults.resume.education,
        experience: saved.resume?.experience?.length ? saved.resume.experience : defaults.resume.experience,
        skills:     saved.resume?.skills    ?? [],
        awards:     saved.resume?.awards?.length     ? saved.resume.awards     : defaults.resume.awards,
        community:  saved.resume?.community?.length  ? saved.resume.community  : defaults.resume.community,
        leadership: saved.resume?.leadership?.length ? saved.resume.leadership : defaults.resume.leadership,
      },
      portfolio:  defaults.portfolio,
      documents:  defaults.documents,
    };
  } catch {
    return defaults;
  }
}

function persistDraft(data: ApplicationData) {
  try {
    const serializable = {
      personalInfo: data.personalInfo,
      personalStatement: {
        valuesGoals: data.personalStatement.valuesGoals,
        whyMajor:    data.personalStatement.whyMajor,
        interests:   data.personalStatement.interests,
        summary:     data.personalStatement.summary,
      },
      resume: {
        education:  data.resume.education,
        experience: data.resume.experience,
        skills:     data.resume.skills,
        awards:     data.resume.awards,
        community:  data.resume.community,
        leadership: data.resume.leadership,
      },
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(serializable));
    return true;
  } catch {
    return false;
  }
}

export default function ApplicantPortalPage() {
  const [step, setStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [finalDecision, setFinalDecision] = useState<string | null>(null);
  const [decisionNotes, setDecisionNotes] = useState<string | null>(null);
  const [interviewAt, setInterviewAt] = useState<string | null>(null);
  const [interviewMessage, setInterviewMessage] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      try {
        const res = await fetch(`${NODE_API}/applicants/${session.user.id}/application`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data) return;
        if (data.status) {
          setIsSubmitted(true);
        }
        if (data.finalDecision && data.finalDecision !== "Pending") {
          setFinalDecision(data.finalDecision);
          if (data.decisionNotes) setDecisionNotes(data.decisionNotes);
        }
        if (data.interviewAt) {
          setInterviewAt(data.interviewAt);
          if (data.interviewMessage) setInterviewMessage(data.interviewMessage);
        }
      } catch {
        // silently fail
      }
    }
    checkStatus();
  }, []);

  const navigate = useNavigate();

  const handleLogout = async () => {
    localStorage.removeItem("applicationSubmitted");
    localStorage.removeItem(DRAFT_KEY);
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  const [appData, setAppData] = useState<ApplicationData>(loadDraft);

  const handleSaveDraft = () => {
    const ok = persistDraft(appData);
    if (ok) {
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2500);
    }
  };

  return (
    <div className="bg-shell">
      <div className="reviewer-layout">
        <div className="reviewer-body">

          <StepIndicator
            currentStep={isSubmitted ? 6 : step}
            onLogout={handleLogout}
            onNavigateToStep={isSubmitted ? undefined : (s) => { if (s < step) setStep(s); }}
          />

          {/* Draft saved banner */}
          {draftSaved && (
            <div style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              zIndex: 9000,
              padding: "12px 20px",
              background: "#16a34a",
              color: "white",
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 14,
              boxShadow: "0 4px 20px rgba(22,163,74,0.35)",
              animation: "fadeIn 0.2s ease",
            }}>
              Draft saved successfully!
            </div>
          )}

          {/* Main */}
          <main className="reviewer-main" role="main">
            <div className="card" style={{ width: "100%" }}>
              {/* SUBMITTED STATE */}
              {isSubmitted ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <div className="auth-tag" style={{ marginBottom: 10 }}>SUBMITTED</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "var(--navy)" }}>
                      Application received
                    </div>
                    <p style={{ color: "var(--muted)", lineHeight: 1.6, margin: "6px 0 0" }}>
                      Your application is locked and under review. We'll update this page once a decision is made.
                    </p>
                  </div>

                  {interviewAt && !finalDecision && (
                    <div style={{
                      padding: "14px 16px",
                      borderRadius: 10,
                      background: "rgba(37,99,235,0.06)",
                      border: "1.5px solid rgba(37,99,235,0.25)",
                      color: "var(--navy)",
                    }}>
                      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
                        Interview Scheduled
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {new Date(interviewAt).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
                      </div>
                      {interviewMessage && (
                        <div style={{ fontSize: 13, marginTop: 4, color: "#374151", lineHeight: 1.6 }}>{interviewMessage}</div>
                      )}
                    </div>
                  )}

                  {finalDecision ? (
                    <div style={{
                      padding: "14px 16px",
                      borderRadius: 10,
                      background: DECISION_STYLE[finalDecision]?.bg ?? "rgba(0,0,0,0.04)",
                      border: `1.5px solid ${DECISION_STYLE[finalDecision]?.border ?? "#e5e7eb"}`,
                      color: DECISION_STYLE[finalDecision]?.color ?? "var(--navy)",
                    }}>
                      <div style={{ fontWeight: 800, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: decisionNotes ? 6 : 0 }}>
                        Decision: {finalDecision}
                      </div>
                      {decisionNotes && (
                        <div style={{ fontSize: 13, lineHeight: 1.6 }}>{decisionNotes}</div>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      background: "rgba(29,161,242,0.08)",
                      border: "1.5px solid rgba(29,161,242,0.20)",
                      color: "#1DA1F2",
                      fontWeight: 700,
                      fontSize: 13,
                    }}>
                      Under review — check back for updates.
                    </div>
                  )}

                  <div>
                    <button type="button" onClick={handleLogout} className="logout-btn">
                      Log out
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {step === 1 && (
                    <Step1PersonalInfo
                      data={appData.personalInfo}
                      onUpdate={(next) => setAppData((p) => ({ ...p, personalInfo: next }))}
                      onNext={() => setStep(2)}
                      onSaveDraft={handleSaveDraft}
                    />
                  )}

                  {step === 2 && (
                    <Step2PersonalStatement
                      data={appData.personalStatement}
                      onUpdate={(next) => setAppData((p) => ({ ...p, personalStatement: next }))}
                      onBack={() => setStep(1)}
                      onNext={() => setStep(3)}
                      onSaveDraft={handleSaveDraft}
                    />
                  )}

                  {step === 3 && (
                    <Step3Resume
                      data={appData.resume}
                      onUpdate={(next) => setAppData((p) => ({ ...p, resume: next }))}
                      onBack={() => setStep(2)}
                      onNext={() => setStep(4)}
                      onSaveDraft={handleSaveDraft}
                    />
                  )}

                  {step === 4 && (
                    <Step4Portfolio
                      data={appData.portfolio}
                      onUpdate={(next) => setAppData((p) => ({ ...p, portfolio: next }))}
                      onBack={() => setStep(3)}
                      onNext={() => setStep(5)}
                    />
                  )}

                  {step === 5 && (
                    <Step5OtherUploads
                      data={appData.documents}
                      onUpdate={(next) => setAppData((p) => ({ ...p, documents: next }))}
                      onBack={() => setStep(4)}
                      onNext={() => setStep(6)}
                    />
                  )}

                  {step === 6 && (
                    <Step6Review
                      data={appData}
                      onBack={() => setStep(5)}
                      onSubmitted={() => {
                        localStorage.removeItem(DRAFT_KEY);
                        setIsSubmitted(true);
                        setStep(6);
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
