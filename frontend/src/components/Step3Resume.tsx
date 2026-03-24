import React, { useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import Tesseract from "tesseract.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

interface EducationItem { id: string; institution: string; degree: string; startYear: string; endYear: string; gpa: string; }
interface ExperienceItem { id: string; jobTitle: string; organization: string; startDate: string; endDate: string; responsibilities: string; }
interface AwardItem { id: string; name: string; year: string; description: string; }
interface CommunityItem { id: string; organization: string; role: string; startDate: string; endDate: string; description: string; }
interface LeadershipItem { id: string; role: string; organization: string; startDate: string; endDate: string; description: string; }

interface Step3Props {
  data: {
    education: EducationItem[];
    experience: ExperienceItem[];
    skills: string[];
    awards: AwardItem[];
    community: CommunityItem[];
    leadership: LeadershipItem[];
    uploadedFile: File[];
  };
  onUpdate: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
}

// ── OCR helpers ──────────────────────────────────────────────────────────────

async function extractPdfText(file: File, onProgress: (p: number) => void): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = (content.items as any[])
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    fullText += pageText + "\n\n";
    onProgress(i / pdf.numPages);
  }
  return fullText.trim();
}

async function extractImageText(file: File, onProgress: (p: number) => void): Promise<string> {
  const result = await Tesseract.recognize(file, "eng", {
    logger: (m: any) => { if (m.status === "recognizing text") onProgress(m.progress); },
  });
  return result.data.text.trim();
}

const SECTION_HEADERS: { regex: RegExp; key: string }[] = [
  { regex: /^(EDUCATION|ACADEMIC|ACADEMICS)\b/i,                   key: "education" },
  { regex: /^(EXPERIENCE|WORK|RESEARCH|INTERNSHIP|EMPLOYMENT)\b/i, key: "experience" },
  { regex: /^(SKILLS?|CERTIFICATIONS?|TECHNOLOGIES)\b/i,           key: "skills" },
  { regex: /^(AWARDS?|RECOGNITION|HONORS?|ACHIEVEMENTS?)\b/i,      key: "awards" },
  { regex: /^(COMMUNITY|VOLUNTEER|SERVICE|VOLUNTEERING)\b/i,       key: "community" },
  { regex: /^(LEADERSHIP|EXTRACURRICULAR|ACTIVITIES|CLUBS?)\b/i,   key: "leadership" },
];

function parseResumeText(raw: string): Record<string, string[]> {
  const lines = raw.split("\n");
  const sections: Record<string, string[]> = {};
  let currentKey: string | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = SECTION_HEADERS.find((h) => h.regex.test(trimmed));
    if (match) {
      currentKey = match.key;
      if (!sections[currentKey]) sections[currentKey] = [];
    } else if (currentKey) {
      sections[currentKey].push(trimmed);
    }
  }
  return sections;
}

// ── Reusable sub-components ──────────────────────────────────────────────────

function SectionHeader({ title, subtitle, onAdd, addLabel }: { title: string; subtitle: string; onAdd: () => void; addLabel: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
      <div>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>{title}</div>
        <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>{subtitle}</div>
      </div>
      <button type="button" className="ghost-btn" onClick={onAdd}>+ {addLabel}</button>
    </div>
  );
}

function EntryCard({ title, canRemove, onRemove, children }: { title: string; canRemove: boolean; onRemove?: () => void; children: React.ReactNode }) {
  return (
    <div style={{ padding: 16, border: "1px solid var(--border)", borderRadius: 14, background: "rgba(255,255,255,0.70)", boxShadow: "0 6px 16px rgba(15,23,42,0.06)", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontWeight: 800, color: "var(--navy)" }}>{title}</div>
        {canRemove && <button type="button" className="ghost-btn" onClick={onRemove} style={{ borderColor: "rgba(239,68,68,0.30)", color: "#b91c1c" }}>Remove</button>}
      </div>
      {children}
    </div>
  );
}

function TwoColGrid({ children }: { children: React.ReactNode }) {
  return <div className="step3-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>{children}</div>;
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      {children}
      {hint ? <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>{hint}</div> : null}
    </div>
  );
}

