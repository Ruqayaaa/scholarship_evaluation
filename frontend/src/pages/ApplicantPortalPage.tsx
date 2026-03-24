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

const NODE_API = "http://localhost:5000";

const DECISION_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  Accepted:   { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", color: "#166534" },
  Rejected:   { bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.25)",  color: "#991b1b" },
  Waitlisted: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", color: "#92400e" },
};

export default function ApplicantPortalPage() {
  const [step, setStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [finalDecision, setFinalDecision] = useState<string | null>(null);
  const [decisionNotes, setDecisionNotes] = useState<string | null>(null);

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
        // Any application for the current cycle means they've submitted for this cycle
        if (data.status) {
          setIsSubmitted(true);
        }
        if (data.finalDecision && data.finalDecision !== "Pending") {
          setFinalDecision(data.finalDecision);
          if (data.decisionNotes) setDecisionNotes(data.decisionNotes);
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
    localStorage.removeItem("applicationDraft");
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  const [appData, setAppData] = useState<ApplicationData>({
    personalInfo: {
      fullName: "",
      email: "",
      dateOfBirth: "",
      country: "",
      program: "",
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
      education: [],
      experience: [],
      skills: [],
      awards: [],
      community: [],
    },
    portfolio: { links: [], files: [] },
    documents: {
      transcript: [],
      ielts: [],
      cvOptional: [],
      statementOptional: [],
      additional: [],
    },
  });

  return (
    <div className="bg-shell">
      <div className="reviewer-layout">
        <div className="reviewer-body">

          <StepIndicator
            currentStep={isSubmitted ? 6 : step}
            userName="Applicant"
            userEmail="applicant@university.edu"
            onLogout={handleLogout}
          />

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
                    />
                  )}

                  {step === 2 && (
                    <Step2PersonalStatement
                      data={appData.personalStatement}
                      onUpdate={(next) => setAppData((p) => ({ ...p, personalStatement: next }))}
                      onBack={() => setStep(1)}
                      onNext={() => setStep(3)}
                    />
                  )}

                  {step === 3 && (
                    <Step3Resume
                      data={appData.resume}
                      onUpdate={(next) => setAppData((p) => ({ ...p, resume: next }))}
                      onBack={() => setStep(2)}
                      onNext={() => setStep(4)}
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
