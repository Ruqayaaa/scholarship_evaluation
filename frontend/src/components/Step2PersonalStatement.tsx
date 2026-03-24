import { useMemo, useState } from "react";
import { FileUpload } from "./FileUpload";

interface Step2Props {
  data: {
    valuesGoals: string;
    whyMajor: string;
    interests: string;
    summary: string;
    uploadedFile: File[];
  };
  onUpdate: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
}

type SectionKey = "valuesGoals" | "whyMajor" | "interests" | "summary";

export function Step2PersonalStatement({ data, onUpdate, onNext, onBack }: Step2Props) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    valuesGoals: true,
    whyMajor: false,
    interests: false,
    summary: false,
  });

  const handleChange = (field: SectionKey, value: string) => {
    onUpdate({ ...data, [field]: value });
  };

  const wordCount = useMemo(() => {
    const textOnly = [data.valuesGoals, data.whyMajor, data.interests, data.summary].join(" ");
    return textOnly.split(/\s+/).filter(Boolean).length;
  }, [data.valuesGoals, data.whyMajor, data.interests, data.summary]);

  const isOverLimit = wordCount > 1000;

  const toggle = (k: SectionKey) => setOpenSections((p) => ({ ...p, [k]: !p[k] }));

  const handleSaveDraft = () => alert("Draft saved successfully!");

  const Section = ({
    k,
    title,
    example,
    placeholder,
    value,
  }: {
    k: SectionKey;
    title: string;
    example: string;
    placeholder: string;
    value: string;
  }) => {
    const done = String(value).trim().length > 0;

    return (
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 14,
          background: "rgba(255,255,255,0.96)",
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          onClick={() => toggle(k)}
          style={{
            width: "100%",
            textAlign: "left",
            border: "none",
            background: "transparent",
            padding: "14px 16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              aria-hidden
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: done ? "#16a34a" : "#cbd5e1",
                boxShadow: done ? "0 0 0 4px rgba(22,163,74,0.12)" : "none",
              }}
            />
            <span style={{ fontWeight: 900, color: "var(--navy)" }}>{title}</span>
          </div>

          <span style={{ color: "var(--muted)", fontWeight: 800 }}>
            {openSections[k] ? "−" : "+"}
          </span>
        </button>

        {openSections[k] && (
          <div style={{ padding: "0 16px 16px" }}>
            <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>
              <span style={{ fontWeight: 800 }}>Example:</span> {example}
            </div>

            <div className="input-wrap" style={{ alignItems: "stretch" }}>
              <textarea
                className="input"
                style={{ minHeight: 150, resize: "vertical" }}
                placeholder={placeholder}
                value={value}
                onChange={(e) => handleChange(k, e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  const UploadStatus = () => {
    const hasFile = data.uploadedFile?.length > 0;

    return (
      <div
        style={{
          marginTop: 12,
          padding: 14,
          borderRadius: 12,
          border: `1px solid ${hasFile ? "rgba(22,163,74,0.25)" : "rgba(245,158,11,0.28)"}`,
          background: hasFile ? "rgba(22,163,74,0.08)" : "rgba(245,158,11,0.10)",
          color: hasFile ? "#166534" : "#92400e",
          fontWeight: 700,
          lineHeight: 1.5,
        }}
      >
        {hasFile
          ? "✓ Document uploaded successfully. Now complete the validation fields below to structure your statement."
          : "⚠ Please upload your personal statement document to proceed with validation."}
      </div>
    );
  };

  const PreviewModal = () => (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal" style={{ maxWidth: 860 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Personal Statement Preview</div>
          <button type="button" className="ghost-btn" onClick={() => setIsPreviewOpen(false)}>
            Close
          </button>
        </div>

        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 16 }}>
          {data.valuesGoals && (
            <div>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Values & Future Goals</div>
              <div style={{ whiteSpace: "pre-wrap", color: "var(--navy)", lineHeight: 1.7 }}>
                {data.valuesGoals}
              </div>
            </div>
          )}

          {data.whyMajor && (
            <div>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Why This Major?</div>
              <div style={{ whiteSpace: "pre-wrap", color: "var(--navy)", lineHeight: 1.7 }}>
                {data.whyMajor}
              </div>
            </div>
          )}

          {data.interests && (
            <div>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Personal Interests & Personality</div>
              <div style={{ whiteSpace: "pre-wrap", color: "var(--navy)", lineHeight: 1.7 }}>
                {data.interests}
              </div>
            </div>
          )}

          {data.summary && (
            <div>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Summary & Closing Thoughts</div>
              <div style={{ whiteSpace: "pre-wrap", color: "var(--navy)", lineHeight: 1.7 }}>
                {data.summary}
              </div>
            </div>
          )}

          {!data.valuesGoals && !data.whyMajor && !data.interests && !data.summary && (
            <div style={{ color: "var(--muted)", textAlign: "center", padding: "22px 0" }}>
              Start filling out the sections to preview your statement.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Header */}
      <div>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>
          Step 2 of 6 — Personal Statement
        </div>
        <div style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Upload your personal statement document, then validate and structure the content in the fields below.
        </div>
      </div>

      {/* 1) Upload */}
      <div className="card" style={{ width: "100%" }}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>
          1. Upload Your Personal Statement
        </div>
        <div style={{ color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>
          Upload your personal statement document (PDF or Word). This is required for processing.
        </div>

        <FileUpload
          label="Personal Statement Document (Required)"
          description="Upload a PDF or Word document containing your personal statement. After uploading, you'll validate the content in the structured fields below."
          acceptedFormats=".pdf,.docx,.doc"
          maxSize={10}
          multiple={false}
          files={data.uploadedFile}
          onFilesChange={(files) => onUpdate({ ...data, uploadedFile: files })}
        />

        <UploadStatus />
      </div>

      {/* 2) Validate */}
      <div className="card" style={{ width: "100%" }}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>
          2. Validate & Structure Your Statement
        </div>
        <div style={{ color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>
          Review your uploaded document and fill in the fields below to validate and structure your personal statement.
          All sections are required.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Section
            k="valuesGoals"
            title="Values & Future Goals"
            example='“My long-term vision is to become a leader in cybersecurity, protecting digital infrastructure across Bahrain.”'
            placeholder="Describe your long-term goals, values, and ultimate vision. What drives you? What do you hope to achieve in your career and life?"
            value={data.valuesGoals}
          />

          <Section
            k="whyMajor"
            title="Why This Major?"
            example="Explain how your chosen major supports your ambitions."
            placeholder="What drew you to this field of study? How does it align with your goals and aspirations?"
            value={data.whyMajor}
          />

          <Section
            k="interests"
            title="Your Personality & Interests"
            example="Show who you are: interests, hobbies, passions that shaped your academic path."
            placeholder="What makes you unique? What are you passionate about outside academics? How have your interests shaped your journey?"
            value={data.interests}
          />

          <Section
            k="summary"
            title="Closing Summary"
            example="Summarize why you stand out and what you can offer the AUBH community."
            placeholder="Why should AUBH invest in your future? What will you contribute to the university and the broader community?"
            value={data.summary}
          />
        </div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontWeight: 800, color: isOverLimit ? "#b91c1c" : "var(--muted)" }}>
            Word count: {wordCount} / 1000 {isOverLimit ? "(exceeds limit)" : ""}
          </div>

          <button
            type="button"
            className="ghost-btn"
            onClick={() => setIsPreviewOpen(true)}
            style={{ borderColor: "rgba(37, 99, 235, 0.35)" }}
          >
            Preview Statement
          </button>
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <button type="button" className="ghost-btn" onClick={onBack}>
          ← Back
        </button>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" className="ghost-btn" onClick={handleSaveDraft}>
            Save Draft
          </button>

          <button
            type="button"
            className="primary-btn primary-btn-lg"
            onClick={onNext}
            disabled={isOverLimit}
            style={isOverLimit ? { opacity: 0.65, cursor: "not-allowed" } : undefined}
          >
            Next →
          </button>
        </div>
      </div>

      {isPreviewOpen && <PreviewModal />}

      <style>{`
        @media (max-width: 900px) {
          .card { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
