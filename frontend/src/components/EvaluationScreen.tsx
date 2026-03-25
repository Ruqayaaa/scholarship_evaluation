import { useEffect, useMemo, useState } from "react";
import type { Applicant, PsScores, ResumeScores } from "../types";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
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

const PORTFOLIO_RUBRIC = [
  { id: "creativity", title: "Creativity & Originality",  hint: "Originality and creative expression" },
  { id: "technical",  title: "Technical Skill",            hint: "Demonstrated technical proficiency" },
  { id: "relevance",  title: "Relevance & Purpose",        hint: "Alignment with scholarship goals" },
  { id: "impact",     title: "Impact & Achievement",       hint: "Evidence of meaningful outcomes" },
];

const INTERVIEW_RUBRIC = [
  { id: "communication",  title: "Communication & Clarity",          hint: "Ability to articulate ideas clearly" },
  { id: "critical",       title: "Critical Thinking",                hint: "Depth of reasoning and problem-solving" },
  { id: "alignment",      title: "Alignment with Scholarship Values", hint: "Connection to mission and goals" },
  { id: "passion",        title: "Passion & Motivation",             hint: "Genuine enthusiasm and drive" },
  { id: "professionalism",title: "Professional Demeanor",            hint: "Confidence, respect, and presence" },
];

const AVAILABLE_QUESTIONS = [
  "Can you elaborate on your leadership experience and its impact?",
  "How do you plan to contribute to your community after graduation?",
  "What specific skills have you developed through your extracurricular activities?",
  "Describe a time when you failed and what you learned from it.",
  "How will this scholarship help you achieve your long-term goals?",
  "What makes you uniquely qualified for this scholarship?",
];

// Steps are always fixed 5
const STEP_LABELS = ["Review Info", "Portfolio", "Interview Qs", "Interview Score", "Final Decision"];
const TOTAL_STEPS = 5;

interface Props {
  applicant: Applicant;
  onBack: () => void;
}

