import { useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import Tesseract from "tesseract.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

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

// Route each paragraph to the most relevant section using keyword scoring.
// valuesGoals  → "Interests & Values"
// whyMajor     → "Academic Commitment"
// interests    → "Clarity of Vision"
// summary      → "Closing Summary"
const SECTION_KEYWORDS: Record<string, string[]> = {
  valuesGoals: [
    "interest", "passion", "value", "believe", "love", "care", "dedicated",
    "committed", "motivated", "driven", "enthusiast", "community", "service",
    "inspired", "meaningful", "purpose",
  ],
  whyMajor: [
    "academic", "study", "gpa", "grade", "course", "degree", "major",
    "university", "research", "scholar", "achievement", "honour", "honor",
    "curriculum", "programme", "field", "discipline", "professor",
  ],
  interests: [
    "future", "goal", "vision", "plan", "aspire", "aim", "career", "hope",
    "five year", "ten year", "contribute", "impact", "see myself", "pursue",
    "intend", "ambition", "opportunity",
  ],
  summary: [
    "conclude", "in conclusion", "ultimately", "stand out", "confident",
    "ready", "finally", "overall", "therefore", "thus", "grateful",
    "appreciate", "thank", "look forward",
  ],
};

function distributeText(raw: string): { valuesGoals: string; whyMajor: string; interests: string; summary: string } {
  const paragraphs = raw
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return { valuesGoals: "", whyMajor: "", interests: "", summary: "" };
  if (paragraphs.length === 1) return { valuesGoals: paragraphs[0], whyMajor: "", interests: "", summary: "" };

  const buckets: Record<string, string[]> = { valuesGoals: [], whyMajor: [], interests: [], summary: [] };

  // Last paragraph almost always closes the statement
  buckets.summary.push(paragraphs[paragraphs.length - 1]);

  for (let i = 0; i < paragraphs.length - 1; i++) {
    const lower = paragraphs[i].toLowerCase();
    let bestKey = "valuesGoals";
    let bestScore = 0;

    for (const [key, words] of Object.entries(SECTION_KEYWORDS)) {
      const score = words.reduce((acc, w) => acc + (lower.includes(w) ? 1 : 0), 0);
      if (score > bestScore) { bestScore = score; bestKey = key; }
    }

    buckets[bestKey].push(paragraphs[i]);
  }

  return {
    valuesGoals: buckets.valuesGoals.join("\n\n"),
    whyMajor:    buckets.whyMajor.join("\n\n"),
    interests:   buckets.interests.join("\n\n"),
    summary:     buckets.summary.join("\n\n"),
  };
}

async function extractPdfText(file: File, onProgress: (p: number) => void): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const yMap = new Map<number, string[]>();
    for (const item of content.items as any[]) {
      if (!("str" in item) || !item.str) continue;
      const y = Math.round((item.transform?.[5] ?? 0) / 2) * 2;
      if (!yMap.has(y)) yMap.set(y, []);
      yMap.get(y)!.push(item.str);
    }

    const pageLines = [...yMap.entries()]
      .sort(([a], [b]) => b - a)
      .map(([, parts]) => parts.join("").replace(/\s+/g, " ").trim())
      .filter(Boolean);

    fullText += pageLines.join("\n") + "\n\n";
    onProgress(i / pdf.numPages);
  }

  return fullText.trim();
}

async function extractImageText(file: File, onProgress: (p: number) => void): Promise<string> {
  const result = await Tesseract.recognize(file, "eng", {
    logger: (m: any) => {
      if (m.status === "recognizing text") onProgress(m.progress);
    },
  });
  return result.data.text.trim();
}

type SectionComponentProps = {
  k: SectionKey;
  title: string;
  example: string;
  placeholder: string;
  value: string;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
};

