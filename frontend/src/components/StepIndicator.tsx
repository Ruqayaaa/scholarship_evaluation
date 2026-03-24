import {
  Sparkles,
  User,
  FileText,
  ScrollText,
  Upload,
  CheckCircle2,
} from "lucide-react";

type StepIndicatorProps = {
  currentStep: number;
  onLogout?: () => void;
  userName?: string;
  userEmail?: string;
};

const STEPS = [
  { id: 1, label: "Personal Info",      icon: <User size={16} /> },
  { id: 2, label: "Personal Statement", icon: <ScrollText size={16} /> },
  { id: 3, label: "Resume / CV",        icon: <FileText size={16} /> },
  { id: 4, label: "Portfolio",          icon: <Upload size={16} /> },
  { id: 5, label: "Other Uploads",      icon: <Upload size={16} /> },
  { id: 6, label: "Review & Submit",    icon: <CheckCircle2 size={16} /> },
];

export default function StepIndicator({
  currentStep,
  onLogout,
  userName = "Applicant",
  userEmail = "applicant@university.edu",
}: StepIndicatorProps) {
  return (
    <aside className="reviewer-sidebar applicant-sidebar">
      {/* Brand */}
      <div className="reviewer-brand">
        <div className="reviewer-logo" aria-hidden="true">
          <Sparkles size={16} />
        </div>
        <div>
          <div className="reviewer-brand-title">Scholarship System</div>
          <div className="reviewer-brand-sub">Applicant Portal</div>
        </div>
      </div>

      {/* Steps */}
      <nav className="reviewer-nav" aria-label="Application steps">
        {STEPS.map((s) => {
          const isActive = s.id === currentStep;
          const isDone   = s.id < currentStep;
          return (
            <div
              key={s.id}
              className={`reviewer-nav-item ${isActive ? "is-active" : ""}`}
              style={{ cursor: "default", opacity: isDone ? 0.7 : 1 }}
            >
              {s.icon}
              <span>{s.label}</span>
              {isDone && (
                <CheckCircle2
                  size={14}
                  style={{ marginLeft: "auto", color: "#34D399" }}
                />
              )}
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="reviewer-footer-card">
        <div className="reviewer-footer-avatar">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="reviewer-footer-meta">
          <div className="reviewer-footer-title">{userName}</div>
          <div className="reviewer-footer-text">{userEmail}</div>
          {onLogout && (
            <button
              type="button"
              className="reviewer-logout-inline"
              onClick={onLogout}
            >
              Log out
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
