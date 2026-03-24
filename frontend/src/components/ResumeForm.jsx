import { useState } from "react";
import { scoreResume } from "../api/personalStatementApi";

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

const emptyEdu = () => ({ id: uid(), institution: "", degree: "", startYear: "", endYear: "", gpa: "" });
const emptyExp = () => ({ id: uid(), jobTitle: "", organization: "", startDate: "", endDate: "", responsibilities: "" });
const emptyAward = () => ({ id: uid(), name: "", year: "", description: "" });
const emptyComm = () => ({ id: uid(), organization: "", role: "", startDate: "", endDate: "", description: "" });

function buildResumeText(data) {
  const lines = [];

  if (data.education.some((e) => e.institution)) {
    lines.push("EDUCATION");
    data.education.forEach((e) => {
      if (!e.institution) return;
      lines.push(`${e.institution}${e.degree ? " — " + e.degree : ""}`);
      if (e.gpa) lines.push(`GPA: ${e.gpa}`);
      if (e.startYear || e.endYear) lines.push(`${e.startYear || ""} – ${e.endYear || "Present"}`);
    });
    lines.push("");
  }

  if (data.experience.some((e) => e.jobTitle)) {
    lines.push("EXPERIENCE");
    data.experience.forEach((e) => {
      if (!e.jobTitle) return;
      lines.push(`${e.jobTitle}${e.organization ? " — " + e.organization : ""}${e.startDate || e.endDate ? " (" + (e.startDate || "") + " – " + (e.endDate || "Present") + ")" : ""}`);
      if (e.responsibilities) {
        e.responsibilities.split("\n").forEach((r) => {
          const t = r.trim();
          if (t) lines.push(`• ${t.replace(/^[•\-*]\s*/, "")}`);
        });
      }
    });
    lines.push("");
  }

  if (data.skills.length > 0) {
    lines.push("SKILLS");
    lines.push(data.skills.join(", "));
    lines.push("");
  }

  if (data.awards.some((a) => a.name)) {
    lines.push("AWARDS & ACHIEVEMENTS");
    data.awards.forEach((a) => {
      if (!a.name) return;
      lines.push(`${a.name}${a.year ? " (" + a.year + ")" : ""}${a.description ? " — " + a.description : ""}`);
    });
    lines.push("");
  }

  if (data.community.some((c) => c.organization)) {
    lines.push("COMMUNITY / VOLUNTEER WORK");
    data.community.forEach((c) => {
      if (!c.organization) return;
      lines.push(`${c.organization}${c.role ? " — " + c.role : ""}${c.startDate || c.endDate ? " (" + (c.startDate || "") + " – " + (c.endDate || "Present") + ")" : ""}`);
      if (c.description) lines.push(c.description);
    });
  }

  return lines.join("\n").trim();
}

const RESUME_CRITERIA = [
  { key: "academic_achievement",           label: "Academic Achievement" },
  { key: "leadership_and_extracurriculars",label: "Leadership & Extracurriculars" },
  { key: "community_service",              label: "Community Service" },
  { key: "research_and_work_experience",   label: "Research & Work Experience" },
  { key: "skills_and_certifications",      label: "Skills & Certifications" },
  { key: "awards_and_recognition",         label: "Awards & Recognition" },
];

const card = { backgroundColor: "#fff", borderRadius: "24px", boxShadow: "0 1px 8px rgba(0,0,0,0.08)", padding: "32px" };
const section = { border: "1px solid #e5e7eb", borderRadius: "16px", padding: "20px", marginBottom: "14px", backgroundColor: "#fff" };
const inputStyle = { width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "Arial, sans-serif" };
const textareaStyle = { ...inputStyle, minHeight: "100px", resize: "vertical" };
const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" };


