import { useNavigate } from "react-router-dom";
import { useState } from "react";

type PopupType = "eligibility" | "types" | "dates" | "faq";

export default function LandingPage() {
  const navigate = useNavigate();
  const [popup, setPopup] = useState<PopupType | null>(null);

  return (
    <div className="lp-shell">
      <main className="lp-main">

        {/* ─── SECTION 1: HERO ─── */}
        <section className="lp-hero">
          <div className="lp-hero-inner">
            <div className="lp-badge">SCHOLARSHIPS PORTAL</div>

            <h1 className="lp-title">
              Scholarship<br />
              <span className="lp-title-highlight">Evaluation</span> System
            </h1>

            <p className="lp-subtitle">
              Submit and manage your scholarship applications through an official institutional platform.
            </p>

            <div className="lp-actions">
              <button
                className="lp-btn-primary"
                onClick={() => navigate("/applicant/auth")}
              >
                APPLY FOR SCHOLARSHIP NOW
              </button>
              <button
                className="lp-btn-ghost"
                onClick={() => navigate("/admin/login")}
              >
                Administrator / Reviewer Login
              </button>
            </div>

            <div className="lp-quick-links">
              <button className="lp-link-pill" onClick={() => setPopup("eligibility")}>View Eligibility</button>
              <button className="lp-link-pill" onClick={() => setPopup("types")}>Scholarship Types</button>
              <button className="lp-link-pill" onClick={() => setPopup("dates")}>Important Dates</button>
              <button className="lp-link-pill" onClick={() => setPopup("faq")}>FAQ</button>
            </div>
          </div>
        </section>

        {/* ─── SECTION 2: TYPES OF SCHOLARSHIPS ─── */}
        <section className="lp-section">
          <div className="lp-section-head">
            <h2 className="lp-section-title">
              TYPES OF <span className="lp-title-highlight-inline">SCHOLARSHIPS</span>
            </h2>
            <p className="lp-section-sub">Choose the scholarship that fits your profile and goals.</p>
          </div>

          <div className="lp-cards-stack">

            {/* Card 1 — Full Scholarship */}
            <div className="lp-scholarship-card lp-card-featured">
              <div className="lp-card-badge lp-badge-accent">100%</div>
              <div className="lp-card-body">
                <div className="lp-card-tag">FULL SCHOLARSHIP</div>
                <h3 className="lp-card-title">Full Tuition Coverage</h3>
                <p className="lp-card-desc">
                  Covers 100% of tuition fees for outstanding students who demonstrate exceptional academic performance and leadership potential.
                </p>
                <div className="lp-card-details">
                  <span className="lp-detail-item">Academic Excellence</span>
                  <span className="lp-detail-item">All Nationalities</span>
                  <span className="lp-detail-item">GPA 3.8+</span>
                </div>
              </div>
            </div>

            {/* Card 2 — Domestic Partial */}
            <div className="lp-scholarship-card">
              <div className="lp-card-badge lp-badge-secondary">Up to 50%</div>
              <div className="lp-card-body">
                <div className="lp-card-tag">DOMESTIC PARTIAL</div>
                <h3 className="lp-card-title">Domestic Partial Scholarship</h3>
                <p className="lp-card-desc">
                  Available to domestic students with strong academic records and demonstrated financial need. Covers up to 50% of tuition fees.
                </p>
                <div className="lp-card-details">
                  <span className="lp-detail-item">Domestic Students</span>
                  <span className="lp-detail-item">Financial Need</span>
                  <span className="lp-detail-item">GPA 3.2+</span>
                </div>
              </div>
            </div>

            {/* Card 3 — International Partial */}
            <div className="lp-scholarship-card">
              <div className="lp-card-badge lp-badge-secondary">Up to 40%</div>
              <div className="lp-card-body">
                <div className="lp-card-tag">INTERNATIONAL PARTIAL</div>
                <h3 className="lp-card-title">International Partial Scholarship</h3>
                <p className="lp-card-desc">
                  Designed for international students who bring diverse perspectives. Covers up to 40% of tuition with additional eligibility criteria.
                </p>
                <div className="lp-card-details">
                  <span className="lp-detail-item">International Students</span>
                  <span className="lp-detail-item">IELTS 6.5+</span>
                  <span className="lp-detail-item">GPA 3.4+</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ─── SECTION 3: HOW TO APPLY ─── */}
        <section className="lp-section">
          <div className="lp-section-head">
            <h2 className="lp-section-title">HOW TO <span className="lp-title-highlight-inline">APPLY</span></h2>
            <p className="lp-section-sub">Three straightforward steps to complete your application.</p>
          </div>

          <div className="lp-apply-card">
            <div className="lp-step-row">
              <div className="lp-step-num">1</div>
              <div className="lp-step-content">
                <div className="lp-step-title">CREATE AN ACCOUNT</div>
                <p className="lp-step-desc">Register with your institutional email to access the applicant portal.</p>
                <div className="lp-step-notes">
                  <span className="lp-note-item">✓ Use your university email</span>
                  <span className="lp-note-item">✓ Verify your account</span>
                </div>
              </div>
            </div>

            <div className="lp-step-divider" />

            <div className="lp-step-row">
              <div className="lp-step-num">2</div>
              <div className="lp-step-content">
                <div className="lp-step-title">COMPLETE YOUR APPLICATION</div>
                <p className="lp-step-desc">Fill in personal information, upload documents, and write your personal statement.</p>
                <div className="lp-step-notes">
                  <span className="lp-note-item">✓ Transcripts &amp; IELTS required</span>
                  <span className="lp-note-item">✓ Personal statement (max 1000 words)</span>
                  <span className="lp-note-item">✓ Portfolio (optional)</span>
                </div>
              </div>
            </div>

            <div className="lp-step-divider" />

            <div className="lp-step-row">
              <div className="lp-step-num">3</div>
              <div className="lp-step-content">
                <div className="lp-step-title">SUBMIT &amp; AWAIT REVIEW</div>
                <p className="lp-step-desc">Submit before the deadline. Our team will review your application and notify you of the outcome.</p>
                <div className="lp-step-notes">
                  <span className="lp-note-item">✓ AI-assisted scoring</span>
                  <span className="lp-note-item">✓ Expert reviewer evaluation</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 4: DEADLINES ─── */}
        <section className="lp-section lp-section-last">
          <div className="lp-section-head">
            <h2 className="lp-section-title">APPLICATION <span className="lp-deadline-highlight">DEADLINES</span></h2>
            <p className="lp-section-sub">Do not miss these critical dates.</p>
          </div>

          <div className="lp-deadlines-row">
            <div className="lp-deadline-card">
              <div className="lp-deadline-label lp-deadline-urgent">URGENT</div>
              <div className="lp-deadline-type">FULL SCHOLARSHIP</div>
              <div className="lp-deadline-date">March 31, 2025</div>
              <p className="lp-deadline-note">Applications for the full scholarship close at 11:59 PM on this date. No extensions.</p>
            </div>

            <div className="lp-deadline-card">
              <div className="lp-deadline-label">OPEN</div>
              <div className="lp-deadline-type">PARTIAL SCHOLARSHIPS</div>
              <div className="lp-deadline-date">April 30, 2025</div>
              <p className="lp-deadline-note">Domestic and international partial scholarship applications close at end of month.</p>
            </div>
          </div>
        </section>

      </main>

      {/* ─── MODAL ─── */}
      {popup && (
        <div className="lp-modal-backdrop" onClick={() => setPopup(null)}>
          <div className="lp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lp-modal-tag">
              {popup === "eligibility" && "ELIGIBILITY"}
              {popup === "types" && "SCHOLARSHIP TYPES"}
              {popup === "dates" && "IMPORTANT DATES"}
              {popup === "faq" && "FAQ"}
            </div>
            <h3 className="lp-modal-title">
              {popup === "eligibility" && "Eligibility Criteria"}
              {popup === "types" && "Scholarship Types"}
              {popup === "dates" && "Important Dates"}
              {popup === "faq" && "Frequently Asked Questions"}
            </h3>
            <p className="lp-modal-text">
              {popup === "eligibility" &&
                "Eligibility requirements depend on academic performance and institutional criteria. Minimum GPA of 3.2 is required for most scholarships. Applicants must be currently enrolled or accepted to an accredited university."}
              {popup === "types" &&
                "Scholarships include: Full Tuition (100%), Domestic Partial (up to 50%), and International Partial (up to 40%). Awards are merit-based with consideration for financial need."}
              {popup === "dates" &&
                "Full Scholarship deadline: March 31, 2025. Partial Scholarship deadline: April 30, 2025. Results announced within 6 weeks of each deadline."}
              {popup === "faq" &&
                "Q: Can I apply for multiple scholarships? A: No, one application per cycle. Q: Are results final? A: Yes, all decisions are final. Q: Can I reapply next cycle? A: Yes, applicants may reapply in the following academic year."}
            </p>
            <button className="lp-modal-close" onClick={() => setPopup(null)}>
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
