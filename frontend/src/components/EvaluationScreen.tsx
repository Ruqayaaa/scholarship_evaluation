import { useEffect, useMemo, useState } from "react";
import type { Applicant, PsScores, ResumeScores } from "../types";
import { ArrowLeft, Download, Plus, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { adminFetch } from "../lib/api";

const PS_CRITERIA: { key: keyof PsScores; label: string }[] = [
  { key: "interests_and_values", label: "Interests & Values" },
  { key: "academic_commitment",  label: "Academic Commitment" },
  { key: "clarity_of_vision",    label: "Clarity of Vision" },
  { key: "organization",         label: "Organization" },
  { key: "language_quality",     label: "Language Quality" },
];

const RESUME_CRITERIA: { key: keyof ResumeScores; label: string }[] = [
  { key: "academic_achievement",           label: "Academic Achievement" },
  { key: "leadership_and_extracurriculars", label: "Leadership & Extracurriculars" },
  { key: "community_service",              label: "Community Service" },
  { key: "research_and_work_experience",   label: "Research & Work Experience" },
  { key: "skills_and_certifications",      label: "Skills & Certifications" },
  { key: "awards_and_recognition",         label: "Awards & Recognition" },
];

interface Props {
  applicant: Applicant;
  onBack: () => void;
}

const availableQuestions = [
  "Can you elaborate on your leadership experience and its impact?",
  "How do you plan to contribute to your community after graduation?",
  "What specific skills have you developed through your extracurricular activities?",
  "Describe a time when you failed and what you learned from it.",
  "How will this scholarship help you achieve your long-term goals?",
  "What makes you uniquely qualified for this scholarship?",
];

export default function EvaluationScreen({ applicant, onBack }: Props) {
  const hasPortfolio = !!applicant.portfolio;

  const stepLabels = useMemo(() => {
    return hasPortfolio
      ? ["Review", "Portfolio", "Questions", "Score", "Submit"]
      : ["Review", "Questions", "Score", "Submit"];
  }, [hasPortfolio]);

  const totalSteps = stepLabels.length;

  const [step, setStep] = useState(1);

  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState("");

  const [scores, setScores] = useState({
    academic: "",
    leadership: "",
    financial: "",
    statement: "",
  });

  const [portfolioScores, setPortfolioScores] = useState({
    creativity: "",
    technical: "",
    relevance: "",
    impact: "",
  });

  const [comments, setComments] = useState("");
  const [overallScore, setOverallScore] = useState(0);

  // Reviewer evaluation state
  const [reviewerId, setReviewerId] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState("Pending");
  const [evalStatus, setEvalStatus] = useState<"draft" | "submitted">("draft");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Calculate overall score from rubric inputs
  useEffect(() => {
    const base = Object.values(scores)
      .filter((s) => s !== "")
      .map((s) => parseFloat(s));

    const required = hasPortfolio ? 5 : 4;
    let all = [...base];

    if (hasPortfolio) {
      const p = Object.values(portfolioScores)
        .filter((s) => s !== "")
        .map((s) => parseFloat(s));

      if (p.length === 4) {
        const avg = p.reduce((a, b) => a + b, 0) / 4;
        all.push(avg);
      }
    }

    if (all.length === required) {
      const avg = all.reduce((a, b) => a + b, 0) / required;
      setOverallScore(Math.round(avg * 10));
    } else {
      setOverallScore(0);
    }
  }, [scores, portfolioScores, hasPortfolio]);

  // Load reviewer ID and any saved evaluation
  useEffect(() => {
    async function loadEvaluation() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const uid = session.user.id;
      setReviewerId(uid);
      try {
        const res = await adminFetch(
          `/reviewer/${uid}/applications/${applicant.id}/evaluation`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!data) return;
        setRecommendation(data.recommendation || "Pending");
        setComments(data.notes || "");
        setEvalStatus((data.status as "draft" | "submitted") || "draft");
        if (data.scores && typeof data.scores === "object") {
          const s = data.scores as Record<string, number>;
          // Restore saved step (stored as _step in scores JSON)
          if (s._step && typeof s._step === "number") {
            setStep(s._step);
          }
          setScores({
            academic:   s.academic   != null ? String(s.academic)   : "",
            leadership: s.leadership != null ? String(s.leadership) : "",
            financial:  s.financial  != null ? String(s.financial)  : "",
            statement:  s.statement  != null ? String(s.statement)  : "",
          });
          if (hasPortfolio) {
            setPortfolioScores({
              creativity: s.creativity != null ? String(s.creativity) : "",
              technical:  s.technical  != null ? String(s.technical)  : "",
              relevance:  s.relevance  != null ? String(s.relevance)  : "",
              impact:     s.impact     != null ? String(s.impact)     : "",
            });
          }
        }
      } catch {
        // silently fail — reviewer just starts fresh
      }
    }
    loadEvaluation();
  }, [applicant.id]);

  async function saveEvaluation(status: "draft" | "submitted") {
    if (!reviewerId) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const reviewerScores: Record<string, number> = {};
      // Save current step so it can be restored on next login
      reviewerScores._step = step;
      if (scores.academic)   reviewerScores.academic   = parseFloat(scores.academic);
      if (scores.leadership) reviewerScores.leadership = parseFloat(scores.leadership);
      if (scores.financial)  reviewerScores.financial  = parseFloat(scores.financial);
      if (scores.statement)  reviewerScores.statement  = parseFloat(scores.statement);
      if (hasPortfolio) {
        if (portfolioScores.creativity) reviewerScores.creativity = parseFloat(portfolioScores.creativity);
        if (portfolioScores.technical)  reviewerScores.technical  = parseFloat(portfolioScores.technical);
        if (portfolioScores.relevance)  reviewerScores.relevance  = parseFloat(portfolioScores.relevance);
        if (portfolioScores.impact)     reviewerScores.impact     = parseFloat(portfolioScores.impact);
      }

      const res = await adminFetch(
        `/reviewer/${reviewerId}/applications/${applicant.id}/evaluation`,
        {
          method: "PATCH",
          body: JSON.stringify({ recommendation, notes: comments, scores: reviewerScores, status }),
        }
      );
      if (!res.ok) throw new Error("Save failed");
      setEvalStatus(status);
      setSaveMsg(status === "submitted" ? "Evaluation submitted!" : "Progress saved.");
      if (status === "submitted") {
        setTimeout(() => { setSaveMsg(null); onBack(); }, 1500);
      }
    } catch {
      setSaveMsg("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const handleDownload = (name: string) => {
    window.alert(`Downloading: ${name}`);
  };

  const toggleQuestion = (q: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(q) ? prev.filter((x) => x !== q) : [...prev, q]
    );
  };

  const addCustomQuestion = () => {
    const q = newQuestion.trim();
    if (!q) return;
    setCustomQuestions((prev) => [...prev, q]);
    setNewQuestion("");
  };

  const removeCustomQuestion = (idx: number) => {
    setCustomQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const next = () => setStep((s) => Math.min(totalSteps, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const STEP_REVIEW    = 1;
  const STEP_PORTFOLIO = hasPortfolio ? 2 : -1;
  const STEP_QUESTIONS = hasPortfolio ? 3 : 2;
  const STEP_SCORE     = hasPortfolio ? 4 : 3;
  const STEP_SUBMIT    = hasPortfolio ? 5 : 4;

  const isLocked = evalStatus === "submitted";

  return (
    <div className="reviewer-page">
      <button className="back-btn" type="button" onClick={onBack}>
        <ArrowLeft size={16} />
        Back to Applicants
      </button>

      <div className="top-stepper">
        <div className="top-stepper-head">
          <div>
            <div className="top-stepper-title">{applicant.name}</div>
            <div className="top-stepper-sub">{applicant.scholarship}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isLocked && (
              <span style={{ background: "#dcfce7", color: "#166534", fontWeight: 700, fontSize: 13, padding: "4px 12px", borderRadius: 20 }}>
                ✓ Submitted
              </span>
            )}
            <div className="top-stepper-sub">Step {step} / {totalSteps}</div>
          </div>
        </div>

        <div className="top-stepper-track">
          {stepLabels.map((label, i) => {
            const num = i + 1;
            const cls = num === step ? "is-active" : num < step ? "is-done" : "";
            return (
              <div key={label} className={`top-stepper-item ${cls}`}>
                <div className="top-stepper-bubble">{num}</div>
                <div className="top-stepper-label">{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="reviewer-content">
        {/* STEP 1: REVIEW */}
        {step === STEP_REVIEW && (
          <div className="reviewer-stack">
            <div className="reviewer-block">
              <div className="reviewer-block-title">Application Information</div>
              <div className="reviewer-grid-2">
                {applicant.formFields.map((f, idx) => (
                  <div key={idx} className="reviewer-field">
                    <div className="reviewer-field-label">{f.label}</div>
                    <div className="reviewer-field-value">{f.value || "—"}</div>
                  </div>
                ))}
              </div>
            </div>

            {applicant.answers.length > 0 && (
              <div className="reviewer-block">
                <div className="reviewer-block-title">Submitted Text</div>
                <div className="reviewer-stack" style={{ gap: 12 }}>
                  {applicant.answers.map((a, i) => (
                    <div key={i}>
                      <div className="reviewer-field-label" style={{ marginBottom: 6 }}>{a.question}</div>
                      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "rgba(255,255,255,0.7)", fontSize: 14 }}>
                        {a.answer || "Not provided"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {applicant.psScores && (
              <div className="reviewer-block reviewer-ai">
                <div className="reviewer-block-title">
                  AI Scores — Personal Statement
                  <span style={{ fontWeight: 400, fontSize: 13, marginLeft: 8, color: "var(--muted)" }}>
                    Overall: {applicant.psScores.overall_score} / 100
                  </span>
                </div>
                <div className="reviewer-rubric" style={{ gap: 10 }}>
                  {PS_CRITERIA.map(({ key, label }) => {
                    const score = applicant.psScores![key] as number;
                    const pct = (score / 20) * 100;
                    return (
                      <div key={key} className="rubric-row">
                        <div className="rubric-left"><div className="rubric-title">{label}</div></div>
                        <div style={{ flex: 1 }}>
                          <div className="reviewer-bar-head">
                            <span />
                            <span className="reviewer-bar-val">{score} / 20</span>
                          </div>
                          <div className="bar-track">
                            <div className="bar-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {(applicant.psScores.strengths.length > 0 || applicant.psScores.improvements.length > 0) && (
                  <div className="reviewer-grid-2" style={{ marginTop: 12 }}>
                    {applicant.psScores.strengths.length > 0 && (
                      <div className="reviewer-listbox">
                        <div className="reviewer-listbox-title">Strengths</div>
                        <ul className="reviewer-ul">
                          {applicant.psScores.strengths.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {applicant.psScores.improvements.length > 0 && (
                      <div className="reviewer-listbox">
                        <div className="reviewer-listbox-title">Areas to Improve</div>
                        <ul className="reviewer-ul">
                          {applicant.psScores.improvements.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {applicant.resumeScores && (
              <div className="reviewer-block reviewer-ai">
                <div className="reviewer-block-title">
                  AI Scores — Resume
                  <span style={{ fontWeight: 400, fontSize: 13, marginLeft: 8, color: "var(--muted)" }}>
                    Overall: {applicant.resumeScores.overall_score} / 180
                  </span>
                </div>
                <div className="reviewer-rubric" style={{ gap: 10 }}>
                  {RESUME_CRITERIA.map(({ key, label }) => {
                    const score = applicant.resumeScores![key] as number;
                    const pct = (score / 30) * 100;
                    return (
                      <div key={key} className="rubric-row">
                        <div className="rubric-left"><div className="rubric-title">{label}</div></div>
                        <div style={{ flex: 1 }}>
                          <div className="reviewer-bar-head">
                            <span />
                            <span className="reviewer-bar-val">{score} / 30</span>
                          </div>
                          <div className="bar-track">
                            <div className="bar-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {applicant.resumeScores.justification && (
                  <div className="reviewer-ai-card" style={{ marginTop: 10 }}>
                    <div className="reviewer-ai-card-title">Justification</div>
                    <div className="reviewer-ai-card-text">{applicant.resumeScores.justification}</div>
                  </div>
                )}
              </div>
            )}

            {!applicant.psScores && !applicant.resumeScores && (
              <div className="reviewer-block reviewer-ai">
                <div className="reviewer-block-title">AI Summary</div>
                <div className="reviewer-ai-row">
                  <div className="reviewer-ai-score">
                    <div className="reviewer-ai-score-num">{applicant.aiScore}</div>
                    <div className="reviewer-ai-score-sub">AI Score (0–100)</div>
                  </div>
                </div>
                <div className="reviewer-ai-card">
                  <div className="reviewer-ai-card-title">AI Feedback</div>
                  <div className="reviewer-ai-card-text">{applicant.aiFeedback}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: PORTFOLIO */}
        {hasPortfolio && step === STEP_PORTFOLIO && (
          <div className="reviewer-stack">
            <div className="reviewer-block">
              <div className="reviewer-block-title">Portfolio: Download & Review</div>
              <p className="reviewer-muted" style={{ marginBottom: 12 }}>
                Download the portfolio package first, then score it using the rubric.
              </p>
              <div className="reviewer-docs" style={{ gridTemplateColumns: "1fr" }}>
                <div className="reviewer-doc">
                  <div className="reviewer-doc-name">Portfolio</div>
                  <div className="reviewer-doc-meta">{applicant.portfolio?.items?.[0]?.title || "Portfolio.zip"}</div>
                  <button className="ghost-btn" type="button" onClick={() => handleDownload("Portfolio")}>
                    <Download size={16} /> Download Portfolio
                  </button>
                </div>
              </div>
              <div className="reviewer-ai-card" style={{ marginTop: 14 }}>
                <div className="reviewer-ai-card-title">Portfolio Summary</div>
                <div className="reviewer-ai-card-text">{applicant.portfolio!.summary}</div>
              </div>
            </div>

            <div className="reviewer-block">
              <div className="reviewer-block-title">Portfolio Rubric (0–10)</div>
              <div className="reviewer-rubric">
                {[
                  { id: "creativity", title: "Creativity & Originality" },
                  { id: "technical",  title: "Technical Skill" },
                  { id: "relevance",  title: "Relevance & Purpose" },
                  { id: "impact",     title: "Impact & Achievement" },
                ].map((c) => (
                  <div className="rubric-row" key={c.id}>
                    <div className="rubric-left">
                      <div className="rubric-title">{c.title}</div>
                      <div className="rubric-hint">Score based on the downloaded portfolio</div>
                    </div>
                    <input
                      className="rubric-input"
                      type="number"
                      min={0}
                      max={10}
                      step={0.1}
                      value={(portfolioScores as Record<string, string>)[c.id]}
                      onChange={(e) => setPortfolioScores((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      placeholder="0-10"
                      disabled={isLocked}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP QUESTIONS */}
        {step === STEP_QUESTIONS && (
          <div className="reviewer-stack">
            <div className="reviewer-block">
              <div className="reviewer-block-title">Suggested Interview Questions</div>
              <div className="reviewer-checklist">
                {availableQuestions.map((q) => (
                  <label key={q} className="check-item">
                    <input type="checkbox" checked={selectedQuestions.includes(q)} onChange={() => toggleQuestion(q)} />
                    <span>{q}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="reviewer-block">
              <div className="reviewer-block-title">Custom Questions</div>
              {customQuestions.length > 0 && (
                <div className="reviewer-custom-list">
                  {customQuestions.map((q, idx) => (
                    <div key={idx} className="custom-row">
                      <span>{q}</span>
                      <button className="icon-btn" type="button" onClick={() => removeCustomQuestion(idx)} aria-label="Remove">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="reviewer-inline">
                <input
                  className="input"
                  value={newQuestion}
                  placeholder="Type your question..."
                  onChange={(e) => setNewQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" ? (e.preventDefault(), addCustomQuestion()) : null}
                />
                <button className="primary-btn" type="button" onClick={addCustomQuestion}>
                  <Plus size={16} /> Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP SCORE */}
        {step === STEP_SCORE && (
          <div className="reviewer-block">
            <div className="reviewer-block-title">Evaluation Rubric (0–10)</div>
            <div className="reviewer-rubric">
              {[
                { id: "academic",   title: "Academic Merit",       ai: applicant.aiBreakdown.academic },
                { id: "leadership", title: "Leadership & Impact",  ai: applicant.aiBreakdown.leadership },
                { id: "financial",  title: "Financial Need",       ai: applicant.aiBreakdown.financial },
                { id: "statement",  title: "Personal Statement",   ai: applicant.aiBreakdown.statement },
              ].map((c) => (
                <div className="rubric-row" key={c.id}>
                  <div className="rubric-left">
                    <div className="rubric-title">{c.title}</div>
                    <div className="rubric-hint">AI suggested: {c.ai}/10</div>
                  </div>
                  <input
                    className="rubric-input"
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={(scores as Record<string, string>)[c.id]}
                    onChange={(e) => setScores((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    placeholder="0-10"
                    disabled={isLocked}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP SUBMIT */}
        {step === STEP_SUBMIT && (
          <div className="reviewer-stack">
            <div className="reviewer-block reviewer-final">
              <div className="reviewer-final-score">
                <div className="reviewer-final-score-num">{overallScore}</div>
                <div className="reviewer-final-score-sub">Reviewer Score (0–100)</div>
              </div>
            </div>

            <div className="reviewer-block">
              <div className="reviewer-block-title">Recommendation</div>
              <select
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                disabled={isLocked}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  fontSize: 14,
                  background: isLocked ? "#f8fafc" : "white",
                  cursor: isLocked ? "not-allowed" : "pointer",
                }}
              >
                <option value="Pending">— Select your recommendation —</option>
                <option value="Recommend">Recommend</option>
                <option value="Borderline">Borderline</option>
                <option value="Do Not Recommend">Do Not Recommend</option>
              </select>
            </div>

            <div className="reviewer-block">
              <div className="reviewer-block-title">Evaluation Notes</div>
              <textarea
                className="reviewer-textarea"
                rows={8}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Write your notes and justification for your recommendation..."
                disabled={isLocked}
              />
            </div>

            <div className="reviewer-actions">
              {isLocked ? (
                <div style={{ padding: "10px 16px", background: "#dcfce7", borderRadius: 8, color: "#166534", fontWeight: 600, fontSize: 14 }}>
                  ✓ Evaluation Submitted
                </div>
              ) : (
                <>
                  <button
                    className="ghost-btn"
                    type="button"
                    onClick={() => saveEvaluation("draft")}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save Draft"}
                  </button>
                  <button
                    className="approve-btn"
                    type="button"
                    onClick={() => saveEvaluation("submitted")}
                    disabled={saving || recommendation === "Pending"}
                  >
                    {saving ? "Submitting…" : "Submit Evaluation"}
                  </button>
                </>
              )}
              {saveMsg && (
                <span style={{ fontSize: 13, color: saveMsg.includes("Failed") ? "#ef4444" : "#16a34a", fontWeight: 600 }}>
                  {saveMsg}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer navigation */}
      <div className="reviewer-footer-nav">
        <button className="ghost-btn" type="button" onClick={prev} disabled={step === 1}>
          Previous
        </button>

        {!isLocked && reviewerId && step < totalSteps && (
          <button
            className="ghost-btn"
            type="button"
            onClick={() => saveEvaluation("draft")}
            disabled={saving}
            style={{ fontSize: 13 }}
          >
            {saving ? "Saving…" : "Save Progress"}
          </button>
        )}

        <button className="primary-btn" type="button" onClick={next} disabled={step === totalSteps}>
          Next
        </button>
      </div>
    </div>
  );
}
