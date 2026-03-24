import React from "react";
import { FileUpload } from "./FileUpload";

interface Step3Props {
  data: {
    education: Array<{
      id: string;
      institution: string;
      degree: string;
      startYear: string;
      endYear: string;
      gpa: string;
    }>;
    experience: Array<{
      id: string;
      jobTitle: string;
      organization: string;
      startDate: string;
      endDate: string;
      responsibilities: string;
    }>;
    skills: string[];
    awards: Array<{
      id: string;
      name: string;
      year: string;
      description: string;
    }>;
    community: Array<{
      id: string;
      organization: string;
      role: string;
      startDate: string;
      endDate: string;
      description: string;
    }>;
    uploadedFile: File[];
  };
  onUpdate: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
}

function UploadStatus({ hasFile }: { hasFile: boolean }) {
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
        ? "✓ Resume uploaded successfully. Now complete the validation fields below to structure your information."
        : "⚠ Please upload your resume/CV document to proceed with validation."}
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  onAdd,
  addLabel,
}: {
  title: string;
  subtitle: string;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
      <div>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>{title}</div>
        <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>{subtitle}</div>
      </div>
      <button type="button" className="ghost-btn" onClick={onAdd}>
        + {addLabel}
      </button>
    </div>
  );
}

function EntryCard({
  title,
  canRemove,
  onRemove,
  children,
}: {
  title: string;
  canRemove: boolean;
  onRemove?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: 16,
        border: "1px solid var(--border)",
        borderRadius: 14,
        background: "rgba(255,255,255,0.70)",
        boxShadow: "0 6px 16px rgba(15,23,42,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontWeight: 800, color: "var(--navy)" }}>{title}</div>
        {canRemove && (
          <button
            type="button"
            className="ghost-btn"
            onClick={onRemove}
            style={{ borderColor: "rgba(239,68,68,0.30)", color: "#b91c1c" }}
            title="Remove"
          >
            Remove
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function TwoColGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="step3-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
      {children}
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint ? <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>{hint}</div> : null}
    </div>
  );
}

export function Step3Resume({ data, onUpdate, onNext, onBack }: Step3Props) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => String(currentYear - i + 5));

  type ListKey = "education" | "experience" | "awards" | "community";

  function listAdd(key: ListKey, defaults: object) {
    onUpdate({ ...data, [key]: [...data[key], { id: Date.now().toString(), ...defaults }] });
  }
  function listRemove(key: ListKey, id: string) {
    if (data[key].length > 1) onUpdate({ ...data, [key]: data[key].filter((x: any) => x.id !== id) });
  }
  function listUpdate(key: ListKey, id: string, field: string, value: string) {
    onUpdate({ ...data, [key]: data[key].map((x: any) => x.id === id ? { ...x, [field]: value } : x) });
  }

  const addSkill = (skill: string) => {
    if (skill && !data.skills.includes(skill)) onUpdate({ ...data, skills: [...data.skills, skill] });
  };
  const removeSkill = (skill: string) => {
    onUpdate({ ...data, skills: data.skills.filter((s) => s !== skill) });
  };

  const handleSaveDraft = () => alert("Draft saved successfully!");

  const hasFile = data.uploadedFile?.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Header */}
      <div>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>Step 3 of 6 — Resume / CV</div>
        <div style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Upload your resume/CV document, then validate and structure the information in the fields below.
        </div>
      </div>

      {/* 1) Upload */}
      <div className="card" style={{ width: "100%" }}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>1. Upload Your Resume / CV</div>
        <div style={{ color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>
          Upload your resume or CV document (PDF or Word). This is required for processing.
        </div>

        <FileUpload
          label="Resume / CV Document (Required)"
          description="Upload a PDF or Word document containing your resume. After uploading, you'll validate the information in the structured fields below."
          acceptedFormats=".pdf,.docx,.doc"
          maxSize={10}
          multiple={false}
          files={data.uploadedFile}
          onFilesChange={(files) => onUpdate({ ...data, uploadedFile: files })}
        />

        <UploadStatus hasFile={hasFile} />
      </div>

      {/* 2) Validate */}
      <div className="card" style={{ width: "100%" }}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>2. Validate & Structure Your Resume</div>
        <div style={{ color: "var(--muted)", lineHeight: 1.6, marginBottom: 16 }}>
          Review your uploaded document and fill in the fields below to validate and structure your resume.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {/* Education */}
          <div>
            <SectionHeader
              title="Education"
              subtitle="Example: BIBF — Diploma in Business Studies (2020–2022)"
              onAdd={() => listAdd("education", { institution: "", degree: "", startYear: "", endYear: "", gpa: "" })}
              addLabel="Add Education"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.education.map((edu, idx) => (
                <EntryCard key={edu.id} title={`Entry ${idx + 1}`} canRemove={data.education.length > 1} onRemove={() => listRemove("education", edu.id)}>
                  <TwoColGrid>
                    <Field id={`edu_inst_${edu.id}`} label="Institution">
                      <div className="input-wrap">
                        <input id={`edu_inst_${edu.id}`} className="input" placeholder="Institution name" value={edu.institution} onChange={(e) => listUpdate("education", edu.id, "institution", e.target.value)} />
                      </div>
                    </Field>
                    <Field id={`edu_degree_${edu.id}`} label="Degree / Program">
                      <div className="input-wrap">
                        <input id={`edu_degree_${edu.id}`} className="input" placeholder="Degree / Program" value={edu.degree} onChange={(e) => listUpdate("education", edu.id, "degree", e.target.value)} />
                      </div>
                    </Field>
                    <Field id={`edu_start_${edu.id}`} label="Start year">
                      <div className="input-wrap">
                        <select id={`edu_start_${edu.id}`} className="input" value={edu.startYear} onChange={(e) => listUpdate("education", edu.id, "startYear", e.target.value)}>
                          <option value="" disabled>Select year</option>
                          {years.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    </Field>
                    <Field id={`edu_end_${edu.id}`} label="End year">
                      <div className="input-wrap">
                        <select id={`edu_end_${edu.id}`} className="input" value={edu.endYear} onChange={(e) => listUpdate("education", edu.id, "endYear", e.target.value)}>
                          <option value="" disabled>Select year</option>
                          <option value="present">Present</option>
                          {years.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    </Field>
                    <Field id={`edu_gpa_${edu.id}`} label="GPA" hint="e.g., 3.8 or 90%">
                      <div className="input-wrap">
                        <input id={`edu_gpa_${edu.id}`} className="input" placeholder="GPA (e.g., 3.8 or 90%)" value={edu.gpa} onChange={(e) => listUpdate("education", edu.id, "gpa", e.target.value)} />
                      </div>
                    </Field>
                    <div />
                  </TwoColGrid>
                </EntryCard>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18 }}>
            <SectionHeader
              title="Work Experience"
              subtitle="Example: Marketing Intern — Completed social media reports, created presentations…"
              onAdd={() => listAdd("experience", { jobTitle: "", organization: "", startDate: "", endDate: "", responsibilities: "" })}
              addLabel="Add Experience"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.experience.map((exp, idx) => (
                <EntryCard key={exp.id} title={`Experience ${idx + 1}`} canRemove={data.experience.length > 1} onRemove={() => listRemove("experience", exp.id)}>
                  <TwoColGrid>
                    <Field id={`exp_title_${exp.id}`} label="Job title">
                      <div className="input-wrap">
                        <input id={`exp_title_${exp.id}`} className="input" placeholder="Job title" value={exp.jobTitle} onChange={(e) => listUpdate("experience", exp.id, "jobTitle", e.target.value)} />
                      </div>
                    </Field>
                    <Field id={`exp_org_${exp.id}`} label="Organization">
                      <div className="input-wrap">
                        <input id={`exp_org_${exp.id}`} className="input" placeholder="Organization" value={exp.organization} onChange={(e) => listUpdate("experience", exp.id, "organization", e.target.value)} />
                      </div>
                    </Field>
                    <Field id={`exp_start_${exp.id}`} label="Start date">
                      <div className="input-wrap">
                        <input id={`exp_start_${exp.id}`} className="input" type="month" value={exp.startDate} onChange={(e) => listUpdate("experience", exp.id, "startDate", e.target.value)} />
                      </div>
                    </Field>
                    <Field id={`exp_end_${exp.id}`} label="End date">
                      <div className="input-wrap">
                        <input id={`exp_end_${exp.id}`} className="input" type="month" value={exp.endDate} onChange={(e) => listUpdate("experience", exp.id, "endDate", e.target.value)} />
                      </div>
                    </Field>
                  </TwoColGrid>
                  <Field id={`exp_resp_${exp.id}`} label="Key responsibilities" hint="Tip: write one bullet per line">
                    <div className="input-wrap" style={{ alignItems: "stretch" }}>
                      <textarea
                        id={`exp_resp_${exp.id}`}
                        className="input"
                        style={{ minHeight: 110, resize: "vertical" }}
                        placeholder={"One per line:\n• Developed data pipeline processing 1M+ records\n• Improved system efficiency by 40%\n• Led team of 5 engineers"}
                        value={exp.responsibilities}
                        onChange={(e) => listUpdate("experience", exp.id, "responsibilities", e.target.value)}
                      />
                    </div>
                  </Field>
                </EntryCard>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Skills & Technologies</div>
            <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
              Examples: Leadership, Teamwork, Python, Adobe Illustrator
            </div>
            <SkillsInput skills={data.skills} onAdd={addSkill} onRemove={removeSkill} />
          </div>

          {/* Awards */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18 }}>
            <SectionHeader
              title="Awards & Achievements"
              subtitle="Example: Best Capstone Award 2023"
              onAdd={() => listAdd("awards", { name: "", year: "", description: "" })}
              addLabel="Add Award"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.awards.map((award, idx) => (
                <EntryCard key={award.id} title={`Award ${idx + 1}`} canRemove={data.awards.length > 1} onRemove={() => listRemove("awards", award.id)}>
                  <TwoColGrid>
                    <Field id={`award_name_${award.id}`} label="Award name">
                      <div className="input-wrap">
                        <input id={`award_name_${award.id}`} className="input" placeholder="Award name" value={award.name} onChange={(e) => listUpdate("awards", award.id, "name", e.target.value)} />
                      </div>
                    </Field>
                    <Field id={`award_year_${award.id}`} label="Year">
                      <div className="input-wrap">
                        <input id={`award_year_${award.id}`} className="input" type="number" placeholder="Year" value={award.year} onChange={(e) => listUpdate("awards", award.id, "year", e.target.value)} />
                      </div>
                    </Field>
                  </TwoColGrid>
                  <Field id={`award_desc_${award.id}`} label="Short description">
                    <div className="input-wrap">
                      <input id={`award_desc_${award.id}`} className="input" placeholder="Short description" value={award.description} onChange={(e) => listUpdate("awards", award.id, "description", e.target.value)} />
                    </div>
                  </Field>
                </EntryCard>
              ))}
            </div>
          </div>

          {/* Community */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18 }}>
            <SectionHeader
              title="Community / Volunteer Work"
              subtitle="Example: Bahrain Red Crescent — assisted in donation drives and logistics"
              onAdd={() => listAdd("community", { organization: "", role: "", startDate: "", endDate: "", description: "" })}
              addLabel="Add Community Work"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.community.map((comm, idx) => (
                <EntryCard key={comm.id} title={`Entry ${idx + 1}`} canRemove={data.community.length > 1} onRemove={() => listRemove("community", comm.id)}>
                  <TwoColGrid>
                    <Field id={`comm_org_${comm.id}`} label="Organization">
                      <div className="input-wrap">
                        <input id={`comm_org_${comm.id}`} className="input" placeholder="Organization" value={comm.organization} onChange={(e) => listUpdate("community", comm.id, "organization", e.target.value)} />
                      </div>
                    </Field>
                    <Field id={`comm_role_${comm.id}`} label="Role">
                      <div className="input-wrap">
                        <input id={`comm_role_${comm.id}`} className="input" placeholder="Role" value={comm.role} onChange={(e) => listUpdate("community", comm.id, "role", e.target.value)} />
                      </div>
                    </Field>
                    <Field id={`comm_start_${comm.id}`} label="Start date">
                      <div className="input-wrap">
                        <input id={`comm_start_${comm.id}`} className="input" type="month" value={comm.startDate} onChange={(e) => listUpdate("community", comm.id, "startDate", e.target.value)} />
                      </div>
                    </Field>
                    <Field id={`comm_end_${comm.id}`} label="End date">
                      <div className="input-wrap">
                        <input id={`comm_end_${comm.id}`} className="input" type="month" value={comm.endDate} onChange={(e) => listUpdate("community", comm.id, "endDate", e.target.value)} />
                      </div>
                    </Field>
                  </TwoColGrid>
                  <Field id={`comm_desc_${comm.id}`} label="Description of contribution">
                    <div className="input-wrap" style={{ alignItems: "stretch" }}>
                      <textarea
                        id={`comm_desc_${comm.id}`}
                        className="input"
                        style={{ minHeight: 110, resize: "vertical" }}
                        placeholder="Describe your contribution (what you did, impact, outcomes)"
                        value={comm.description}
                        onChange={(e) => listUpdate("community", comm.id, "description", e.target.value)}
                      />
                    </div>
                  </Field>
                </EntryCard>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <button type="button" className="ghost-btn" onClick={onBack}>
          ← Back
        </button>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" className="ghost-btn" onClick={handleSaveDraft}>
            Save Draft
          </button>

          <button type="button" className="primary-btn primary-btn-lg" onClick={onNext}>
            Next →
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .step3-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// Skills Input Component (unchanged)
function SkillsInput({
  skills,
  onAdd,
  onRemove,
}: {
  skills: string[];
  onAdd: (skill: string) => void;
  onRemove: (skill: string) => void;
}) {
  const [inputValue, setInputValue] = React.useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      onAdd(inputValue.trim());
      setInputValue("");
    } else if (e.key === "Backspace" && !inputValue && skills.length > 0) {
      onRemove(skills[skills.length - 1]);
    }
  };

  return (
    <div
      style={{
        padding: 16,
        border: "1px solid var(--border)",
        borderRadius: 14,
        background: "rgba(255,255,255,0.70)",
        boxShadow: "0 6px 16px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {skills.map((skill) => (
          <span
            key={skill}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--blue)",
              color: "white",
              padding: "8px 10px",
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            {skill}
            <button
              type="button"
              onClick={() => onRemove(skill)}
              style={{
                border: "none",
                background: "rgba(255,255,255,0.18)",
                color: "white",
                borderRadius: 999,
                cursor: "pointer",
                width: 22,
                height: 22,
                display: "grid",
                placeItems: "center",
                fontWeight: 900,
              }}
              title="Remove"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="input-wrap">
        <input
          className="input"
          placeholder="Type a skill and press Enter (e.g., Python, Leadership, Problem Solving)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>
        Press Enter to add • Backspace to remove last tag
      </div>
    </div>
  );
}
