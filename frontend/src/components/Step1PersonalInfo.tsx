import React from "react";
import { InfoCard } from "./InfoCard";

export type PersonalInfoData = {
  fullName: string;
  email: string;
  dateOfBirth: string;
  country: string;
  program: string;
  university: string;
  gpa: string;
  graduationYear: string;
  ieltsScore: string;
};

type Step1Props = {
  data: PersonalInfoData;
  onUpdate: (next: PersonalInfoData) => void;
  onNext: () => void;
};

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

export function Step1PersonalInfo({ data, onUpdate, onNext }: Step1Props) {
  const countries = [
    "United States",
    "United Kingdom",
    "Canada",
    "Australia",
    "Germany",
    "France",
    "Spain",
    "Italy",
    "Japan",
    "China",
    "India",
    "Brazil",
    "Other",
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => String(currentYear + i));

  const setField = <K extends keyof PersonalInfoData>(field: K, value: string) => {
    onUpdate({ ...data, [field]: value });
  };

  const requiredFields: (keyof PersonalInfoData)[] = [
    "fullName",
    "email",
    "dateOfBirth",
    "country",
    "program",
    "university",
    "gpa",
    "graduationYear",
    "ieltsScore",
  ];

  const canContinue = requiredFields.every((k) => String(data[k]).trim().length > 0);

  const handleSaveDraft = () => alert("Draft saved successfully!");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Header */}
      <div>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>
          Step 1 of 6 — Personal Information
        </div>
        <div style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Tell us a bit about yourself. These details help us verify eligibility.
        </div>
      </div>

      {/* Main Card */}
      <div className="card" style={{ width: "100%" }}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 14 }}>
          Applicant Information
        </div>

        <form className="form" onSubmit={(e) => e.preventDefault()}>
          {/* Personal Information */}
          <div>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Personal Information</div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 14,
              }}
            >
              <Field id="fullName" label="Full Name *">
                <div className="input-wrap">
                  <input
                    id="fullName"
                    className="input"
                    placeholder="Enter your full name"
                    value={data.fullName}
                    onChange={(e) => setField("fullName", e.target.value)}
                  />
                </div>
              </Field>

              <Field id="email" label="Email Address *">
                <div className="input-wrap">
                  <input
                    id="email"
                    className="input"
                    type="email"
                    placeholder="your.email@example.com"
                    value={data.email}
                    onChange={(e) => setField("email", e.target.value)}
                  />
                </div>
              </Field>

              <Field id="dob" label="Date of Birth *">
                <div className="input-wrap">
                  <input
                    id="dob"
                    className="input"
                    type="date"
                    value={data.dateOfBirth}
                    onChange={(e) => setField("dateOfBirth", e.target.value)}
                  />
                </div>
              </Field>

              <Field id="country" label="Country *">
                <div className="input-wrap">
                  <select
                    id="country"
                    className="input"
                    value={data.country}
                    onChange={(e) => setField("country", e.target.value)}
                  >
                    <option value="" disabled>
                      Select country
                    </option>
                    {countries.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>
          </div>

          {/* Academic Information */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 6 }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Academic Information</div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 14,
              }}
            >
              <Field id="program" label="Program / Major *">
                <div className="input-wrap">
                  <input
                    id="program"
                    className="input"
                    placeholder="e.g., Computer Science, Business Administration"
                    value={data.program}
                    onChange={(e) => setField("program", e.target.value)}
                  />
                </div>
              </Field>

              <Field id="university" label="University / School Name *">
                <div className="input-wrap">
                  <input
                    id="university"
                    className="input"
                    placeholder="Enter your institution name"
                    value={data.university}
                    onChange={(e) => setField("university", e.target.value)}
                  />
                </div>
              </Field>

              <Field
                id="gpa"
                label="GPA *"
                hint="Enter as numeric (4.0 scale) or percentage"
              >
                <div className="input-wrap">
                  <input
                    id="gpa"
                    className="input"
                    placeholder="e.g., 3.8 or 90%"
                    value={data.gpa}
                    onChange={(e) => setField("gpa", e.target.value)}
                  />
                </div>
              </Field>

              <Field id="gradYear" label="Graduation Year *">
                <div className="input-wrap">
                  <select
                    id="gradYear"
                    className="input"
                    value={data.graduationYear}
                    onChange={(e) => setField("graduationYear", e.target.value)}
                  >
                    <option value="" disabled>
                      Select year
                    </option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>

              <Field
                id="ieltsScore"
                label="IELTS Overall Score *"
                hint="Minimum required overall score: 6.0. Example: 6.5"
              >
                <div className="input-wrap">
                  <input
                    id="ieltsScore"
                    className="input"
                    type="number"
                    step="0.5"
                    min="0"
                    max="9"
                    placeholder="e.g., 6.5"
                    value={data.ieltsScore}
                    onChange={(e) => setField("ieltsScore", e.target.value)}
                  />
                </div>
              </Field>
            </div>
          </div>
        </form>
      </div>

      {/* Eligibility Info */}
      <InfoCard type="info">
        <p style={{ margin: 0, fontWeight: 900 }}>
          To qualify for the AUBH Scholarship, students must have:
        </p>
        <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>A GPA of 90% or higher</li>
          <li>An IELTS score of 6.0+ with no band below 5</li>
          <li>Strong personal and academic achievements</li>
        </ul>
      </InfoCard>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <button type="button" className="ghost-btn" onClick={handleSaveDraft}>
          Save Draft
        </button>

      <button className="primary-btn" type="button" onClick={onNext}>
        Next →
      </button>

      </div>

  
      <style>{`
        @media (max-width: 900px) {
          .step1-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
