import { useEffect, useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { adminFetch } from "../lib/api";

type Props = {
  applicantId: string;
  onBack: () => void;
};

type Reviewer = { id: string; name: string; email: string };

type ReviewerEvaluation = {
  id: string;
  reviewer_id: string;
  recommendation: string;
  notes: string;
  scores: Record<string, number>;
  status: string;
  updated_at: string;
};

type HistoryEntry = {
  id: string;
  cycle: { id: string; name: string; status: string } | null;
  submittedAt: string;
  status: string;
  finalDecision: string;
  decisionNotes: string;
  reviewerRecommendation: string | null;
  reviewerStatus: string | null;
};

type BackendApplicant = {
  id: string;
  applicantId: string;
  name: string;
  submittedAt: string;
  status: string;
  finalDecision: string;
  decisionNotes: string;
  decisionAt: string | null;
  interviewAt: string | null;
  interviewMessage: string;
  assignedReviewerIds: string[];
  reviewerEvaluations: ReviewerEvaluation[];
  personalStatement: {
    input: Record<string, string>;
    score: Record<string, number | string[]>;
  } | null;
  resume: {
    input: Record<string, string>;
    score: Record<string, number | string>;
  } | null;
};

const PS_CRITERIA = [
  { key: "interests_and_values", label: "Interests & Values", max: 20 },
  { key: "academic_commitment",  label: "Academic Commitment", max: 20 },
  { key: "clarity_of_vision",    label: "Clarity of Vision", max: 20 },
  { key: "organization",         label: "Organization", max: 20 },
  { key: "language_quality",     label: "Language Quality", max: 20 },
];

const RESUME_CRITERIA = [
  { key: "academic_achievement",           label: "Academic Achievement", max: 30 },
  { key: "leadership_and_extracurriculars", label: "Leadership & Extracurriculars", max: 30 },
  { key: "community_service",              label: "Community Service", max: 30 },
  { key: "research_and_work_experience",   label: "Research & Work Experience", max: 30 },
  { key: "skills_and_certifications",      label: "Skills & Certifications", max: 30 },
  { key: "awards_and_recognition",         label: "Awards & Recognition", max: 30 },
];

const DECISION_COLORS: Record<string, { bg: string; color: string }> = {
  Accepted:   { bg: "#dcfce7", color: "#166534" },
  Rejected:   { bg: "#fee2e2", color: "#991b1b" },
  Waitlisted: { bg: "#fef3c7", color: "#92400e" },
  Pending:    { bg: "#f1f5f9", color: "#475569" },
};

type StepKey = "application" | "scores" | "reviewer" | "decision" | "history";
const STEP_KEYS: StepKey[] = ["scores", "application", "reviewer", "decision", "history"];

export function ApplicantDetail({ applicantId, onBack }: Props) {
  const [applicant, setApplicant] = useState<BackendApplicant | null>(null);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [selectedReviewerId, setSelectedReviewerId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<StepKey>("scores");
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const [decision, setDecision] = useState("Pending");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [savingDecision, setSavingDecision] = useState(false);
  const [decisionMsg, setDecisionMsg] = useState<string | null>(null);

  const [interviewDate, setInterviewDate] = useState("");
  const [interviewMsg, setInterviewMsg] = useState("");
  const [schedulingInterview, setSchedulingInterview] = useState(false);
  const [scheduleResult, setScheduleResult] = useState<string | null>(null);
  const [rejectingQuick, setRejectingQuick] = useState(false);

  function loadApplicant() {
    return adminFetch(`/admin/applicants/${applicantId}`)
      .then((r) => r.json())
      .then((data: BackendApplicant) => {
        setApplicant(data);
        setDecision(data.finalDecision || "Pending");
        setDecisionNotes(data.decisionNotes || "");
        if (data.interviewAt) {
          // Convert ISO to datetime-local format (YYYY-MM-DDTHH:MM)
          setInterviewDate(data.interviewAt.slice(0, 16));
          setInterviewMsg(data.interviewMessage || "");
        }
        if (data?.applicantId) {
          adminFetch(`/admin/history/${data.applicantId}`)
            .then((r) => r.json())
            .then((h) => { if (Array.isArray(h)) setHistory(h); })
            .catch(() => {});
        }
      });
  }

  useEffect(() => {
    Promise.all([
      loadApplicant(),
      adminFetch("/reviewers").then((r) => r.json()).then(setReviewers),
    ]).finally(() => setLoading(false));
  }, [applicantId]);

  async function assignReviewer() {
    if (!selectedReviewerId) return;
    setAssigning(true);
    setAssignError(null);
    try {
      const res = await adminFetch(`/admin/applicants/${applicantId}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ reviewerId: selectedReviewerId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error ${res.status}`);
      }
      await loadApplicant();
      setSelectedReviewerId("");
    } catch (err: unknown) {
      setAssignError(err instanceof Error ? err.message : "Failed to assign reviewer.");
    } finally {
      setAssigning(false);
    }
  }

  async function removeReviewer(reviewerId: string) {
    await adminFetch(`/admin/applicants/${applicantId}/unassign`, {
      method: "PATCH",
      body: JSON.stringify({ reviewerId }),
    });
    await loadApplicant();
  }

  async function scheduleInterview() {
    setSchedulingInterview(true);
    setScheduleResult(null);
    try {
      const res = await adminFetch(`/admin/applicants/${applicantId}/interview`, {
        method: "PATCH",
        body: JSON.stringify({ interviewAt: interviewDate ? new Date(interviewDate).toISOString() : null, message: interviewMsg }),
      });
      if (!res.ok) throw new Error();
      setScheduleResult("Interview scheduled successfully.");
      await loadApplicant();
    } catch {
      setScheduleResult("Failed to schedule interview. Please try again.");
    } finally {
      setSchedulingInterview(false);
    }
  }

  async function quickReject() {
    if (!confirm(`Reject ${applicant?.name}? This will lock the decision.`)) return;
    setRejectingQuick(true);
    try {
      const res = await adminFetch(`/admin/applicants/${applicantId}/decision`, {
        method: "PATCH",
        body: JSON.stringify({ decision: "Rejected", notes: "" }),
      });
      if (!res.ok) throw new Error("Failed");
      await loadApplicant();
    } catch {
      // silently fail — loadApplicant will update state anyway
    } finally {
      setRejectingQuick(false);
    }
  }

  async function saveDecision() {
    setSavingDecision(true);
    setDecisionMsg(null);
    try {
      const res = await adminFetch(`/admin/applicants/${applicantId}/decision`, {
        method: "PATCH",
        body: JSON.stringify({ decision, notes: decisionNotes }),
      });
      if (!res.ok) throw new Error("Save failed");
      setDecisionMsg("Decision saved.");
      await loadApplicant();
    } catch {
      setDecisionMsg("Failed to save decision.");
    } finally {
      setSavingDecision(false);
    }
  }

  if (loading) return <div className="admin-page"><p className="admin-empty">Loading…</p></div>;
  if (!applicant) return <div className="admin-page"><p className="admin-empty">Applicant not found.</p></div>;

  const ps = applicant.personalStatement;
  const re = applicant.resume;
  const isDecisionLocked = applicant.finalDecision !== "Pending";

  const assignedReviewers = reviewers.filter((r) => applicant.assignedReviewerIds.includes(r.id));
  const unassignedReviewers = reviewers.filter((r) => !applicant.assignedReviewerIds.includes(r.id));

  // Step completion status for the indicator
  const stepStatus: Record<StepKey, "complete" | "active" | "pending"> = {
    application: assignedReviewers.length > 0 ? "complete" : activeStep === "application" ? "active" : "pending",
    scores:      (ps || re) ? "complete" : activeStep === "scores" ? "active" : "pending",
    reviewer:    applicant.reviewerEvaluations.some((e) => e.status === "submitted") ? "complete" : activeStep === "reviewer" ? "active" : "pending",
    decision:    isDecisionLocked ? "complete" : activeStep === "decision" ? "active" : "pending",
    history:     activeStep === "history" ? "active" : "pending",
  };
  // Override — always mark active step as active
  stepStatus[activeStep] = "active";

  const stepLabels: Record<StepKey, string> = {
    scores:      "AI Scores",
    application: "Assignment",
    reviewer:    "Reviewer",
    decision:    "Decision",
    history:     "History",
  };

  const currentIdx = STEP_KEYS.indexOf(activeStep);
  const ds = DECISION_COLORS[applicant.finalDecision] ?? DECISION_COLORS.Pending;

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="detail-head">
        <div className="detail-title-wrap">
          <button type="button" className="detail-back" onClick={onBack}>
            ← Applicants
          </button>
          <h1 className="detail-title" style={{ color: "var(--navy)" }}>{applicant.name}</h1>
          <p className="detail-sub">Submitted: {new Date(applicant.submittedAt).toLocaleString()}</p>
        </div>
        <div className="detail-actions" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Badge variant="outline" className={applicant.status === "Under Review" ? "admin-badge admin-badge--info" : "admin-badge admin-badge--muted"}>
            {applicant.status}
          </Badge>
          {isDecisionLocked && (
            <span style={{ background: ds.bg, color: ds.color, fontWeight: 700, fontSize: 13, padding: "4px 12px", borderRadius: 20 }}>
              {applicant.finalDecision}
            </span>
          )}
          {history.length > 1 && (
            <span style={{ background: "#fef3c7", color: "#92400e", fontWeight: 700, fontSize: 12, padding: "3px 10px", borderRadius: 20 }}>
              Returning applicant
            </span>
          )}
        </div>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 28, overflowX: "auto", paddingBottom: 4 }}>
        {STEP_KEYS.map((key, idx) => {
          const status = stepStatus[key];
          const isActive = key === activeStep;
          const isComplete = status === "complete" && !isActive;
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setActiveStep(key)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  background: "none", border: "none", cursor: "pointer", padding: "0 4px",
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700,
                  background: isActive ? "var(--navy)" : isComplete ? "rgba(37,99,235,0.12)" : "#f1f5f9",
                  color: isActive ? "white" : isComplete ? "var(--blue)" : "#94a3b8",
                  border: isActive ? "2px solid var(--navy)" : isComplete ? "2px solid rgba(37,99,235,0.35)" : "2px solid #e2e8f0",
                  transition: "all 0.15s",
                }}>
                  {idx + 1}
                </div>
                <span style={{
                  fontSize: 12, fontWeight: isActive ? 700 : 500,
                  color: isActive ? "var(--navy)" : isComplete ? "#166534" : "#94a3b8",
                  whiteSpace: "nowrap",
                }}>
                  {stepLabels[key]}
                  {key === "reviewer" && applicant.reviewerEvaluations.length > 0 && (
                    <span style={{ marginLeft: 4, background: "#e0f2fe", color: "#0369a1", borderRadius: 10, padding: "0px 5px", fontSize: 10, fontWeight: 700 }}>
                      {applicant.reviewerEvaluations.length}
                    </span>
                  )}
                  {key === "history" && history.length > 1 && (
                    <span style={{ marginLeft: 4, background: "#fef3c7", color: "#92400e", borderRadius: 10, padding: "0px 5px", fontSize: 10, fontWeight: 700 }}>
                      {history.length}
                    </span>
                  )}
                </span>
              </button>
              {idx < STEP_KEYS.length - 1 && (
                <div style={{ width: 48, height: 2, background: isComplete ? "#86efac" : "#e2e8f0", margin: "0 4px", marginTop: -18, flexShrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step: Assignment */}
      {activeStep === "application" && (
        <Card className="admin-card">
          <CardHeader className="admin-card__header">
            <CardTitle className="admin-card__title" style={{ color: "var(--navy)" }}>
              Reviewer Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="admin-card__content">
            {assignedReviewers.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {assignedReviewers.map((r) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#e0f2fe", borderRadius: 8, padding: "6px 12px", fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>{r.name}</span>
                    <span style={{ color: "#64748b" }}>{r.email}</span>
                    <button
                      type="button"
                      onClick={() => removeReviewer(r.id)}
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: 700, fontSize: 14 }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted" style={{ marginBottom: 12 }}>No reviewers assigned yet.</p>
            )}
            {unassignedReviewers.length > 0 ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  value={selectedReviewerId}
                  onChange={(e) => setSelectedReviewerId(e.target.value)}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, minWidth: 260 }}
                >
                  <option value="">Select a reviewer…</option>
                  {unassignedReviewers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.email}
                    </option>
                  ))}
                </select>
                <Button className="admin-primary-btn" onClick={assignReviewer} disabled={!selectedReviewerId || assigning}>
                  {assigning ? "Assigning…" : "Assign"}
                </Button>
              </div>
            ) : reviewers.length === 0 ? (
              <p className="muted">No reviewers exist yet. Add reviewers in the Reviewers tab first.</p>
            ) : (
              <p className="muted">All available reviewers are already assigned.</p>
            )}
            {assignError && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 8, fontWeight: 600 }}>{assignError}</p>}
          </CardContent>
        </Card>
      )}

      {/* Step: AI Scores */}
      {activeStep === "scores" && (
        <div className="detail-grid">
          {ps && (ps.score.overall_score as number) > 0 && (
            <Card className="admin-card">
              <CardHeader className="admin-card__header">
                <CardTitle className="admin-card__title" style={{ color: "var(--navy)" }}>Personal Statement Scores</CardTitle>
              </CardHeader>
              <CardContent className="admin-card__content">
                <div className="rubric-list">
                  {PS_CRITERIA.map(({ key, label, max }) => {
                    const score = (ps.score[key] as number) ?? 0;
                    const pct = (score / max) * 100;
                    return (
                      <div key={key} className="rubric-row">
                        <div className="rubric-top">
                          <div className="rubric-criterion">{label}</div>
                          <span className="admin-pill admin-pill--slate">{score} / {max}</span>
                        </div>
                        <div style={{ height: 6, background: "#e5e7eb", borderRadius: 4, marginTop: 4 }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "#2563EB", borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="llm-overall">
                  <div className="llm-overall-title">
                    Overall: {(ps.score.overall_score as number) ?? "—"} / 100
                    {ps.score.grade_pct != null && ` (${ps.score.grade_pct}%)`}
                  </div>
                  {Array.isArray(ps.score.strengths) && ps.score.strengths.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, letterSpacing: "0.04em" }}>STRENGTHS:</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#374151" }}>
                        {(ps.score.strengths as string[]).map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(ps.score.improvements) && ps.score.improvements.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, letterSpacing: "0.04em" }}>AREAS TO IMPROVE:</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#374151" }}>
                        {(ps.score.improvements as string[]).map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          {re && (re.score.overall_score as number) > 0 && (
            <Card className="admin-card">
              <CardHeader className="admin-card__header">
                <CardTitle className="admin-card__title" style={{ color: "var(--navy)" }}>Resume Scores</CardTitle>
              </CardHeader>
              <CardContent className="admin-card__content">
                <div className="rubric-list">
                  {RESUME_CRITERIA.map(({ key, label, max }) => {
                    const score = (re.score[key] as number) ?? 0;
                    const pct = (score / max) * 100;
                    return (
                      <div key={key} className="rubric-row">
                        <div className="rubric-top">
                          <div className="rubric-criterion">{label}</div>
                          <span className="admin-pill admin-pill--slate">{score} / {max}</span>
                        </div>
                        <div style={{ height: 6, background: "#e5e7eb", borderRadius: 4, marginTop: 4 }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "#2563EB", borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="llm-overall">
                  <div className="llm-overall-title">
                    Overall: {(re.score.overall_score as number) ?? "—"} / 180
                    {re.score.grade_pct != null && ` (${re.score.grade_pct}%)`}
                  </div>
                  {Array.isArray(re.score.strengths) && (re.score.strengths as string[]).length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, letterSpacing: "0.04em" }}>STRENGTHS:</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#374151" }}>
                        {(re.score.strengths as string[]).map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(re.score.improvements) && (re.score.improvements as string[]).length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, letterSpacing: "0.04em" }}>AREAS TO IMPROVE:</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#374151" }}>
                        {(re.score.improvements as string[]).map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {re.score.justification && (
                    <div className="llm-overall-text" style={{ marginTop: 8 }}>{re.score.justification as string}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          {(!ps || (ps.score.overall_score as number) === 0) && (!re || (re.score.overall_score as number) === 0) && (
            <Card className="admin-card">
              <CardContent className="admin-card__content">
                <p className="admin-empty">No scored submissions yet.</p>
              </CardContent>
            </Card>
          )}

          {((ps && (ps.score.overall_score as number) > 0) || (re && (re.score.overall_score as number) > 0)) && !isDecisionLocked && (
            <Card className="admin-card" style={{ gridColumn: "1 / -1" }}>
              <CardHeader className="admin-card__header">
                <CardTitle className="admin-card__title" style={{ color: "var(--navy)" }}>Actions</CardTitle>
              </CardHeader>
              <CardContent className="admin-card__content">
                {applicant.interviewAt && (
                  <div style={{ padding: "10px 14px", marginBottom: 16, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: 13 }}>
                    <span style={{ fontWeight: 700, color: "#1d4ed8" }}>Interview scheduled: </span>
                    {new Date(applicant.interviewAt).toLocaleString()}
                    {applicant.interviewMessage && <span style={{ color: "#374151" }}> — {applicant.interviewMessage}</span>}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                      Schedule Interview
                    </label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                      <div>
                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Date & Time</div>
                        <input
                          type="datetime-local"
                          value={interviewDate}
                          onChange={(e) => setInterviewDate(e.target.value)}
                          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14 }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Message to applicant (optional)</div>
                        <input
                          type="text"
                          value={interviewMsg}
                          onChange={(e) => setInterviewMsg(e.target.value)}
                          placeholder="e.g. Interview via Zoom, link will be sent"
                          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }}
                        />
                      </div>
                      <Button
                        className="admin-primary-btn"
                        onClick={scheduleInterview}
                        disabled={!interviewDate || schedulingInterview}
                      >
                        {schedulingInterview ? "Scheduling…" : applicant.interviewAt ? "Update Schedule" : "Schedule Interview"}
                      </Button>
                    </div>
                    {scheduleResult && (
                      <p style={{ fontSize: 13, marginTop: 6, color: scheduleResult.includes("Failed") ? "#ef4444" : "#16a34a", fontWeight: 600 }}>
                        {scheduleResult}
                      </p>
                    )}
                  </div>
                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
                    <Button
                      onClick={quickReject}
                      disabled={rejectingQuick}
                      style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", fontWeight: 700, fontSize: 13, padding: "8px 18px", borderRadius: 8, cursor: "pointer" }}
                    >
                      {rejectingQuick ? "Rejecting…" : "Reject Applicant"}
                    </Button>
                    <span style={{ marginLeft: 10, fontSize: 12, color: "#94a3b8" }}>This will lock the decision as Rejected</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step: Reviewer evaluations */}
      {activeStep === "reviewer" && (
        <div>
          {applicant.reviewerEvaluations.length === 0 ? (
            <Card className="admin-card">
              <CardContent className="admin-card__content">
                <p className="admin-empty">No reviewer evaluations submitted yet.</p>
              </CardContent>
            </Card>
          ) : (
            applicant.reviewerEvaluations.map((ev) => {
              const reviewer = reviewers.find((r) => r.id === ev.reviewer_id);
              const isYes = ev.recommendation === "Yes" || ev.recommendation === "Recommend";
              const isNo  = ev.recommendation === "No"  || ev.recommendation === "Do Not Recommend";
              const recColor = isYes ? "#166534" : isNo ? "#991b1b" : "#475569";
              const recBg    = isYes ? "#dcfce7"  : isNo ? "#fee2e2"  : "#f1f5f9";
              return (
                <Card key={ev.id} className="admin-card" style={{ marginBottom: 14 }}>
                  <CardHeader className="admin-card__header">
                    <CardTitle className="admin-card__title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: "var(--navy)" }}>{reviewer?.name || "Reviewer"}</span>
                      {reviewer?.email && <span style={{ fontWeight: 400, fontSize: 13, color: "#64748b" }}>{reviewer.email}</span>}
                      <span style={{ background: ev.status === "submitted" ? "#dcfce7" : "#f1f5f9", color: ev.status === "submitted" ? "#166534" : "#64748b", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 10, marginLeft: "auto" }}>
                        {ev.status === "submitted" ? "✓ Submitted" : "Draft"}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="admin-card__content">
                    <div style={{ display: "flex", gap: 24, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Recommendation</div>
                        <span style={{ background: recBg, color: recColor, fontWeight: 700, fontSize: 13, padding: "4px 12px", borderRadius: 20 }}>
                          {ev.recommendation || "—"}
                        </span>
                      </div>
                      {ev.updated_at && (
                        <div>
                          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Last Updated</div>
                          <div style={{ fontSize: 13 }}>{new Date(ev.updated_at).toLocaleString()}</div>
                        </div>
                      )}
                    </div>
                    {ev.notes && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6, fontWeight: 600 }}>Notes</div>
                        <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.7, padding: "12px 14px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                          {ev.notes}
                        </div>
                      </div>
                    )}
                    {ev.scores && (() => {
                      const s = ev.scores as Record<string, number>;
                      const pKeys = ["p_creativity", "p_technical", "p_relevance", "p_impact"];
                      const iKeys = ["i_communication", "i_critical", "i_alignment", "i_passion", "i_professionalism"];
                      const pVals = pKeys.map((k) => s[k]).filter((v) => typeof v === "number" && !isNaN(v));
                      const iVals = iKeys.map((k) => s[k]).filter((v) => typeof v === "number" && !isNaN(v));
                      const pAvg = pVals.length > 0 ? (pVals.reduce((a, b) => a + b, 0) / pVals.length).toFixed(1) : null;
                      const iAvg = iVals.length > 0 ? (iVals.reduce((a, b) => a + b, 0) / iVals.length).toFixed(1) : null;
                      if (!pAvg && !iAvg) return null;
                      return (
                        <div>
                          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, fontWeight: 600 }}>Reviewer Scores</div>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {pAvg && (
                              <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "8px 16px" }}>
                                <div style={{ fontSize: 11, color: "#0369a1", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Portfolio</div>
                                <span style={{ fontWeight: 800, fontSize: 18, color: "#0c4a6e" }}>{pAvg}</span>
                                <span style={{ color: "#64748b", fontSize: 12 }}> / 10</span>
                              </div>
                            )}
                            {iAvg && (
                              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 16px" }}>
                                <div style={{ fontSize: 11, color: "#15803d", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Interview</div>
                                <span style={{ fontWeight: 800, fontSize: 18, color: "#14532d" }}>{iAvg}</span>
                                <span style={{ color: "#64748b", fontSize: 12 }}> / 10</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Step: Final Decision */}
      {activeStep === "decision" && (
        <Card className="admin-card">
          <CardHeader className="admin-card__header">
            <CardTitle className="admin-card__title" style={{ color: "var(--navy)" }}>
              Final Decision
              {isDecisionLocked && (
                <span style={{ marginLeft: 12, fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: ds.bg, color: ds.color }}>
                  Finalized: {applicant.finalDecision}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="admin-card__content">
            {isDecisionLocked ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ padding: "16px", background: ds.bg, borderRadius: 10, border: `1px solid ${ds.color}30` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: ds.color, marginBottom: 4 }}>
                    Decision: {applicant.finalDecision}
                  </div>
                  {applicant.decisionAt && (
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      Set on {new Date(applicant.decisionAt).toLocaleString()}
                    </div>
                  )}
                </div>
                {applicant.decisionNotes && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Notes to applicant</div>
                    <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.7, padding: "12px 14px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                      {applicant.decisionNotes}
                    </div>
                  </div>
                )}
                <p style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
                  This decision has been finalized and cannot be changed.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>Decision</label>
                  <select
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                    style={{ width: "100%", maxWidth: 300, padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14 }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Waitlisted">Waitlisted</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>
                    Notes (visible to applicant)
                  </label>
                  <textarea
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    rows={4}
                    placeholder="Optional notes about this decision…"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, resize: "vertical", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Button className="admin-primary-btn" onClick={saveDecision} disabled={savingDecision || decision === "Pending"}>
                    {savingDecision ? "Saving…" : "Finalize Decision"}
                  </Button>
                  {decision === "Pending" && (
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>Select a decision to finalize</span>
                  )}
                  {decisionMsg && (
                    <span style={{ fontSize: 13, color: decisionMsg.includes("Failed") ? "#ef4444" : "#16a34a", fontWeight: 600 }}>
                      {decisionMsg}
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step: History */}
      {activeStep === "history" && (
        <Card className="admin-card">
          <CardHeader className="admin-card__header">
            <CardTitle className="admin-card__title" style={{ color: "var(--navy)" }}>Application History</CardTitle>
          </CardHeader>
          <CardContent className="admin-card__content">
            {history.length === 0 ? (
              <p className="admin-empty">No history found.</p>
            ) : (
              <div className="table-wrap">
                <table className="table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Cycle</th>
                      <th>Submitted</th>
                      <th>Status</th>
                      <th>Reviewer</th>
                      <th>Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => {
                      const decColor = DECISION_COLORS[h.finalDecision] ?? DECISION_COLORS.Pending;
                      return (
                        <tr key={h.id} style={{ background: h.id === applicant.id ? "#f0f9ff" : undefined }}>
                          <td style={{ fontWeight: 600, color: "var(--navy)" }}>
                            {h.cycle?.name ?? "No cycle"}
                            {h.id === applicant.id && (
                              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: "#dbeafe", color: "#1d4ed8" }}>
                                Current
                              </span>
                            )}
                          </td>
                          <td className="muted">{new Date(h.submittedAt).toLocaleDateString()}</td>
                          <td>
                            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "#f1f5f9", color: "#475569" }}>
                              {h.status}
                            </span>
                          </td>
                          <td>
                            {h.reviewerRecommendation
                              ? <span style={{ fontSize: 13 }}>{h.reviewerStatus === "submitted" ? "✓ " : "Draft: "}{h.reviewerRecommendation}</span>
                              : <span className="muted">—</span>}
                          </td>
                          <td>
                            <span style={{ background: decColor.bg, color: decColor.color, fontWeight: 700, fontSize: 12, padding: "3px 10px", borderRadius: 20 }}>
                              {h.finalDecision}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
        <button
          type="button"
          onClick={() => setActiveStep(STEP_KEYS[currentIdx - 1])}
          disabled={currentIdx === 0}
          style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", cursor: currentIdx === 0 ? "not-allowed" : "pointer", color: currentIdx === 0 ? "#cbd5e1" : "#374151", fontSize: 14 }}
        >
          ← Previous
        </button>
        <button
          type="button"
          onClick={() => setActiveStep(STEP_KEYS[currentIdx + 1])}
          disabled={currentIdx === STEP_KEYS.length - 1}
          style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: currentIdx === STEP_KEYS.length - 1 ? "white" : "var(--navy)", cursor: currentIdx === STEP_KEYS.length - 1 ? "not-allowed" : "pointer", color: currentIdx === STEP_KEYS.length - 1 ? "#cbd5e1" : "white", fontSize: 14, fontWeight: 600 }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
