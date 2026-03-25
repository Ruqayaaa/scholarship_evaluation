import React, { useMemo, useState } from "react";
import type { ApplicationData } from "../application";
import { scorePersonalStatement, scoreResume } from "../api/personalStatementApi";
import { supabase } from "../lib/supabase";
import { NODE_API } from "../lib/api";

interface Step6Props {
  data: ApplicationData;
  onBack: () => void;
  onSubmitted: () => void;
}

export function Step6Review({ data, onBack, onSubmitted }: Step6Props) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState<
    null | "statement" | "resume" | "portfolio" | "documents" | "personal"
  >(null);

  const handleSubmit = async () => {
    if (!isConfirmed || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Submit personal statement for scoring + save to database
      const psData = {
        academic_goals: data.personalStatement.valuesGoals,
        career_goals: data.personalStatement.whyMajor,
        leadership_experience: data.personalStatement.interests,
        personal_statement: [
          data.personalStatement.valuesGoals,
          data.personalStatement.whyMajor,
          data.personalStatement.interests,
          data.personalStatement.summary,
        ]
          .filter(Boolean)
          .join("\n\n"),
      };
      await scorePersonalStatement(psData, data.personalInfo.fullName || undefined);

      // Submit resume for scoring + save to database
      const resumeParts: string[] = [];
      if (data.resume.education.length) {
        resumeParts.push(
          "Education:\n" +
            data.resume.education
              .map((e) => `${e.degree || ""} at ${e.institution || ""} (${e.startYear || ""}–${e.endYear || ""})`)
              .join("\n")
        );
      }
      if (data.resume.experience.length) {
        resumeParts.push(
          "Experience:\n" +
            data.resume.experience
              .map((x) => `${x.jobTitle || ""} at ${x.organization || ""} (${x.startDate || ""}–${x.endDate || ""})`)
              .join("\n")
        );
      }
      if (data.resume.skills.length) {
        resumeParts.push("Skills: " + data.resume.skills.join(", "));
      }
      if (data.resume.awards.length) {
        resumeParts.push(
          "Awards:\n" +
            data.resume.awards.map((a) => `${a.name || ""} (${a.year || ""})`).join("\n")
        );
      }
      if (data.resume.community.length) {
        resumeParts.push(
          "Community/Volunteer:\n" +
            data.resume.community
              .map((c) => `${c.role || ""} at ${c.organization || ""} (${c.startDate || ""}–${c.endDate || ""})`)
              .join("\n")
        );
      }
      const hasResumeData =
        resumeParts.length > 0 || data.resume.uploadedFile?.length > 0;
      if (hasResumeData) {
        await scoreResume(resumeParts.join("\n\n"));
      }

      // Upload portfolio file to Supabase Storage (non-fatal if bucket missing)
      if (data.portfolio.files.length > 0) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const file = data.portfolio.files[0];
            const path = `${session.user.id}/${Date.now()}_${file.name}`;
            const { error: uploadErr } = await supabase.storage
              .from("portfolios")
              .upload(path, file, { upsert: true });
            if (!uploadErr) {
              const { data: urlData } = supabase.storage.from("portfolios").getPublicUrl(path);
              await fetch(`${NODE_API}/applicants/submit/portfolio`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  applicantId: session.user.id,
                  portfolioUrl: urlData.publicUrl,
                  portfolioName: file.name,
                }),
              });
            }
          }
        } catch {
          // Portfolio upload is non-fatal — submission still succeeds
        }
      }

      onSubmitted();
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Submission failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = () => alert("Draft saved successfully!");

  const personalFields = useMemo(
    () => [
      ["Full Name", data.personalInfo.fullName],
      ["Email", data.personalInfo.email],
      ["Date of Birth", data.personalInfo.dateOfBirth],
      ["Country", data.personalInfo.country],
      ["Program / Major", data.personalInfo.program],
      ["University", data.personalInfo.university],
      ["GPA", data.personalInfo.gpa],
      ["Graduation Year", data.personalInfo.graduationYear],
      ["IELTS Overall Score", data.personalInfo.ieltsScore],
    ] as const,
    [data]
  );

  const hasTranscript = data.documents.transcript?.length > 0;
  const hasIelts = data.documents.ielts?.length > 0;

  const Section = ({
    title,
    right,
    children,
  }: {
    title: string;
    right?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div className="card" style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            aria-hidden
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#16a34a",
              boxShadow: "0 0 0 4px rgba(22,163,74,0.12)",
            }}
          />
          <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
        </div>
        {right}
      </div>

      {children}
    </div>
  );

  const KVGrid = ({ rows }: { rows: Array<[string, string]> }) => (
    <div
      className="step6-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 14,
      }}
    >
      {rows.map(([k, v]) => (
        <div
          key={k}
          style={{
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 12,
            background: "rgba(255,255,255,0.65)",
          }}
        >
          <div
            style={{
              color: "var(--muted)",
              fontSize: 12,
              fontWeight: 800,
              marginBottom: 4,
            }}
          >
            {k}
          </div>
          <div style={{ color: "var(--navy)", fontWeight: 800, lineHeight: 1.55 }}>
            {String(v || "").trim() ? v : "Not provided"}
          </div>
        </div>
      ))}
    </div>
  );

  const SmallFileList = ({ files }: { files: File[] }) => {
    if (!files || files.length === 0) {
      return <div style={{ color: "var(--muted)" }}>No files uploaded</div>;
    }
    return (
      <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8, color: "var(--navy)" }}>
        {files.map((f, idx) => (
          <li key={idx}>{f.name}</li>
        ))}
      </ul>
    );
  };

  const Modal = ({
    title,
    children,
    onClose,
  }: {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
  }) => (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal" style={{ maxWidth: 920 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 18 }}>{title}</div>
          <button type="button" className="ghost-btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div style={{ marginTop: 14 }}>{children}</div>
      </div>
    </div>
  );

  const EditBtn = ({ onClick }: { onClick: () => void }) => (
    <button type="button" className="ghost-btn" onClick={onClick}>
      View
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>
          Step 6 of 6 — Review Your Application
        </div>
        <div style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Make sure all information is correct before submitting.
        </div>
      </div>

      <Section title="Personal Information" right={<EditBtn onClick={() => setPreviewOpen("personal")} />}>
        <KVGrid rows={personalFields.map(([k, v]) => [k, v || ""])} />
      </Section>

      <Section title="Personal Statement" right={<EditBtn onClick={() => setPreviewOpen("statement")} />}>
        {data.personalStatement.uploadedFile?.length > 0 ? (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(37,99,235,0.25)",
              background: "rgba(37,99,235,0.08)",
              marginBottom: 12,
              color: "var(--navy)",
              fontWeight: 800,
            }}
          >
            Uploaded document: {data.personalStatement.uploadedFile[0].name}
          </div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <PreviewBlock label="Values & Goals" text={data.personalStatement.valuesGoals} />
          <PreviewBlock label="Why This Major" text={data.personalStatement.whyMajor} />
          <PreviewBlock label="Personality & Interests" text={data.personalStatement.interests} />
          <PreviewBlock label="Closing Summary" text={data.personalStatement.summary} />
        </div>
      </Section>

      <Section title="Resume / CV" right={<EditBtn onClick={() => setPreviewOpen("resume")} />}>
        {data.resume.uploadedFile?.length > 0 ? (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(37,99,235,0.25)",
              background: "rgba(37,99,235,0.08)",
              marginBottom: 12,
              color: "var(--navy)",
              fontWeight: 800,
            }}
          >
            Uploaded document: {data.resume.uploadedFile[0].name}
          </div>
        ) : null}

        <div
          className="step6-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 14,
          }}
        >
          <SummaryTile label="Education Entries" value={`${data.resume.education.length} institution(s)`} />
          <SummaryTile label="Work Experience" value={`${data.resume.experience.length} position(s)`} />
          <SummaryTile label="Awards & Achievements" value={`${data.resume.awards.length} award(s)`} />
          <SummaryTile label="Community / Volunteer Work" value={`${data.resume.community.length} contribution(s)`} />
          <div style={{ gridColumn: "1 / -1" }}>
            <SummaryTile
              label="Skills"
              value={data.resume.skills.length ? data.resume.skills.join(", ") : "None listed"}
            />
          </div>
        </div>
      </Section>

      <Section title="Portfolio" right={<EditBtn onClick={() => setPreviewOpen("portfolio")} />}>
        <SmallFileList files={data.portfolio.files} />
      </Section>

      <Section title="Documents" right={<EditBtn onClick={() => setPreviewOpen("documents")} />}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.65)",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Required Documents</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, color: "var(--navy)" }}>
              <DocLine
                ok={hasTranscript}
                label="Official Transcript"
                value={hasTranscript ? data.documents.transcript[0].name : "Not uploaded"}
              />
              <DocLine
                ok={hasIelts}
                label="IELTS TRF"
                value={hasIelts ? data.documents.ielts[0].name : "Not uploaded"}
              />
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.65)",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Optional Documents</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, color: "var(--navy)" }}>
              <DocLine
                ok={data.documents.cvOptional.length > 0}
                label="CV/Resume"
                value={data.documents.cvOptional.length > 0 ? data.documents.cvOptional[0].name : "Not uploaded"}
              />
              <DocLine
                ok={data.documents.statementOptional.length > 0}
                label="Personal Statement PDF"
                value={
                  data.documents.statementOptional.length > 0
                    ? data.documents.statementOptional[0].name
                    : "Not uploaded"
                }
              />
              <DocLine
                ok={data.documents.additional.length > 0}
                label="Additional Materials"
                value={`${data.documents.additional.length} file(s)`}
              />
            </div>
          </div>
        </div>
      </Section>

      <div className="card" style={{ width: "100%" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <input
            id="confirm"
            type="checkbox"
            checked={isConfirmed}
            onChange={(e) => setIsConfirmed(e.target.checked)}
            style={{ marginTop: 4, width: 18, height: 18 }}
          />
          <label htmlFor="confirm" style={{ cursor: "pointer", color: "var(--navy)", lineHeight: 1.6 }}>
            I confirm that all information provided is accurate and truthful. I acknowledge that my personal statement is my
            original work and that any false information may result in disqualification from the scholarship program.
          </label>
        </div>
      </div>

      {/* Submission error */}
      {submitError && (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            border: "1px solid rgba(220,38,38,0.3)",
            background: "rgba(220,38,38,0.07)",
            color: "#b91c1c",
            fontWeight: 700,
            lineHeight: 1.5,
          }}
        >
          {submitError}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <button type="button" className="ghost-btn" onClick={onBack} disabled={isSubmitting}>
          ← Back
        </button>

       

          <button type="button" className="ghost-btn" onClick={handleSaveDraft} disabled={isSubmitting}>
            Save Draft
          </button>

          <button
            type="button"
            className="primary-btn primary-btn-lg"
            onClick={handleSubmit}
            disabled={!isConfirmed || isSubmitting}
            style={
              !isConfirmed || isSubmitting
                ? { opacity: 0.65, cursor: "not-allowed", borderColor: "rgba(22,163,74,0.25)" }
                : { borderColor: "rgba(22,163,74,0.35)" }
            }
          >
            {isSubmitting ? "Submitting..." : "Submit Application"}
          </button>
        </div>
   

      {/* Modals */}
      {previewOpen === "personal" && (
        <Modal title="Personal Information" onClose={() => setPreviewOpen(null)}>
          <KVGrid rows={personalFields.map(([k, v]) => [k, v || ""])} />
        </Modal>
      )}

      {previewOpen === "statement" && (
        <Modal title="Personal Statement (Full)" onClose={() => setPreviewOpen(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <FullBlock title="Values & Goals" text={data.personalStatement.valuesGoals} />
            <FullBlock title="Why This Major" text={data.personalStatement.whyMajor} />
            <FullBlock title="Personality & Interests" text={data.personalStatement.interests} />
            <FullBlock title="Closing Summary" text={data.personalStatement.summary} />
          </div>
        </Modal>
      )}

      {previewOpen === "resume" && (
        <Modal title="Resume (Summary)" onClose={() => setPreviewOpen(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontWeight: 900 }}>Education</div>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
              {data.resume.education.map((e, idx) => (
                <li key={idx}>
                  {e.institution || "Institution"} — {e.degree || "Degree"} ({e.startYear || "—"}–{e.endYear || "—"})
                </li>
              ))}
            </ul>

            <div style={{ fontWeight: 900, marginTop: 8 }}>Experience</div>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
              {data.resume.experience.map((x, idx) => (
                <li key={idx}>
                  {x.jobTitle || "Role"} @ {x.organization || "Organization"} ({x.startDate || "—"}–{x.endDate || "—"})
                </li>
              ))}
            </ul>
          </div>
        </Modal>
      )}

      {previewOpen === "portfolio" && (
        <Modal title="Portfolio Files" onClose={() => setPreviewOpen(null)}>
          <SmallFileList files={data.portfolio.files} />
        </Modal>
      )}

      {previewOpen === "documents" && (
        <Modal title="Documents" onClose={() => setPreviewOpen(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Required</div>
              <SmallFileList files={data.documents.transcript} />
              <div style={{ height: 8 }} />
              <SmallFileList files={data.documents.ielts} />
            </div>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Optional</div>
              <SmallFileList files={data.documents.cvOptional} />
              <div style={{ height: 8 }} />
              <SmallFileList files={data.documents.statementOptional} />
              <div style={{ height: 8 }} />
              <div style={{ color: "var(--navy)" }}>
                Additional: {data.documents.additional.length} file(s)
              </div>
            </div>
          </div>
        </Modal>
      )}

      <style>{`
        @media (max-width: 900px) {
          .step6-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 12,
        background: "rgba(255,255,255,0.65)",
      }}
    >
      <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 800, marginBottom: 4 }}>{label}</div>
      <div style={{ color: "var(--navy)", fontWeight: 900, lineHeight: 1.55 }}>{value}</div>
    </div>
  );
}

function PreviewBlock({ label, text }: { label: string; text: string }) {
  if (!text) return null;
  const short = text.length > 170 ? text.slice(0, 170).trim() + "…" : text;

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 12,
        background: "rgba(255,255,255,0.65)",
      }}
    >
      <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 800, marginBottom: 6 }}>{label}</div>
      <div style={{ color: "var(--navy)", lineHeight: 1.7 }}>{short}</div>
    </div>
  );
}

function FullBlock({ title, text }: { title: string; text: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 12,
        background: "rgba(255,255,255,0.65)",
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 8 }}>{title}</div>
      <div style={{ whiteSpace: "pre-wrap", color: "var(--navy)", lineHeight: 1.75 }}>
        {text?.trim() ? text : "Not provided"}
      </div>
    </div>
  );
}

function DocLine({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        aria-hidden
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: ok ? "#16a34a" : "#cbd5e1",
          boxShadow: ok ? "0 0 0 4px rgba(22,163,74,0.12)" : "none",
        }}
      />
      <span style={{ fontWeight: 900, minWidth: 160 }}>{label}:</span>
      <span style={{ color: ok ? "var(--navy)" : "var(--muted)" }}>{value}</span>
    </div>
  );
}