function SkillsInput({ skills, onAdd, onRemove }: { skills: string[]; onAdd: (s: string) => void; onRemove: (s: string) => void }) {
  const [inputValue, setInputValue] = React.useState("");
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) { e.preventDefault(); onAdd(inputValue.trim()); setInputValue(""); }
    else if (e.key === "Backspace" && !inputValue && skills.length > 0) { onRemove(skills[skills.length - 1]); }
  };
  return (
    <div style={{ padding: 16, border: "1px solid var(--border)", borderRadius: 14, background: "rgba(255,255,255,0.70)", boxShadow: "0 6px 16px rgba(15,23,42,0.06)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {skills.map((skill) => (
          <span key={skill} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--blue)", color: "white", padding: "8px 10px", borderRadius: 12, fontWeight: 800, fontSize: 13 }}>
            {skill}
            <button type="button" onClick={() => onRemove(skill)} style={{ border: "none", background: "rgba(255,255,255,0.18)", color: "white", borderRadius: 999, cursor: "pointer", width: 22, height: 22, display: "grid", placeItems: "center", fontWeight: 900 }}>×</button>
          </span>
        ))}
      </div>
      <div className="input-wrap">
        <input className="input" placeholder="Type a skill and press Enter (e.g., Python, Leadership, Problem Solving)" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} />
      </div>
      <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>Press Enter to add • Backspace to remove last tag</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function Step3Resume({ data, onUpdate, onNext, onBack }: Step3Props) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => String(currentYear - i + 5));

  // OCR state
  const [ocrText, setOcrText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

  type ListKey = "education" | "experience" | "awards" | "community" | "leadership";

  function listAdd(key: ListKey, defaults: object) {
    onUpdate({ ...data, [key]: [...(data[key] ?? []), { id: uid(), ...defaults }] });
  }
  function listRemove(key: ListKey, id: string) {
    if ((data[key] ?? []).length > 1) onUpdate({ ...data, [key]: (data[key] as any[]).filter((x) => x.id !== id) });
  }
  function listUpdate(key: ListKey, id: string, field: string, value: string) {
    onUpdate({ ...data, [key]: (data[key] as any[]).map((x) => x.id === id ? { ...x, [field]: value } : x) });
  }

  const addSkill = (skill: string) => { if (skill && !data.skills.includes(skill)) onUpdate({ ...data, skills: [...data.skills, skill] }); };
  const removeSkill = (skill: string) => onUpdate({ ...data, skills: data.skills.filter((s) => s !== skill) });
  const handleSaveDraft = () => alert("Draft saved successfully!");

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtracting(true);
    setOcrProgress(0);
    setOcrError("");
    setOcrText("");
    try {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const text = isPdf
        ? await extractPdfText(file, setOcrProgress)
        : await extractImageText(file, setOcrProgress);
      if (!text) { setOcrError("No text could be extracted. Try a clearer image or a text-based PDF."); }
      else { setOcrText(text); }
    } catch {
      setOcrError("Extraction failed. Please try again with a different file.");
    } finally {
      setIsExtracting(false);
      setOcrProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function fillFieldsFromOcr() {
    const parsed = parseResumeText(ocrText);
    const updates: Partial<typeof data> = {};

    if (parsed.education?.length) {
      updates.education = [{ id: uid(), institution: parsed.education.join("\n"), degree: "", startYear: "", endYear: "", gpa: "" }];
    }
    if (parsed.experience?.length) {
      updates.experience = [{ id: uid(), jobTitle: "See extracted details", organization: "", startDate: "", endDate: "", responsibilities: parsed.experience.join("\n") }];
    }
    if (parsed.skills?.length) {
      const tags = parsed.skills.join(", ").split(/[,;•]+/).map((s) => s.trim()).filter(Boolean);
      updates.skills = [...new Set([...data.skills, ...tags])];
    }
    if (parsed.awards?.length) {
      updates.awards = parsed.awards.map((line) => ({ id: uid(), name: line, year: "", description: "" }));
    }
    if (parsed.community?.length) {
      updates.community = [{ id: uid(), organization: "See extracted details", role: "", startDate: "", endDate: "", description: parsed.community.join("\n") }];
    }
    if (parsed.leadership?.length) {
      updates.leadership = [{ id: uid(), role: "See extracted details", organization: "", startDate: "", endDate: "", description: parsed.leadership.join("\n") }];
    }

    onUpdate({ ...data, ...updates });
  }

  const pct = Math.round(ocrProgress * 100);
  const leadership = data.leadership ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Header */}
      <div>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>Step 3 of 6 — Resume / CV</div>
        <div style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Upload your resume to extract text automatically, or fill in the structured fields below.
          Scored on: Community Service, Academic Achievement, Awards & Recognition, Skills & Certifications,
          Research & Work Experience, and Leadership & Extracurriculars.
        </div>
      </div>

      {/* OCR Upload Card */}
      <div className="card" style={{ width: "100%" }}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>Upload & Extract Text (OCR)</div>
        <div style={{ color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>
          Upload an image or PDF of your resume — text will be extracted so you can review it and fill the fields below.
        </div>

        <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={handleFileSelect} />

        <button
          type="button"
          disabled={isExtracting}
          onClick={() => { setOcrError(""); fileRef.current?.click(); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", backgroundColor: isExtracting ? "#94a3b8" : "var(--blue)", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: isExtracting ? "not-allowed" : "pointer" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          {isExtracting ? `Extracting… ${pct}%` : "Upload Resume & Extract Text"}
        </button>

        {isExtracting && (
          <div style={{ marginTop: 10, height: 4, backgroundColor: "#e5e7eb", borderRadius: 4, overflow: "hidden", maxWidth: 280 }}>
            <div style={{ height: "100%", width: `${pct}%`, backgroundColor: "var(--blue)", borderRadius: 4, transition: "width 0.3s" }} />
          </div>
        )}

        {ocrError && <p style={{ marginTop: 8, fontSize: 13, color: "#dc2626" }}>{ocrError}</p>}

        {ocrText && (
          <div style={{ marginTop: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>
              Extracted text — review and edit, then click Fill Fields:
            </label>
            <div className="input-wrap" style={{ alignItems: "stretch" }}>
              <textarea
                className="input"
                style={{ minHeight: 180, resize: "vertical" }}
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value)}
              />
            </div>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={fillFieldsFromOcr} className="primary-btn">
                Fill Fields from Extracted Text
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Structured Fields */}
      <div className="card" style={{ width: "100%" }}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>Structure Your Resume</div>
        <div style={{ color: "var(--muted)", lineHeight: 1.6, marginBottom: 16 }}>
          Fill in the fields below for each rubric category. Edit any fields pre-filled by OCR.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

          {/* Academic Achievement — Education */}
          <div>
            <SectionHeader
              title="Academic Achievement"
              subtitle="Education history, GPA, honours, and academic awards. Example: BIBF — Diploma in Business Studies (2020–2022)"
              onAdd={() => listAdd("education", { institution: "", degree: "", startYear: "", endYear: "", gpa: "" })}
              addLabel="Add Education"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(data.education ?? []).map((edu, idx) => (
                <EntryCard key={edu.id} title={`Entry ${idx + 1}`} canRemove={(data.education ?? []).length > 1} onRemove={() => listRemove("education", edu.id)}>
                  <TwoColGrid>
                    <Field id={`edu_inst_${edu.id}`} label="Institution">
                      <div className="input-wrap"><input id={`edu_inst_${edu.id}`} className="input" placeholder="Institution name" value={edu.institution} onChange={(e) => listUpdate("education", edu.id, "institution", e.target.value)} /></div>
                    </Field>
                    <Field id={`edu_degree_${edu.id}`} label="Degree / Program">
                      <div className="input-wrap"><input id={`edu_degree_${edu.id}`} className="input" placeholder="Degree / Program" value={edu.degree} onChange={(e) => listUpdate("education", edu.id, "degree", e.target.value)} /></div>
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
                      <div className="input-wrap"><input id={`edu_gpa_${edu.id}`} className="input" placeholder="GPA (e.g., 3.8 or 90%)" value={edu.gpa} onChange={(e) => listUpdate("education", edu.id, "gpa", e.target.value)} /></div>
                    </Field>
                    <div />
                  </TwoColGrid>
                </EntryCard>
              ))}
            </div>
          </div>

          {/* Research & Work Experience */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18 }}>
            <SectionHeader
              title="Research & Work Experience"
              subtitle="Internships, research roles, part-time jobs, and professional experience."
              onAdd={() => listAdd("experience", { jobTitle: "", organization: "", startDate: "", endDate: "", responsibilities: "" })}
              addLabel="Add Experience"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(data.experience ?? []).map((exp, idx) => (
                <EntryCard key={exp.id} title={`Experience ${idx + 1}`} canRemove={(data.experience ?? []).length > 1} onRemove={() => listRemove("experience", exp.id)}>
                  <TwoColGrid>
                    <Field id={`exp_title_${exp.id}`} label="Job / Research title">
                      <div className="input-wrap"><input id={`exp_title_${exp.id}`} className="input" placeholder="Research Assistant, Intern…" value={exp.jobTitle} onChange={(e) => listUpdate("experience", exp.id, "jobTitle", e.target.value)} /></div>
                    </Field>
                    <Field id={`exp_org_${exp.id}`} label="Organization / Lab">
                      <div className="input-wrap"><input id={`exp_org_${exp.id}`} className="input" placeholder="Organization or lab name" value={exp.organization} onChange={(e) => listUpdate("experience", exp.id, "organization", e.target.value)} /></div>
                    </Field>
                    <Field id={`exp_start_${exp.id}`} label="Start date">
                      <div className="input-wrap"><input id={`exp_start_${exp.id}`} className="input" type="month" value={exp.startDate} onChange={(e) => listUpdate("experience", exp.id, "startDate", e.target.value)} /></div>
                    </Field>
                    <Field id={`exp_end_${exp.id}`} label="End date">
                      <div className="input-wrap"><input id={`exp_end_${exp.id}`} className="input" type="month" value={exp.endDate} onChange={(e) => listUpdate("experience", exp.id, "endDate", e.target.value)} /></div>
                    </Field>
                  </TwoColGrid>
                  <Field id={`exp_resp_${exp.id}`} label="Key responsibilities / contributions" hint="Tip: write one bullet per line">
                    <div className="input-wrap" style={{ alignItems: "stretch" }}>
                      <textarea id={`exp_resp_${exp.id}`} className="input" style={{ minHeight: 110, resize: "vertical" }} placeholder={"One per line:\n• Developed ML model for sentiment analysis\n• Published findings in campus journal"} value={exp.responsibilities} onChange={(e) => listUpdate("experience", exp.id, "responsibilities", e.target.value)} />
                    </div>
                  </Field>
                </EntryCard>
              ))}
            </div>
          </div>

          {/* Skills & Certifications */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Skills & Certifications</div>
            <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
              Technical skills, languages, software, and certifications. Examples: Python, AWS Certified, Arabic, Leadership.
            </div>
            <SkillsInput skills={data.skills} onAdd={addSkill} onRemove={removeSkill} />
          </div>

          {/* Awards & Recognition */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18 }}>
            <SectionHeader
              title="Awards & Recognition"
              subtitle="Scholarships, competition prizes, honours, and other recognitions. Example: Best Capstone Award 2023"
              onAdd={() => listAdd("awards", { name: "", year: "", description: "" })}
              addLabel="Add Award"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(data.awards ?? []).map((award, idx) => (
                <EntryCard key={award.id} title={`Award ${idx + 1}`} canRemove={(data.awards ?? []).length > 1} onRemove={() => listRemove("awards", award.id)}>
                  <TwoColGrid>
                    <Field id={`award_name_${award.id}`} label="Award / Prize name">
                      <div className="input-wrap"><input id={`award_name_${award.id}`} className="input" placeholder="Dean's List, National Science Olympiad…" value={award.name} onChange={(e) => listUpdate("awards", award.id, "name", e.target.value)} /></div>
                    </Field>
                    <Field id={`award_year_${award.id}`} label="Year">
                      <div className="input-wrap"><input id={`award_year_${award.id}`} className="input" type="number" placeholder="Year" value={award.year} onChange={(e) => listUpdate("awards", award.id, "year", e.target.value)} /></div>
                    </Field>
                  </TwoColGrid>
                  <Field id={`award_desc_${award.id}`} label="Short description">
                    <div className="input-wrap"><input id={`award_desc_${award.id}`} className="input" placeholder="Brief description of the award and its significance" value={award.description} onChange={(e) => listUpdate("awards", award.id, "description", e.target.value)} /></div>
                  </Field>
                </EntryCard>
              ))}
            </div>
          </div>

          {/* Community Service */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18 }}>
            <SectionHeader
              title="Community Service"
              subtitle="Volunteer work, social impact initiatives, and community contributions. Example: Bahrain Red Crescent — donation drives"
              onAdd={() => listAdd("community", { organization: "", role: "", startDate: "", endDate: "", description: "" })}
              addLabel="Add Community Work"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(data.community ?? []).map((comm, idx) => (
                <EntryCard key={comm.id} title={`Entry ${idx + 1}`} canRemove={(data.community ?? []).length > 1} onRemove={() => listRemove("community", comm.id)}>
                  <TwoColGrid>
                    <Field id={`comm_org_${comm.id}`} label="Organization">
                      <div className="input-wrap"><input id={`comm_org_${comm.id}`} className="input" placeholder="Organization" value={comm.organization} onChange={(e) => listUpdate("community", comm.id, "organization", e.target.value)} /></div>
                    </Field>
                    <Field id={`comm_role_${comm.id}`} label="Role">
                      <div className="input-wrap"><input id={`comm_role_${comm.id}`} className="input" placeholder="Role" value={comm.role} onChange={(e) => listUpdate("community", comm.id, "role", e.target.value)} /></div>
                    </Field>
                    <Field id={`comm_start_${comm.id}`} label="Start date">
                      <div className="input-wrap"><input id={`comm_start_${comm.id}`} className="input" type="month" value={comm.startDate} onChange={(e) => listUpdate("community", comm.id, "startDate", e.target.value)} /></div>
                    </Field>
                    <Field id={`comm_end_${comm.id}`} label="End date">
                      <div className="input-wrap"><input id={`comm_end_${comm.id}`} className="input" type="month" value={comm.endDate} onChange={(e) => listUpdate("community", comm.id, "endDate", e.target.value)} /></div>
                    </Field>
                  </TwoColGrid>
                  <Field id={`comm_desc_${comm.id}`} label="Description & impact">
                    <div className="input-wrap" style={{ alignItems: "stretch" }}>
                      <textarea id={`comm_desc_${comm.id}`} className="input" style={{ minHeight: 110, resize: "vertical" }} placeholder="Describe your contribution, number of people helped, and overall impact" value={comm.description} onChange={(e) => listUpdate("community", comm.id, "description", e.target.value)} />
                    </div>
                  </Field>
                </EntryCard>
              ))}
            </div>
          </div>

          {/* Leadership & Extracurriculars */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18 }}>
            <SectionHeader
              title="Leadership & Extracurriculars"
              subtitle="Club leadership, student government, sports, cultural activities, and other extracurriculars."
              onAdd={() => listAdd("leadership", { role: "", organization: "", startDate: "", endDate: "", description: "" })}
              addLabel="Add Entry"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {leadership.map((l, idx) => (
                <EntryCard key={l.id} title={`Entry ${idx + 1}`} canRemove={leadership.length > 1} onRemove={() => listRemove("leadership", l.id)}>
                  <TwoColGrid>
                    <Field id={`lead_role_${l.id}`} label="Role / Position">
                      <div className="input-wrap"><input id={`lead_role_${l.id}`} className="input" placeholder="President, Captain, Founder…" value={l.role} onChange={(e) => listUpdate("leadership", l.id, "role", e.target.value)} /></div>
                    </Field>
                    <Field id={`lead_org_${l.id}`} label="Club / Organization">
                      <div className="input-wrap"><input id={`lead_org_${l.id}`} className="input" placeholder="Debate Club, Basketball Team…" value={l.organization} onChange={(e) => listUpdate("leadership", l.id, "organization", e.target.value)} /></div>
                    </Field>
                    <Field id={`lead_start_${l.id}`} label="Start date">
                      <div className="input-wrap"><input id={`lead_start_${l.id}`} className="input" type="month" value={l.startDate} onChange={(e) => listUpdate("leadership", l.id, "startDate", e.target.value)} /></div>
                    </Field>
                    <Field id={`lead_end_${l.id}`} label="End date">
                      <div className="input-wrap"><input id={`lead_end_${l.id}`} className="input" type="month" value={l.endDate} onChange={(e) => listUpdate("leadership", l.id, "endDate", e.target.value)} /></div>
                    </Field>
                  </TwoColGrid>
                  <Field id={`lead_desc_${l.id}`} label="Description & achievements">
                    <div className="input-wrap" style={{ alignItems: "stretch" }}>
                      <textarea id={`lead_desc_${l.id}`} className="input" style={{ minHeight: 110, resize: "vertical" }} placeholder="Describe your responsibilities, accomplishments, and leadership impact" value={l.description} onChange={(e) => listUpdate("leadership", l.id, "description", e.target.value)} />
                    </div>
                  </Field>
                </EntryCard>
              ))}
              {leadership.length === 0 && (
                <button type="button" className="ghost-btn" onClick={() => listAdd("leadership", { role: "", organization: "", startDate: "", endDate: "", description: "" })} style={{ alignSelf: "flex-start" }}>
                  + Add Leadership Entry
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <button type="button" className="ghost-btn" onClick={onBack}>← Back</button>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" className="ghost-btn" onClick={handleSaveDraft}>Save Draft</button>
          <button type="button" className="primary-btn primary-btn-lg" onClick={onNext}>Next →</button>
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
