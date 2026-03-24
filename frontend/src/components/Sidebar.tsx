import { Users, Sparkles } from "lucide-react";

type SidebarProps = {
  onNavigateApplicants: () => void;
  onLogout?: () => void;
};

export default function Sidebar({ onNavigateApplicants, onLogout }: SidebarProps) {
  return (
    <aside className="reviewer-sidebar">
      {/* Brand */}
      <div className="reviewer-brand">
        <div className="reviewer-logo" aria-hidden="true">
          <Sparkles size={16} />
        </div>
        <div>
          <div className="reviewer-brand-title">Scholarship System</div>
          <div className="reviewer-brand-sub">Reviewer Portal</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="reviewer-nav" aria-label="Reviewer navigation">
        <button
          type="button"
          className="reviewer-nav-item is-active"
          onClick={onNavigateApplicants}
        >
          <Users size={16} />
          <span>Applicants</span>
        </button>
      </nav>

      {/* User footer */}
      <div className="reviewer-footer-card2">
        <div className="reviewer-footer-avatar">R</div>
        <div className="reviewer-footer-meta">
          <div className="reviewer-footer-title">Reviewer</div>
          <div className="reviewer-footer-text">reviewer@university.edu</div>
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
