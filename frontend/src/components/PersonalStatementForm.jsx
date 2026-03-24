import { useState } from "react";
import { CheckCircle2, Circle, X } from "lucide-react";
import { scorePersonalStatement } from "../api/personalStatementApi";

export default function PersonalStatementForm() {
  const [values, setValues] = useState("");
  const [major, setMajor] = useState("");
  const [personality, setPersonality] = useState("");
  const [closing, setClosing] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getTotalWords = () => {
    const allText = [values, major, personality, closing].join(" ");
    return allText.split(/\s+/).filter(Boolean).length;
  };

  const wordCount = getTotalWords();
  const isOverLimit = wordCount > 1000;

  async function submit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setIsSubmitting(true);

    const data = {
      academic_goals: values,
      career_goals: major,
      leadership_experience: personality,
      personal_statement: [values, major, personality, closing]
        .filter(Boolean)
        .join("\n\n"),
    };

    try {
      const res = await scorePersonalStatement(data);
      setResult(res);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const sectionStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "14px",
    backgroundColor: "#fff",
  };

  const labelRowStyle = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px",
    fontWeight: 600,
    color: "#111827",
  };

  const textareaStyle = {
    width: "100%",
    minHeight: "150px",
    padding: "16px",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    resize: "vertical",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "Arial, sans-serif",
  };

  const cardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "24px",
    boxShadow: "0 1px 8px rgba(0,0,0,0.08)",
    padding: "32px",
  };

  const primaryButtonStyle = {
    backgroundColor: isSubmitting || isOverLimit ? "#94a3b8" : "#1A3175",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "12px 20px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: isSubmitting || isOverLimit ? "not-allowed" : "pointer",
  };

  const outlineButtonStyle = {
    backgroundColor: "white",
    color: "#1A3175",
    border: "1px solid #1A3175",
    borderRadius: "10px",
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  };

  return (
    <div style={{ maxWidth: "950px", margin: "0 auto", padding: "24px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ color: "#111827", marginBottom: "8px" }}>Personal Statement</h1>
        <p style={{ color: "#4b5563", margin: 0 }}>
          Fill in the sections below to structure your personal statement, then submit it for scoring.
        </p>
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={cardStyle}>
          <div style={{ marginBottom: "28px" }}>
            <h2 style={{ color: "#111827", marginBottom: "8px" }}>Structure Your Statement</h2>
            <p style={{ color: "#4b5563", margin: 0 }}>
              Complete all sections below. Your content will be combined and sent for evaluation.
            </p>
          </div>

          <div style={sectionStyle}>
            <div style={labelRowStyle}>
              {values ? (
                <CheckCircle2 size={20} color="#16a34a" />
              ) : (
                <Circle size={20} color="#9ca3af" />
              )}
              <span>Values & Future Goals</span>
            </div>
            <p style={{ color: "#4b5563", marginTop: 0, marginBottom: "12px" }}>
              Describe your long-term goals, values, and future direction.
            </p>
            <textarea
              style={textareaStyle}
              placeholder="Describe your long-term goals, values, and ultimate vision."
              value={values}
              onChange={(e) => setValues(e.target.value)}
            />
          </div>

          <div style={sectionStyle}>
            <div style={labelRowStyle}>
              {major ? (
                <CheckCircle2 size={20} color="#16a34a" />
              ) : (
                <Circle size={20} color="#9ca3af" />
              )}
              <span>Why This Major?</span>
            </div>
            <p style={{ color: "#4b5563", marginTop: 0, marginBottom: "12px" }}>
              Explain why you chose this major and how it supports your goals.
            </p>
            <textarea
              style={textareaStyle}
              placeholder="What drew you to this field of study? How does it align with your ambitions?"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
            />
          </div>

          <div style={sectionStyle}>
            <div style={labelRowStyle}>
              {personality ? (
                <CheckCircle2 size={20} color="#16a34a" />
              ) : (
                <Circle size={20} color="#9ca3af" />
              )}
              <span>Your Personality & Interests</span>
            </div>
            <p style={{ color: "#4b5563", marginTop: 0, marginBottom: "12px" }}>
              Share your interests, passions, and the qualities that make you unique.
            </p>
            <textarea
              style={textareaStyle}
              placeholder="What makes you unique? What are you passionate about?"
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
            />
          </div>

          <div style={sectionStyle}>
            <div style={labelRowStyle}>
              {closing ? (
                <CheckCircle2 size={20} color="#16a34a" />
              ) : (
                <Circle size={20} color="#9ca3af" />
              )}
              <span>Closing Summary</span>
            </div>
            <p style={{ color: "#4b5563", marginTop: 0, marginBottom: "12px" }}>
              End with a strong summary of why you stand out.
            </p>
            <textarea
              style={textareaStyle}
              placeholder="Summarize why you are a strong candidate and what you hope to contribute."
              value={closing}
              onChange={(e) => setClosing(e.target.value)}
            />
          </div>

          <div
            style={{
              marginTop: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ color: isOverLimit ? "#dc2626" : "#4b5563" }}>
              Word count: {wordCount} / 1000
              {isOverLimit ? " (exceeds limit)" : ""}
            </div>

            <button
              type="button"
              style={outlineButtonStyle}
              onClick={() => setIsPreviewOpen(true)}
            >
              Preview Statement
            </button>
          </div>

          {error && (
            <div
              style={{
                marginTop: "16px",
                padding: "16px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "10px",
              }}
            >
              <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p>
            </div>
          )}

          {result && (
            <div
              style={{
                marginTop: "16px",
                padding: "20px",
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "10px",
              }}
            >
              <p style={{ color: "#166534", marginTop: 0, marginBottom: "16px", fontWeight: 600 }}>
                ✓ Statement scored successfully.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { key: "interests_and_values", label: "Interests & Values" },
                  { key: "academic_commitment", label: "Academic Commitment" },
                  { key: "clarity_of_vision", label: "Clarity of Vision" },
                  { key: "organization", label: "Organization" },
                  { key: "language_quality", label: "Language Quality" },
                ].map(({ key, label }) => {
                  const score = result[key] ?? 0;
                  const pct = (score / 20) * 100;
                  return (
                    <div key={key}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "13px" }}>
                        <span style={{ color: "#374151" }}>{label}</span>
                        <span style={{ color: "#166534", fontWeight: 600 }}>{score} / 20</span>
                      </div>
                      <div style={{ height: "6px", backgroundColor: "#d1fae5", borderRadius: "4px" }}>
                        <div style={{ height: "100%", width: `${pct}%`, backgroundColor: "#16a34a", borderRadius: "4px" }} />
                      </div>
                    </div>
                  );
                })}
                <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #bbf7d0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, color: "#111827" }}>Overall Score</span>
                  <span style={{ fontWeight: 700, color: "#1A3175", fontSize: "18px" }}>
                    {result.overall_score ?? 0} / 100
                    <span style={{ fontSize: "14px", color: "#6b7280", marginLeft: "8px" }}>
                      ({result.grade_pct ?? 0}%)
                    </span>
                  </span>
                </div>

                {result.strengths?.length > 0 && (
                  <div style={{ marginTop: "16px" }}>
                    <p style={{ fontWeight: 600, color: "#166534", marginBottom: "8px", marginTop: 0 }}>Strengths</p>
                    <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
                      {result.strengths.map((s, i) => (
                        <li key={i} style={{ color: "#374151", fontSize: "13px" }}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.improvements?.length > 0 && (
                  <div style={{ marginTop: "12px" }}>
                    <p style={{ fontWeight: 600, color: "#92400e", marginBottom: "8px", marginTop: 0 }}>Areas to Improve</p>
                    <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
                      {result.improvements.map((s, i) => (
                        <li key={i} style={{ color: "#374151", fontSize: "13px" }}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            disabled={isSubmitting || isOverLimit}
            style={primaryButtonStyle}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>

      {isPreviewOpen && (
        <div
          onClick={() => setIsPreviewOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#fff",
              width: "100%",
              maxWidth: "800px",
              maxHeight: "80vh",
              overflowY: "auto",
              borderRadius: "20px",
              padding: "24px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3 style={{ margin: 0, color: "#111827" }}>Personal Statement Preview</h3>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {values && (
                <div>
                  <h4 style={{ color: "#111827", marginBottom: "8px" }}>Values & Future Goals</h4>
                  <p style={{ color: "#374151", whiteSpace: "pre-wrap", margin: 0 }}>{values}</p>
                </div>
              )}

              {major && (
                <div>
                  <h4 style={{ color: "#111827", marginBottom: "8px" }}>Why This Major?</h4>
                  <p style={{ color: "#374151", whiteSpace: "pre-wrap", margin: 0 }}>{major}</p>
                </div>
              )}

              {personality && (
                <div>
                  <h4 style={{ color: "#111827", marginBottom: "8px" }}>Personality & Interests</h4>
                  <p style={{ color: "#374151", whiteSpace: "pre-wrap", margin: 0 }}>{personality}</p>
                </div>
              )}

              {closing && (
                <div>
                  <h4 style={{ color: "#111827", marginBottom: "8px" }}>Closing Summary</h4>
                  <p style={{ color: "#374151", whiteSpace: "pre-wrap", margin: 0 }}>{closing}</p>
                </div>
              )}

              {!values && !major && !personality && !closing && (
                <p style={{ color: "#6b7280", textAlign: "center", padding: "24px 0", margin: 0 }}>
                  Start filling out the sections to preview your statement.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}