import { useEffect, useMemo, useState } from "react";
import type { Applicant, PsScores, ResumeScores } from "../types";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { adminFetch } from "../lib/api";

const PS_CRITERIA: { key: keyof PsScores; label: string; max: number }[] = [
  { key: "interests_and_values", label: "Interests & Values",  max: 20 },
  { key: "academic_commitment",  label: "Academic Commitment", max: 20 },
  { key: "clarity_of_vision",    label: "Clarity of Vision",   max: 20 },
  { key: "organization",         label: "Organization",         max: 20 },
  { key: "language_quality",     label: "Language Quality",     max: 20 },
];

const RESUME_CRITERIA: { key: keyof ResumeScores; label: string; max: number }[] = [
  { key: "academic_achievement",            label: "Academic Achievement",       max: 30 },
  { key: "leadership_and_extracurriculars", label: "Leadership & Extracurriculars", max: 30 },
  { key: "community_service",               label: "Community Service",           max: 30 },
  { key: "research_and_work_experience",    label: "Research & Work Experience",  max: 30 },
  { key: "skills_and_certifications",       label: "Skills & Certifications",     max: 30 },
  { key: "awards_and_recognition",          label: "Awards & Recognition",        max: 30 },
];

const PORTFOLIO_RUBRIC = [
  { id: "creativity", title: "Creativity & Originality", hint: "Originality and creative expression" },
  { id: "technical",  title: "Technical Skill",           hint: "Demonstrated technical proficiency" },
  { id: "relevance",  title: "Relevance & Purpose",       hint: "Alignment with scholarship goals" },
  { id: "impact",     title: "Impact & Achievement",      hint: "Evidence of meaningful outcomes" },
];

const INTERVIEW_RUBRIC = [
  { id: "communication",   title: "Communication & Clarity",           hint: "Ability to articulate ideas clearly" },
  { id: "critical",        title: "Critical Thinking",                  hint: "Depth of reasoning and problem-solving" },
  { id: "alignment",       title: "Alignment with Scholarship Values",  hint: "Connection to mission and goals" },
  { id: "passion",         title: "Passion & Motivation",               hint: "Genuine enthusiasm and drive" },
  { id: "professionalism", title: "Professional Demeanor",              hint: "Confidence, respect, and presence" },
];

const AVAILABLE_QUESTIONS = [
  "Can you elaborate on your leadership experience and its impact?",
  "How do you plan to contribute to your community after graduation?",
  "What specific skills have you developed through your extracurricular activities?",
  "Describe a time when you failed and what you learned from it.",
  "How will this scholarship help you achieve your long-term goals?",
  "What makes you uniquely qualified for this scholarship?",
];

const STEP_LABELS = ["Review Info", "Portfolio", "Interview Questions", "Interview Score", "Final Decision"];
const TOTAL_STEPS = 5;

interface Props {
  applicant: Applicant;
  onBack: () => void;
}