export default function EvaluationScreen({ applicant, onBack }: Props) {
  const [step, setStep] = useState(1);

  // Interview questions
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState("");

  // Portfolio rubric scores (0-10 each)
  const [portfolioScores, setPortfolioScores] = useState({ creativity: "", technical: "", relevance: "", impact: "" });

  // Interview rubric scores (0-10 each)
  const [interviewScores, setInterviewScores] = useState({
    communication: "", critical: "", alignment: "", passion: "", professionalism: "",
  });

  // AI score reviewer notes (step 1)
  const [psAiNotes, setPsAiNotes] = useState("");
  const [resumeAiNotes, setResumeAiNotes] = useState("");

  // Final step
  const [comments, setComments] = useState("");
  const [recommendation, setRecommendation] = useState("Pending");
  const [evalStatus, setEvalStatus] = useState<"draft" | "submitted">("draft");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [reviewerId, setReviewerId] = useState<string | null>(null);

  // Compute aggregate score
  const aggregatedScore = useMemo(() => {
    const portfolioVals = Object.values(portfolioScores).map(Number).filter((n) => !isNaN(n) && n > 0);
    const interviewVals = Object.values(interviewScores).map(Number).filter((n) => !isNaN(n) && n > 0);

    const portfolioAvg = portfolioVals.length === 4 ? portfolioVals.reduce((a, b) => a + b, 0) / 4 : null;
    const interviewAvg = interviewVals.length === 5 ? interviewVals.reduce((a, b) => a + b, 0) / 5 : null;

    // AI score contribution (normalize to 0-10)
    const aiNorm = applicant.aiScore ? applicant.aiScore / 10 : null;

    const parts: number[] = [];
    if (aiNorm !== null) parts.push(aiNorm);
    if (portfolioAvg !== null) parts.push(portfolioAvg);
    if (interviewAvg !== null) parts.push(interviewAvg);

    if (parts.length === 0) return 0;
    const avg = parts.reduce((a, b) => a + b, 0) / parts.length;
    return Math.round(avg * 10); // out of 100
  }, [portfolioScores, interviewScores, applicant.aiScore]);

  // Load session and saved evaluation
  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const uid = session.user.id;
      setReviewerId(uid);
      try {
        const res = await adminFetch(`/reviewer/${uid}/applications/${applicant.id}/evaluation`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data) return;
        setRecommendation(data.recommendation || "Pending");
        setComments(data.notes || "");
        setEvalStatus((data.status as "draft" | "submitted") || "draft");
        if (data.scores && typeof data.scores === "object") {
          const s = data.scores as Record<string, number>;
          if (s._step) setStep(s._step);
          // Restore portfolio scores
          setPortfolioScores({
            creativity:  s.p_creativity    != null ? String(s.p_creativity)    : "",
            technical:   s.p_technical     != null ? String(s.p_technical)     : "",
            relevance:   s.p_relevance     != null ? String(s.p_relevance)     : "",
            impact:      s.p_impact        != null ? String(s.p_impact)        : "",
          });
          // Restore interview scores
          setInterviewScores({
            communication:   s.i_communication   != null ? String(s.i_communication)   : "",
            critical:        s.i_critical         != null ? String(s.i_critical)         : "",
            alignment:       s.i_alignment        != null ? String(s.i_alignment)        : "",
            passion:         s.i_passion          != null ? String(s.i_passion)          : "",
            professionalism: s.i_professionalism  != null ? String(s.i_professionalism)  : "",
          });
          // Restore AI notes
          if (s._ps_ai_notes)     setPsAiNotes(String(s._ps_ai_notes));
          if (s._resume_ai_notes) setResumeAiNotes(String(s._resume_ai_notes));
          // Restore questions
          if (s._selectedQs) {
            try { setSelectedQuestions(JSON.parse(String(s._selectedQs))); } catch { /* ignore */ }
          }
          if (s._customQs) {
            try { setCustomQuestions(JSON.parse(String(s._customQs))); } catch { /* ignore */ }
          }
        }
      } catch {
        // start fresh
      }
    }
    load();
  }, [applicant.id]);

  async function saveEvaluation(status: "draft" | "submitted") {
    if (!reviewerId) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const scores: Record<string, unknown> = { _step: step };
      // Portfolio
      if (portfolioScores.creativity)    scores.p_creativity    = parseFloat(portfolioScores.creativity);
      if (portfolioScores.technical)     scores.p_technical     = parseFloat(portfolioScores.technical);
      if (portfolioScores.relevance)     scores.p_relevance     = parseFloat(portfolioScores.relevance);
      if (portfolioScores.impact)        scores.p_impact        = parseFloat(portfolioScores.impact);
      // Interview
      if (interviewScores.communication)   scores.i_communication   = parseFloat(interviewScores.communication);
      if (interviewScores.critical)        scores.i_critical         = parseFloat(interviewScores.critical);
      if (interviewScores.alignment)       scores.i_alignment        = parseFloat(interviewScores.alignment);
      if (interviewScores.passion)         scores.i_passion          = parseFloat(interviewScores.passion);
      if (interviewScores.professionalism) scores.i_professionalism  = parseFloat(interviewScores.professionalism);
      // AI notes
      if (psAiNotes)     scores._ps_ai_notes     = psAiNotes;
      if (resumeAiNotes) scores._resume_ai_notes = resumeAiNotes;
      // Questions
      scores._selectedQs = JSON.stringify(selectedQuestions);
      scores._customQs   = JSON.stringify(customQuestions);

      const res = await adminFetch(
        `/reviewer/${reviewerId}/applications/${applicant.id}/evaluation`,
        {
          method: "PATCH",
          body: JSON.stringify({ recommendation, notes: comments, scores, status }),
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

  const toggleQuestion = (q: string) =>
    setSelectedQuestions((prev) => prev.includes(q) ? prev.filter((x) => x !== q) : [...prev, q]);

  const addCustomQuestion = () => {
    const q = newQuestion.trim();
    if (!q) return;
    setCustomQuestions((prev) => [...prev, q]);
    setNewQuestion("");
  };

  const next = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));
  const isLocked = evalStatus === "submitted";

  return (
    <div className="reviewer-page">
      <button className="back-btn" type="button" onClick={onBack}>
        <ArrowLeft size={16} />
        Back to Applicants
      </button>

      {/* Stepper */}
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
            <div className="top-stepper-sub">Step {step} / {TOTAL_STEPS}</div>
          </div>
        </div>
        <div className="top-stepper-track">
          {STEP_LABELS.map((label, i) => {
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

        {/* ── STEP 1: REVIEW INFO & AI SCORES ───────────────────────────────── */}
        {step === 1 && (
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
                          <div className="reviewer-bar-head"><span /><span className="reviewer-bar-val">{score} / 20</span></div>
                          <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
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
                        <ul className="reviewer-ul">{applicant.psScores.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                      </div>
                    )}
                    {applicant.psScores.improvements.length > 0 && (
                      <div className="reviewer-listbox">
                        <div className="reviewer-listbox-title">Areas to Improve</div>
                        <ul className="reviewer-ul">{applicant.psScores.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 10, background: "rgba(245,158,11,0.07)", border: "1.5px solid rgba(245,158,11,0.25)" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.07em", color: "#92400e", textTransform: "uppercase", marginBottom: 8 }}>
                    Reviewer Notes on Personal Statement Scores
                  </div>
                  <textarea
                    style={{ width: "100%", minHeight: 80, resize: "vertical", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(245,158,11,0.3)", background: "rgba(255,255,255,0.8)", fontSize: 13, lineHeight: 1.6, fontFamily: "inherit", outline: "none" }}
                    value={psAiNotes}
                    onChange={(e) => setPsAiNotes(e.target.value)}
                    placeholder="Note any disagreements, context, or observations about the AI scores above..."
                    disabled={isLocked}
                  />
                </div>
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
                          <div className="reviewer-bar-head"><span /><span className="reviewer-bar-val">{score} / 30</span></div>
                          <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
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
                <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 10, background: "rgba(245,158,11,0.07)", border: "1.5px solid rgba(245,158,11,0.25)" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.07em", color: "#92400e", textTransform: "uppercase", marginBottom: 8 }}>
                    Reviewer Notes on Resume Scores
                  </div>
                  <textarea
                    style={{ width: "100%", minHeight: 80, resize: "vertical", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(245,158,11,0.3)", background: "rgba(255,255,255,0.8)", fontSize: 13, lineHeight: 1.6, fontFamily: "inherit", outline: "none" }}
                    value={resumeAiNotes}
                    onChange={(e) => setResumeAiNotes(e.target.value)}
                    placeholder="Note any disagreements, context, or observations about the AI scores above..."
                    disabled={isLocked}
                  />
                </div>
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

        {/* ── STEP 2: PORTFOLIO REVIEW & RUBRIC ─────────────────────────────── */}
        {step === 2 && (
          <div className="reviewer-stack">
            {applicant.portfolio ? (
              <>
                <div className="reviewer-block">
                  <div className="reviewer-block-title">Portfolio</div>
                  <p className="reviewer-muted" style={{ marginBottom: 12 }}>
                    Review the portfolio materials below, then complete the rubric.
                  </p>
                  <div className="reviewer-ai-card">
                    <div className="reviewer-ai-card-title">Uploaded Portfolio</div>
                    {applicant.portfolio.items?.map((item, i) => (
                      <div key={i} style={{ marginTop: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{item.title}</div>
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="primary-btn"
                            style={{ display: "inline-block", fontSize: 13, textDecoration: "none" }}
                          >
                            Open / Download Portfolio
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="reviewer-block">
                <div className="reviewer-block-title">Portfolio</div>
                <p className="reviewer-muted">
                  No portfolio was uploaded by this applicant. Complete the rubric based on any materials reviewed or mark N/A by leaving scores blank.
                </p>
              </div>
            )}

            <div className="reviewer-block">
              <div className="reviewer-block-title">Portfolio Rubric (0–10)</div>
              <div className="reviewer-rubric">
                {PORTFOLIO_RUBRIC.map((c) => (
                  <div className="rubric-row" key={c.id}>
                    <div className="rubric-left">
                      <div className="rubric-title">{c.title}</div>
                      <div className="rubric-hint">{c.hint}</div>
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

        {/* ── STEP 3: INTERVIEW QUESTIONS ────────────────────────────────────── */}
        {step === 3 && (
          <div className="reviewer-stack">
            <div className="reviewer-block">
              <div className="reviewer-block-title">Suggested Interview Questions</div>
              <p className="reviewer-muted" style={{ marginBottom: 12 }}>
                Select questions to use in the interview. You can also add custom questions.
              </p>
              <div className="reviewer-checklist">
                {AVAILABLE_QUESTIONS.map((q) => (
                  <label key={q} className="check-item">
                    <input type="checkbox" checked={selectedQuestions.includes(q)} onChange={() => toggleQuestion(q)} disabled={isLocked} />
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
                      {!isLocked && (
                        <button className="icon-btn" type="button" onClick={() => setCustomQuestions((prev) => prev.filter((_, i) => i !== idx))} aria-label="Remove">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!isLocked && (
                <div className="reviewer-inline">
                  <input
                    className="input"
                    value={newQuestion}
                    placeholder="Type your question..."
                    onChange={(e) => setNewQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" ? (e.preventDefault(), addCustomQuestion()) : undefined}
                  />
                  <button className="primary-btn" type="button" onClick={addCustomQuestion}>
                    <Plus size={16} /> Add
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 4: INTERVIEW SCORING RUBRIC ──────────────────────────────── */}
        {step === 4 && (
          <div className="reviewer-stack">
            <div className="reviewer-block">
              <div className="reviewer-block-title">Interview Scoring Rubric (0–10)</div>
              <p className="reviewer-muted" style={{ marginBottom: 16 }}>
                Score the applicant on each criterion based on their interview performance.
              </p>
              <div className="reviewer-rubric">
                {INTERVIEW_RUBRIC.map((c) => (
                  <div className="rubric-row" key={c.id}>
                    <div className="rubric-left">
                      <div className="rubric-title">{c.title}</div>
                      <div className="rubric-hint">{c.hint}</div>
                    </div>
                    <input
                      className="rubric-input"
                      type="number"
                      min={0}
                      max={10}
                      step={0.1}
                      value={(interviewScores as Record<string, string>)[c.id]}
                      onChange={(e) => setInterviewScores((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      placeholder="0-10"
                      disabled={isLocked}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: FINAL SCORE & DECISION ────────────────────────────────── */}
        {step === 5 && (
          <div className="reviewer-stack">
            {/* Score breakdown */}
            <div className="reviewer-block reviewer-ai">
              <div className="reviewer-block-title">Score Summary</div>
              <div className="reviewer-rubric" style={{ gap: 10 }}>
                {/* AI Score row */}
                <div className="rubric-row">
                  <div className="rubric-left">
                    <div className="rubric-title">AI Score</div>
                    <div className="rubric-hint">System-generated score</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: "var(--primary)", minWidth: 60, textAlign: "right" }}>
                    {applicant.aiScore ?? "—"}<span style={{ fontWeight: 400, fontSize: 13 }}>/100</span>
                  </div>
                </div>
                {/* Portfolio score row */}
                {(() => {
                  const vals = Object.values(portfolioScores).map(Number).filter((n) => !isNaN(n) && n > 0);
                  const avg = vals.length === 4 ? (vals.reduce((a, b) => a + b, 0) / 4).toFixed(1) : null;
                  return (
                    <div className="rubric-row">
                      <div className="rubric-left">
                        <div className="rubric-title">Portfolio Score</div>
                        <div className="rubric-hint">Average of portfolio rubric (0–10)</div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 18, color: "var(--primary)", minWidth: 60, textAlign: "right" }}>
                        {avg ?? "—"}<span style={{ fontWeight: 400, fontSize: 13 }}>/10</span>
                      </div>
                    </div>
                  );
                })()}
                {/* Interview score row */}
                {(() => {
                  const vals = Object.values(interviewScores).map(Number).filter((n) => !isNaN(n) && n > 0);
                  const avg = vals.length === 5 ? (vals.reduce((a, b) => a + b, 0) / 5).toFixed(1) : null;
                  return (
                    <div className="rubric-row">
                      <div className="rubric-left">
                        <div className="rubric-title">Interview Score</div>
                        <div className="rubric-hint">Average of interview rubric (0–10)</div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 18, color: "var(--primary)", minWidth: 60, textAlign: "right" }}>
                        {avg ?? "—"}<span style={{ fontWeight: 400, fontSize: 13 }}>/10</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
              {/* Aggregate */}
              <div className="reviewer-final" style={{ marginTop: 16, textAlign: "center" }}>
                <div className="reviewer-final-score-num">{aggregatedScore}</div>
                <div className="reviewer-final-score-sub">Aggregate Score (0–100)</div>
              </div>
            </div>

            {/* Recommendation */}
            <div className="reviewer-block">
              <div className="reviewer-block-title">Recommendation</div>
              <select
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                disabled={isLocked}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 14, background: isLocked ? "#f8fafc" : "white", cursor: isLocked ? "not-allowed" : "pointer" }}
              >
                <option value="Pending">— Select your recommendation —</option>
                <option value="Recommend">Recommend</option>
                <option value="Borderline">Borderline</option>
                <option value="Do Not Recommend">Do Not Recommend</option>
              </select>
            </div>

            {/* Comments */}
            <div className="reviewer-block">
              <div className="reviewer-block-title">Evaluation Notes & Comments</div>
              <textarea
                className="reviewer-textarea"
                rows={8}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Provide your overall assessment, justification for your recommendation, and any notable observations from the interview..."
                disabled={isLocked}
              />
            </div>

            {/* Actions */}
            <div className="reviewer-actions">
              {isLocked ? (
                <div style={{ padding: "10px 16px", background: "#dcfce7", borderRadius: 8, color: "#166534", fontWeight: 600, fontSize: 14 }}>
                  ✓ Evaluation Submitted
                </div>
              ) : (
                <>
                  <button className="ghost-btn" type="button" onClick={() => saveEvaluation("draft")} disabled={saving}>
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
        {!isLocked && reviewerId && step < TOTAL_STEPS && (
          <button className="ghost-btn" type="button" onClick={() => saveEvaluation("draft")} disabled={saving} style={{ fontSize: 13 }}>
            {saving ? "Saving…" : "Save Progress"}
          </button>
        )}
        {step < TOTAL_STEPS && (
          <button className="primary-btn" type="button" onClick={next}>
            Next
          </button>
        )}
      </div>
    </div>
  );
}
