import { useState } from "react";
import { CheckCircle2, Circle, X } from "lucide-react";
import { scorePersonalStatement } from "../api/personalStatementApi";
import OcrUploader from "./OcrUploader";

// Distribute extracted OCR text across the 4 sections by splitting on paragraphs
function distributeText(raw) {
  const paragraphs = raw
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return ["", "", "", ""];
  if (paragraphs.length === 1) return [paragraphs[0], "", "", ""];

  const quarter = Math.ceil(paragraphs.length / 4);
  const chunks = [
    paragraphs.slice(0, quarter),
    paragraphs.slice(quarter, quarter * 2),
    paragraphs.slice(quarter * 2, quarter * 3),
    paragraphs.slice(quarter * 3),
  ];
  return chunks.map((c) => c.join("\n\n"));
}

export default function PersonalStatementForm() {
  const [interestsAndValues, setInterestsAndValues] = useState("");
  const [academicCommitment, setAcademicCommitment] = useState("");
  const [clarityOfVision, setClarityOfVision] = useState("");
  const [closing, setClosing] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sections = [interestsAndValues, academicCommitment, clarityOfVision, closing];

  const getTotalWords = () =>
    sections.join(" ").split(/\s+/).filter(Boolean).length;

  const wordCount = getTotalWords();
  const isOverLimit = wordCount > 1000;

  function handleOcrExtract(text) {
    const [s1, s2, s3, s4] = distributeText(text);
    setInterestsAndValues(s1);
    setAcademicCommitment(s2);
    setClarityOfVision(s3);
    setClosing(s4);
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setIsSubmitting(true);

    const data = {
      academic_goals: academicCommitment,
      career_goals: clarityOfVision,
      leadership_experience: interestsAndValues,
      personal_statement: sections.filter(Boolean).join("\n\n"),
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

  const formSections = [
    {
      key: "interests_and_values",
      label: "Interests & Values",
      hint: "Describe your personal interests, passions, and core values that drive you.",
      placeholder: "What topics, activities, or causes are you passionate about? What values guide your decisions and actions?",
      value: interestsAndValues,
      setter: setInterestsAndValues,
    },
    {
      key: "academic_commitment",
      label: "Academic Commitment",
      hint: "Describe your academic dedication, achievements, and scholarly pursuits.",
      placeholder: "Highlight your academic achievements, study habits, intellectual curiosity, and commitment to learning in your field.",
      value: academicCommitment,
      setter: setAcademicCommitment,
    },
    {
      key: "clarity_of_vision",
      label: "Clarity of Vision",
      hint: "Explain your clear vision for your future and how this program fits.",
      placeholder: "Where do you see yourself in 5–10 years? How does this program prepare you for that path? What specific goals are you working toward?",
      value: clarityOfVision,
      setter: setClarityOfVision,
    },
    {
      key: "closing",
      label: "Closing Summary",
      hint: "End with a strong, well-organized summary of why you are an ideal candidate.",
      placeholder: "Summarize what makes you stand out, what you will contribute, and why you are confident in your application.",
      value: closing,
      setter: setClosing,
    },
  ];

  return (
    <div style={{ maxWidth: "950px", margin: "0 auto", padding: "24px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ color: "#111827", marginBottom: "8px" }}>Personal Statement</h1>
        <p style={{ color: "#4b5563", margin: 0 }}>
          Fill in each section below, or upload a document to extract your text automatically.
          Your statement is scored on: Interests & Values, Academic Commitment, Clarity of Vision,
          Organization, and Language Quality.
        </p>
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={cardStyle}>
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ color: "#111827", marginBottom: "8px" }}>Structure Your Statement</h2>
            <p style={{ color: "#4b5563", margin: "0 0 16px" }}>
              Complete all sections. Your content will be combined and evaluated by AI.
            </p>

            {/* OCR Upload */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "16px",
                padding: "16px 20px",
                backgroundColor: "#f8faff",
                border: "1.5px dashed #93a8e8",
                borderRadius: "12px",
              }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 4px", fontWeight: 600, color: "#1A3175", fontSize: "14px" }}>
                  Have an existing personal statement?
                </p>
                <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#4b5563" }}>
                  Upload an image or PDF — text will be extracted and distributed across the sections below for you to edit.
                </p>
                <OcrUploader
                  onExtract={handleOcrExtract}
                  buttonLabel="Upload & Extract Text"
                />
              </div>
            </div>
          </div>

          {formSections.map(({ key, label, hint, placeholder, value, setter }) => (
            <div key={key} style={sectionStyle}>
              <div style={labelRowStyle}>
                {value ? (
                  <CheckCircle2 size={20} color="#16a34a" />
                ) : (
                  <Circle size={20} color="#9ca3af" />
                )}
                <span>{label}</span>
              </div>
              <p style={{ color: "#4b5563", marginTop: 0, marginBottom: "12px", fontSize: "14px" }}>
                {hint}
              </p>
              <textarea
                style={textareaStyle}
                placeholder={placeholder}
                value={value}
                onChange={(e) => setter(e.target.value)}
              />
            </div>
          ))}

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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, color: "#111827" }}>Personal Statement Preview</h3>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {formSections.map(({ key, label, value }) =>
                value ? (
                  <div key={key}>
                    <h4 style={{ color: "#111827", marginBottom: "8px" }}>{label}</h4>
                    <p style={{ color: "#374151", whiteSpace: "pre-wrap", margin: 0 }}>{value}</p>
                  </div>
                ) : null
              )}

              {sections.every((s) => !s) && (
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