function Section({ title, example, placeholder, value, isOpen, onToggle, onChange }: SectionComponentProps) {
  const done = String(value).trim().length > 0;
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 14, background: "rgba(255,255,255,0.96)", overflow: "hidden" }}>
      <button
        type="button"
        onClick={onToggle}
        style={{ width: "100%", textAlign: "left", border: "none", background: "transparent", padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: done ? "#16a34a" : "#cbd5e1", boxShadow: done ? "0 0 0 4px rgba(22,163,74,0.12)" : "none" }} />
          <span style={{ fontWeight: 900, color: "var(--navy)" }}>{title}</span>
        </div>
        <span style={{ color: "var(--muted)", fontWeight: 800 }}>{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen && (
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>
            <span style={{ fontWeight: 800 }}>Example:</span> {example}
          </div>
          <div className="input-wrap" style={{ alignItems: "stretch" }}>
            <textarea className="input" style={{ minHeight: 150, resize: "vertical" }} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}

export function Step2PersonalStatement({ data, onUpdate, onNext, onBack }: Step2Props) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    valuesGoals: true,
    whyMajor: false,
    interests: false,
    summary: false,
  });

  // OCR state
  const [ocrText, setOcrText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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
      if (!text) {
        setOcrError("No text could be extracted. Try a clearer image or a text-based PDF.");
      } else {
        setOcrText(text);
      }
    } catch {
      setOcrError("Extraction failed. Please try again with a different file.");
    } finally {
      setIsExtracting(false);
      setOcrProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function fillSectionsFromOcr() {
    const distributed = distributeText(ocrText);
    onUpdate({ ...data, ...distributed });
    setOpenSections({ valuesGoals: true, whyMajor: true, interests: true, summary: true });
  }

  const SECTIONS: { k: SectionKey; title: string; example: string; placeholder: string }[] = [
    {
      k: "valuesGoals",
      title: "Interests & Values",
      example: '"I am deeply passionate about environmental sustainability and driven by the value of making technology accessible to underserved communities."',
      placeholder: "Describe your personal interests, passions, and core values. What topics or causes motivate you? What principles guide your decisions?",
    },
    {
      k: "whyMajor",
      title: "Academic Commitment",
      example: '"Maintaining a 3.9 GPA while taking advanced coursework in data science reflects my dedication to academic excellence and continuous learning."',
      placeholder: "Describe your academic achievements, dedication to learning, and scholarly pursuits. How have you demonstrated commitment to your field of study?",
    },
    {
      k: "interests",
      title: "Clarity of Vision",
      example: '"In five years, I see myself leading a team developing AI-driven healthcare diagnostics in Bahrain, bridging the gap between technology and public health."',
      placeholder: "Explain your clear vision for the future. Where do you see yourself in 5–10 years? How does this program prepare you for that path?",
    },
    {
      k: "summary",
      title: "Closing Summary",
      example: '"My combination of technical skills, community leadership, and unwavering dedication makes me confident I will contribute meaningfully to this program."',
      placeholder: "End with a strong, well-organized summary of why you stand out and what you will contribute to the program and community.",
    },
  ];


  const PreviewModal = () => (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal" style={{ maxWidth: 860 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Personal Statement Preview</div>
          <button type="button" className="ghost-btn" onClick={() => setIsPreviewOpen(false)}>Close</button>
        </div>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 16 }}>
          {SECTIONS.map(({ k, title }) =>
            data[k] ? (
              <div key={k}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>{title}</div>
                <div style={{ whiteSpace: "pre-wrap", color: "var(--navy)", lineHeight: 1.7 }}>{data[k]}</div>
              </div>
            ) : null
          )}
          {!data.valuesGoals && !data.whyMajor && !data.interests && !data.summary && (
            <div style={{ color: "var(--muted)", textAlign: "center", padding: "22px 0" }}>Start filling out the sections to preview your statement.</div>
          )}
        </div>
      </div>
    </div>
  );

  const pct = Math.round(ocrProgress * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Header */}
      <div>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>Step 2 of 6 — Personal Statement</div>
        <div style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Fill in each section below, or upload your existing personal statement to extract text automatically.
          Scored on: Interests & Values, Academic Commitment, Clarity of Vision, Organization, and Language Quality.
        </div>
      </div>

      {/* OCR Upload Card */}
      <div className="card" style={{ width: "100%" }}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>Upload & Extract Text (OCR)</div>
        <div style={{ color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>
          Have an existing personal statement? Upload an image or PDF — the text will be extracted so you can review and fill the sections below.
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
          {isExtracting ? `Extracting… ${pct}%` : "Upload & Extract Text"}
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
              Extracted text — review and edit, then click Fill Sections:
            </label>
            <div className="input-wrap" style={{ alignItems: "stretch" }}>
              <textarea
                className="input"
                style={{ minHeight: 140, resize: "vertical" }}
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value)}
              />
            </div>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={fillSectionsFromOcr}
                className="primary-btn"
              >
                Fill Sections from Extracted Text
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Structured Sections */}
      <div className="card" style={{ width: "100%" }}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>Structure Your Statement</div>
        <div style={{ color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>
          Complete all four sections. Your content will be combined and evaluated by AI.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {SECTIONS.map((s) => (
            <Section
              key={s.k}
              k={s.k}
              title={s.title}
              example={s.example}
              placeholder={s.placeholder}
              value={data[s.k]}
              isOpen={openSections[s.k]}
              onToggle={() => toggle(s.k)}
              onChange={(v) => handleChange(s.k, v)}
            />
          ))}
        </div>

        <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 800, color: isOverLimit ? "#b91c1c" : "var(--muted)" }}>
            Word count: {wordCount} / 1000 {isOverLimit ? "(exceeds limit)" : ""}
          </div>
          <button type="button" className="ghost-btn" onClick={() => setIsPreviewOpen(true)} style={{ borderColor: "rgba(37, 99, 235, 0.35)" }}>
            Preview Statement
          </button>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <button type="button" className="ghost-btn" onClick={onBack}>← Back</button>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" className="ghost-btn" onClick={handleSaveDraft}>Save Draft</button>
          <button type="button" className="primary-btn primary-btn-lg" onClick={onNext} disabled={isOverLimit} style={isOverLimit ? { opacity: 0.65, cursor: "not-allowed" } : undefined}>
            Next →
          </button>
        </div>
      </div>

      {isPreviewOpen && <PreviewModal />}
    </div>
  );
}