export default function ResumeForm() {
  const [education, setEducation] = useState([emptyEdu()]);
  const [experience, setExperience] = useState([emptyExp()]);
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [awards, setAwards] = useState([emptyAward()]);
  const [community, setCommunity] = useState([emptyComm()]);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── helpers ──
  const updateItem = (setter, id, field, value) =>
    setter((prev) => prev.map((x) => (x.id === id ? { ...x, [field]: value } : x)));

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills((p) => [...p, s]);
    setSkillInput("");
  };

  async function submit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setIsSubmitting(true);

    const resumeText = buildResumeText({ education, experience, skills, awards, community });

    try {
      const res = await scoreResume(resumeText);
      setResult(res);
    } catch (err) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: "950px", margin: "0 auto", padding: "24px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ color: "#111827", marginBottom: "8px" }}>Resume Evaluation</h1>
        <p style={{ color: "#4b5563", margin: 0 }}>
          Fill in your resume details below and submit for AI-powered scholarship scoring.
        </p>
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={card}>

          {/* Education */}
          <div style={section}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontWeight: 700, fontSize: "16px" }}>Education</div>
              <button type="button" onClick={() => setEducation((p) => [...p, emptyEdu()])} style={{ background: "none", border: "1px solid #d1d5db", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "13px" }}>+ Add</button>
            </div>
            {education.map((edu, idx) => (
              <div key={edu.id} style={{ border: "1px solid #f3f4f6", borderRadius: "12px", padding: "16px", marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                  <span style={{ fontWeight: 600, fontSize: "13px", color: "#6b7280" }}>Entry {idx + 1}</span>
                  {education.length > 1 && <button type="button" onClick={() => setEducation((p) => p.filter((x) => x.id !== edu.id))} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "13px" }}>Remove</button>}
                </div>
                <div style={grid2}>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Institution</label>
                    <input style={inputStyle} placeholder="University name" value={edu.institution} onChange={(e) => updateItem(setEducation, edu.id, "institution", e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Degree</label>
                    <input style={inputStyle} placeholder="BSc Computer Science" value={edu.degree} onChange={(e) => updateItem(setEducation, edu.id, "degree", e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Start Year</label>
                    <input style={inputStyle} placeholder="2021" value={edu.startYear} onChange={(e) => updateItem(setEducation, edu.id, "startYear", e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>End Year</label>
                    <input style={inputStyle} placeholder="2025 or Present" value={edu.endYear} onChange={(e) => updateItem(setEducation, edu.id, "endYear", e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>GPA</label>
                    <input style={inputStyle} placeholder="3.8 / 4.0" value={edu.gpa} onChange={(e) => updateItem(setEducation, edu.id, "gpa", e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Experience */}
          <div style={section}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontWeight: 700, fontSize: "16px" }}>Work & Internship Experience</div>
              <button type="button" onClick={() => setExperience((p) => [...p, emptyExp()])} style={{ background: "none", border: "1px solid #d1d5db", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "13px" }}>+ Add</button>
            </div>
            {experience.map((exp, idx) => (
              <div key={exp.id} style={{ border: "1px solid #f3f4f6", borderRadius: "12px", padding: "16px", marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                  <span style={{ fontWeight: 600, fontSize: "13px", color: "#6b7280" }}>Entry {idx + 1}</span>
                  {experience.length > 1 && <button type="button" onClick={() => setExperience((p) => p.filter((x) => x.id !== exp.id))} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "13px" }}>Remove</button>}
                </div>
                <div style={grid2}>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Job Title</label>
                    <input style={inputStyle} placeholder="Software Intern" value={exp.jobTitle} onChange={(e) => updateItem(setExperience, exp.id, "jobTitle", e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Organization</label>
                    <input style={inputStyle} placeholder="Company / Lab" value={exp.organization} onChange={(e) => updateItem(setExperience, exp.id, "organization", e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Start Date</label>
                    <input style={inputStyle} type="month" value={exp.startDate} onChange={(e) => updateItem(setExperience, exp.id, "startDate", e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>End Date</label>
                    <input style={inputStyle} type="month" value={exp.endDate} onChange={(e) => updateItem(setExperience, exp.id, "endDate", e.target.value)} />
                  </div>
                </div>
                <div style={{ marginTop: "12px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Key Responsibilities</label>
                  <textarea style={textareaStyle} placeholder={"One per line:\n• Developed data pipeline\n• Improved efficiency by 30%"} value={exp.responsibilities} onChange={(e) => updateItem(setExperience, exp.id, "responsibilities", e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          {/* Skills */}
          <div style={section}>
            <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>Skills & Technologies</div>
            <p style={{ color: "#4b5563", margin: "0 0 12px", fontSize: "13px" }}>Type a skill and press Enter or click Add</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
              {skills.map((s) => (
                <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#1A3175", color: "white", padding: "6px 10px", borderRadius: "20px", fontSize: "13px", fontWeight: 600 }}>
                  {s}
                  <button type="button" onClick={() => setSkills((p) => p.filter((x) => x !== s))} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", borderRadius: "50%", width: "18px", height: "18px", cursor: "pointer", fontSize: "12px", lineHeight: 1, display: "grid", placeItems: "center" }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input style={{ ...inputStyle, flex: 1 }} placeholder="Python, Leadership, Research..." value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} />
              <button type="button" onClick={addSkill} style={{ padding: "10px 16px", background: "#1A3175", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}>Add</button>
            </div>
          </div>

          {/* Awards */}
          <div style={section}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontWeight: 700, fontSize: "16px" }}>Awards & Achievements</div>
              <button type="button" onClick={() => setAwards((p) => [...p, emptyAward()])} style={{ background: "none", border: "1px solid #d1d5db", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "13px" }}>+ Add</button>
            </div>
            {awards.map((a, idx) => (
              <div key={a.id} style={{ border: "1px solid #f3f4f6", borderRadius: "12px", padding: "16px", marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                  <span style={{ fontWeight: 600, fontSize: "13px", color: "#6b7280" }}>Award {idx + 1}</span>
                  {awards.length > 1 && <button type="button" onClick={() => setAwards((p) => p.filter((x) => x.id !== a.id))} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "13px" }}>Remove</button>}
                </div>
                <div style={grid2}>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Award Name</label>
                    <input style={inputStyle} placeholder="Dean's List" value={a.name} onChange={(e) => updateItem(setAwards, a.id, "name", e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Year</label>
                    <input style={inputStyle} placeholder="2024" value={a.year} onChange={(e) => updateItem(setAwards, a.id, "year", e.target.value)} />
                  </div>
                </div>
                <div style={{ marginTop: "12px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Description</label>
                  <input style={inputStyle} placeholder="Brief description of the award" value={a.description} onChange={(e) => updateItem(setAwards, a.id, "description", e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          {/* Community */}
          <div style={section}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontWeight: 700, fontSize: "16px" }}>Community / Volunteer Work</div>
              <button type="button" onClick={() => setCommunity((p) => [...p, emptyComm()])} style={{ background: "none", border: "1px solid #d1d5db", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "13px" }}>+ Add</button>
            </div>
            {community.map((c, idx) => (
              <div key={c.id} style={{ border: "1px solid #f3f4f6", borderRadius: "12px", padding: "16px", marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                  <span style={{ fontWeight: 600, fontSize: "13px", color: "#6b7280" }}>Entry {idx + 1}</span>
                  {community.length > 1 && <button type="button" onClick={() => setCommunity((p) => p.filter((x) => x.id !== c.id))} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "13px" }}>Remove</button>}
                </div>
                <div style={grid2}>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Organization</label>
                    <input style={inputStyle} placeholder="Red Crescent" value={c.organization} onChange={(e) => updateItem(setCommunity, c.id, "organization", e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Role</label>
                    <input style={inputStyle} placeholder="Volunteer Coordinator" value={c.role} onChange={(e) => updateItem(setCommunity, c.id, "role", e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Start Date</label>
                    <input style={inputStyle} type="month" value={c.startDate} onChange={(e) => updateItem(setCommunity, c.id, "startDate", e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>End Date</label>
                    <input style={inputStyle} type="month" value={c.endDate} onChange={(e) => updateItem(setCommunity, c.id, "endDate", e.target.value)} />
                  </div>
                </div>
                <div style={{ marginTop: "12px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Description</label>
                  <textarea style={textareaStyle} placeholder="Describe your contribution and impact" value={c.description} onChange={(e) => updateItem(setCommunity, c.id, "description", e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginTop: "16px", padding: "16px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px" }}>
              <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div style={{ marginTop: "16px", padding: "20px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px" }}>
              <p style={{ color: "#166534", marginTop: 0, marginBottom: "16px", fontWeight: 600 }}>✓ Resume scored successfully.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {RESUME_CRITERIA.map(({ key, label }) => {
                  const score = result[key] ?? 0;
                  const pct = (score / 30) * 100;
                  return (
                    <div key={key}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "13px" }}>
                        <span style={{ color: "#374151" }}>{label}</span>
                        <span style={{ color: "#166534", fontWeight: 600 }}>{score} / 30</span>
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
                    {result.overall_score ?? 0} / 180
                  </span>
                </div>
                {result.justification && (
                  <div style={{ marginTop: "12px" }}>
                    <p style={{ fontWeight: 600, color: "#374151", marginBottom: "6px", marginTop: 0 }}>Justification</p>
                    <p style={{ color: "#4b5563", fontSize: "13px", margin: 0, lineHeight: 1.6 }}>{result.justification}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" disabled={isSubmitting} style={{ backgroundColor: isSubmitting ? "#94a3b8" : "#1A3175", color: "white", border: "none", borderRadius: "10px", padding: "12px 24px", fontSize: "14px", fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer" }}>
            {isSubmitting ? "Evaluating..." : "Evaluate Resume"}
          </button>
        </div>
      </form>
    </div>
  );
}