export default function EvaluationScreen({ applicant, onBack }: Props) {
  const [step, setStep] = useState(1);

  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState("");

  const [portfolioScores, setPortfolioScores] = useState({ creativity: "", technical: "", relevance: "", impact: "" });
  const [portfolioNotes, setPortfolioNotes] = useState("");

  const [interviewScores, setInterviewScores] = useState({
    communication: "", critical: "", alignment: "", passion: "", professionalism: "",
  });

  // AI notes are stored per-section and preserved in the evaluation scores blob
  const [psAiNotes, setPsAiNotes] = useState("");
  const [resumeAiNotes, setResumeAiNotes] = useState("");

  // Final step
  const [comments, setComments] = useState("");
  // Recommendation is strictly "Yes" or "No"
  const [recommendation, setRecommendation] = useState<"Yes" | "No" | "">("");
  const [evalStatus, setEvalStatus] = useState<"draft" | "submitted">("draft");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [reviewerId, setReviewerId] = useState<string | null>(null);

  // Aggregate score
  const aggregatedScore = useMemo(() => {
    const portfolioVals = Object.values(portfolioScores).map(Number).filter((n) => !isNaN(n) && n > 0);
    const interviewVals = Object.values(interviewScores).map(Number).filter((n) => !isNaN(n) && n > 0);
    const portfolioAvg  = portfolioVals.length === 4 ? portfolioVals.reduce((a, b) => a + b, 0) / 4 : null;
    const interviewAvg  = interviewVals.length === 5 ? interviewVals.reduce((a, b) => a + b, 0) / 5 : null;
    const aiNorm        = applicant.aiScore ? applicant.aiScore / 10 : null;
    const parts: number[] = [];
    if (aiNorm !== null)      parts.push(aiNorm);
    if (portfolioAvg !== null) parts.push(portfolioAvg);
    if (interviewAvg !== null) parts.push(interviewAvg);
    if (parts.length === 0) return 0;
    return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10);
  }, [portfolioScores, interviewScores, applicant.aiScore]);

  // Load saved evaluation on mount
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

        // Normalize legacy recommendation values to Yes/No
        const savedRec = data.recommendation || "";
        if (savedRec === "Recommend") setRecommendation("Yes");
        else if (savedRec === "Do Not Recommend" || savedRec === "Borderline") setRecommendation("No");
        else if (savedRec === "Yes" || savedRec === "No") setRecommendation(savedRec as "Yes" | "No");

        setComments(data.notes || "");
        setEvalStatus((data.status as "draft" | "submitted") || "draft");

        if (data.scores && typeof data.scores === "object") {
          const s = data.scores as Record<string, number | string>;
          if (s._step) setStep(Number(s._step));
          setPortfolioScores({
            creativity: s.p_creativity != null ? String(s.p_creativity) : "",
            technical:  s.p_technical  != null ? String(s.p_technical)  : "",
            relevance:  s.p_relevance  != null ? String(s.p_relevance)  : "",
            impact:     s.p_impact     != null ? String(s.p_impact)     : "",
          });
          setInterviewScores({
            communication:   s.i_communication   != null ? String(s.i_communication)   : "",
            critical:        s.i_critical         != null ? String(s.i_critical)         : "",
            alignment:       s.i_alignment        != null ? String(s.i_alignment)        : "",
            passion:         s.i_passion          != null ? String(s.i_passion)          : "",
            professionalism: s.i_professionalism  != null ? String(s.i_professionalism)  : "",
          });
          if (s._ps_ai_notes)     setPsAiNotes(String(s._ps_ai_notes));
          if (s._resume_ai_notes) setResumeAiNotes(String(s._resume_ai_notes));
          if (s._portfolio_notes) setPortfolioNotes(String(s._portfolio_notes));
          if (s._selectedQs) {
            try { setSelectedQuestions(JSON.parse(String(s._selectedQs))); } catch { /* ignore */ }
          }
          if (s._customQs) {
            try { setCustomQuestions(JSON.parse(String(s._customQs))); } catch { /* ignore */ }
          }
        }
      } catch {
        // start fresh on any error
      }
    }
    load();
  }, [applicant.id]);

  async function saveEvaluation(status: "draft" | "submitted") {
    if (!reviewerId) return;
    if (status === "submitted" && !recommendation) {
      setSaveMsg("Please select Yes or No for your recommendation before submitting.");
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      const scores: Record<string, unknown> = { _step: step };
      if (portfolioScores.creativity) scores.p_creativity    = parseFloat(portfolioScores.creativity);
      if (portfolioScores.technical)  scores.p_technical     = parseFloat(portfolioScores.technical);
      if (portfolioScores.relevance)  scores.p_relevance     = parseFloat(portfolioScores.relevance);
      if (portfolioScores.impact)     scores.p_impact        = parseFloat(portfolioScores.impact);
      if (portfolioNotes)             scores._portfolio_notes = portfolioNotes;
      if (interviewScores.communication)   scores.i_communication   = parseFloat(interviewScores.communication);
      if (interviewScores.critical)        scores.i_critical         = parseFloat(interviewScores.critical);
      if (interviewScores.alignment)       scores.i_alignment        = parseFloat(interviewScores.alignment);
      if (interviewScores.passion)         scores.i_passion          = parseFloat(interviewScores.passion);
      if (interviewScores.professionalism) scores.i_professionalism  = parseFloat(interviewScores.professionalism);
      if (psAiNotes)     scores._ps_ai_notes     = psAiNotes;
      if (resumeAiNotes) scores._resume_ai_notes = resumeAiNotes;
      scores._selectedQs = JSON.stringify(selectedQuestions);
      scores._customQs   = JSON.stringify(customQuestions);

      const res = await adminFetch(
        `/reviewer/${reviewerId}/applications/${applicant.id}/evaluation`,
        { method: "PATCH", body: JSON.stringify({ recommendation, notes: comments, scores, status }) }
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

  // ── Shared AI Score Block ────────────────────────────────────────────────────
  function AiScoreBlock({
    title, overall, outOf, criteria, strengths, improvements, justification,
    notes, onNotesChange,
  }: {
    title: string;
    overall: number;
    outOf: number;
    criteria: { key: string; label: string; max: number; score: number }[];
    strengths: string[];
    improvements: string[];
    justification?: string;
    notes: string;
    onNotesChange: (v: string) => void;
  }) {
    const pct = outOf > 0 ? Math.round((overall / outOf) * 100) : 0;
    const scoreColor = pct >= 70 ? "#15803d" : pct >= 50 ? "#b45309" : "#b91c1c";
    return (
      <div className="reviewer-block reviewer-ai">
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div className="reviewer-block-title" style={{ margin: 0 }}>{title}</div>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "rgba(255,255,255,0.9)", border: "1.5px solid var(--border)",
            borderRadius: 10, padding: "6px 14px",
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Overall
            </span>
            <span style={{ fontSize: 20, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
              {overall}
            </span>
            <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>/ {outOf}</span>
            <span style={{
              fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
              background: pct >= 70 ? "#dcfce7" : pct >= 50 ? "#fef3c7" : "#fee2e2",
              color: scoreColor,
            }}>
              {pct}%
            </span>
          </div>
        </div>

        {/* Criteria bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {criteria.map(({ key, label, max, score }) => {
            const barPct = max > 0 ? (score / max) * 100 : 0;
            return (
              <div key={key}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{score} / {max}</span>
                </div>
                <div style={{ height: 7, background: "#e5e7eb", borderRadius: 4 }}>
                  <div style={{
                    height: "100%", borderRadius: 4, transition: "width 0.3s",
                    width: `${barPct}%`,
                    background: barPct >= 70 ? "#16a34a" : barPct >= 50 ? "#d97706" : "#ef4444",
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Strengths / Improvements */}
        {(strengths.length > 0 || improvements.length > 0) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {strengths.length > 0 && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#15803d", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
                  Strengths
                </div>
                <ul style={{ margin: 0, paddingLeft: 14, fontSize: 13, color: "#166534", lineHeight: 1.6 }}>
                  {strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {improvements.length > 0 && (
              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#c2410c", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
                  Areas to Improve
                </div>
                <ul style={{ margin: 0, paddingLeft: 14, fontSize: 13, color: "#9a3412", lineHeight: 1.6 }}>
                  {improvements.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Justification (resume only) */}
        {justification && (
          <div style={{ background: "rgba(255,255,255,0.8)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 13, color: "#374151", lineHeight: 1.65 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              AI Justification
            </div>
            {justification}
          </div>
        )}

        {/* Reviewer Notes */}
        <div style={{ background: "rgba(255,255,255,0.9)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Reviewer Notes
          </div>
          <textarea
            style={{
              width: "100%", minHeight: 80, resize: "vertical",
              padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)",
              background: isLocked ? "#f8fafc" : "#fff",
              fontSize: 13, lineHeight: 1.6, fontFamily: "inherit",
              outline: "none", boxSizing: "border-box", color: "#374151",
              cursor: isLocked ? "not-allowed" : "text",
            }}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Add notes or observations about these scores…"
            disabled={isLocked}
          />
        </div>
      </div>
    );
  }

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

        {/* ── STEP 1: REVIEW INFO & AI SCORES ────────────────────────────────── */}
        {step === 1 && (() => {
          const psAnswers    = applicant.answers.filter((a) => a.question !== "Resume Text");
          const resumeAnswer = applicant.answers.find((a) => a.question === "Resume Text");
          return (
            <div className="reviewer-stack">

              {/* Application Information */}
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

              {/* Personal Statement text */}
              {psAnswers.length > 0 && (
                <div className="reviewer-block">
                  <div className="reviewer-block-title">Personal Statement</div>
                  <div className="reviewer-stack" style={{ gap: 12 }}>
                    {psAnswers.map((a, i) => (
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

              {/* PS AI Scores */}
              {applicant.psScores && (
                <AiScoreBlock
                  title="AI Scores — Personal Statement"
                  overall={applicant.psScores.overall_score}
                  outOf={100}
                  criteria={PS_CRITERIA.map((c) => ({ ...c, score: (applicant.psScores![c.key] as number) || 0 }))}
                  strengths={applicant.psScores.strengths}
                  improvements={applicant.psScores.improvements}
                  notes={psAiNotes}
                  onNotesChange={setPsAiNotes}
                />
              )}

              {/* Resume text */}
              {resumeAnswer && (
                <div className="reviewer-block">
                  <div className="reviewer-block-title">Resume</div>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "rgba(255,255,255,0.7)", fontSize: 14 }}>
                    {resumeAnswer.answer || "Not provided"}
                  </div>
                </div>
              )}

              {/* Resume AI Scores */}
              {applicant.resumeScores && (
                <AiScoreBlock
                  title="AI Scores — Resume"
                  overall={applicant.resumeScores.overall_score}
                  outOf={180}
                  criteria={RESUME_CRITERIA.map((c) => ({ ...c, score: (applicant.resumeScores![c.key] as number) || 0 }))}
                  strengths={applicant.resumeScores.strengths}
                  improvements={applicant.resumeScores.improvements}
                  justification={applicant.resumeScores.justification}
                  notes={resumeAiNotes}
                  onNotesChange={setResumeAiNotes}
                />
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
          );
        })()}

        {/* ── STEP 2: PORTFOLIO REVIEW & RUBRIC ──────────────────────────────── */}
        {step === 2 && (
          <div className="reviewer-stack">
            {/* Portfolio display */}
            <div className="reviewer-block">
              <div className="reviewer-block-title">Portfolio</div>
              {applicant.portfolio ? (
                <>
                  <p className="reviewer-muted" style={{ marginBottom: 12 }}>
                    Review the portfolio materials below, then complete the rubric and add your notes.
                  </p>
                  {applicant.portfolio.items?.map((item, i) => (
                    <div key={i} style={{ marginBottom: 10 }}>
                      {item.title && (
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{item.title}</div>
                      )}
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
                </>
              ) : (
                <p className="reviewer-muted">
                  No portfolio was submitted by this applicant. Complete the rubric based on any
                  materials reviewed, or leave scores blank if not applicable.
                </p>
              )}
            </div>

            {/* Portfolio Rubric */}
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
                      placeholder="0–10"
                      disabled={isLocked}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Portfolio Notes */}
            <div className="reviewer-block">
              <div className="reviewer-block-title">Portfolio Notes</div>
              <p className="reviewer-muted" style={{ marginBottom: 10 }}>
                Record observations, impressions, or specific feedback about the portfolio.
              </p>
              <textarea
                className="reviewer-textarea"
                rows={5}
                value={portfolioNotes}
                onChange={(e) => setPortfolioNotes(e.target.value)}
                placeholder="Describe the quality, relevance, and standout elements of the portfolio…"
                disabled={isLocked}
              />
            </div>
          </div>
        )}

        {/* ── STEP 3: INTERVIEW QUESTIONS ─────────────────────────────────────── */}
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

        {/* ── STEP 4: INTERVIEW SCORING RUBRIC ────────────────────────────────── */}
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
                      placeholder="0–10"
                      disabled={isLocked}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: FINAL SCORE & DECISION ──────────────────────────────────── */}
        {step === 5 && (
          <div className="reviewer-stack">
            {/* Score breakdown */}
            <div className="reviewer-block reviewer-ai">
              <div className="reviewer-block-title">Score Summary</div>
              <div className="reviewer-rubric" style={{ gap: 10 }}>
                <div className="rubric-row">
                  <div className="rubric-left">
                    <div className="rubric-title">AI Score</div>
                    <div className="rubric-hint">System-generated score</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: "var(--primary)", minWidth: 60, textAlign: "right" }}>
                    {applicant.aiScore ?? "—"}<span style={{ fontWeight: 400, fontSize: 13 }}>/100</span>
                  </div>
                </div>
                {(() => {
                  const vals = Object.values(portfolioScores).map(Number).filter((n) => !isNaN(n) && n > 0);
                  const avg  = vals.length === 4 ? (vals.reduce((a, b) => a + b, 0) / 4).toFixed(1) : null;
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
                {(() => {
                  const vals = Object.values(interviewScores).map(Number).filter((n) => !isNaN(n) && n > 0);
                  const avg  = vals.length === 5 ? (vals.reduce((a, b) => a + b, 0) / 5).toFixed(1) : null;
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
              <div className="reviewer-final" style={{ marginTop: 16, textAlign: "center" }}>
                <div className="reviewer-final-score-num">{aggregatedScore}</div>
                <div className="reviewer-final-score-sub">Aggregate Score (0–100)</div>
              </div>
            </div>

            {/* Recommendation — strictly Yes or No */}
            <div className="reviewer-block">
              <div className="reviewer-block-title">Recommendation</div>
              <p className="reviewer-muted" style={{ marginBottom: 12 }}>
                Do you recommend this applicant for the scholarship?
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                {(["Yes", "No"] as const).map((opt) => {
                  const isSelected = recommendation === opt;
                  const isYes = opt === "Yes";
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={isLocked}
                      onClick={() => setRecommendation(opt)}
                      style={{
                        flex: 1, padding: "14px 0", borderRadius: 10, fontSize: 16, fontWeight: 800,
                        border: `2px solid ${isSelected ? (isYes ? "#16a34a" : "#dc2626") : "#e5e7eb"}`,
                        background: isSelected ? (isYes ? "#dcfce7" : "#fee2e2") : "#f8fafc",
                        color: isSelected ? (isYes ? "#15803d" : "#b91c1c") : "#94a3b8",
                        cursor: isLocked ? "not-allowed" : "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {isYes ? "✓ Yes" : "✗ No"}
                    </button>
                  );
                })}
              </div>
              {!recommendation && !isLocked && (
                <p style={{ marginTop: 8, fontSize: 13, color: "#92400e", fontWeight: 600 }}>
                  Please select Yes or No.
                </p>
              )}
            </div>

            {/* Evaluation Notes */}
            <div className="reviewer-block">
              <div className="reviewer-block-title">Evaluation Notes & Comments</div>
              <textarea
                className="reviewer-textarea"
                rows={8}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Provide your overall assessment, justification for your recommendation, and any notable observations from the interview…"
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
                  {recommendation && comments.trim().length === 0 && (
                    <span style={{ fontSize: 13, color: "#92400e", fontWeight: 600 }}>
                      Please add evaluation notes before submitting.
                    </span>
                  )}
                  <button
                    className="approve-btn"
                    type="button"
                    onClick={() => saveEvaluation("submitted")}
                    disabled={saving || !recommendation || comments.trim().length === 0}
                  >
                    {saving ? "Submitting…" : "Submit Evaluation"}
                  </button>
                </>
              )}
              {saveMsg && (
                <span style={{ fontSize: 13, color: saveMsg.includes("Failed") || saveMsg.includes("Please") ? "#ef4444" : "#16a34a", fontWeight: 600 }}>
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
