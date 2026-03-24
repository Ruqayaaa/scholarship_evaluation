import {
  LayoutDashboard,
  Users,
  UserCog,
  Archive,
  Sparkles,
} from "lucide-react";
import type { AdminView } from "../pages/AdminPortal";

type SidebarProps = {
  currentView: AdminView;
  onNavigate: (view: AdminView) => void;
};

const NAV_ITEMS: { id: AdminView; label: string; icon: React.ReactNode }[] = [
  { id: "overview",   label: "Overview",        icon: <LayoutDashboard size={16} /> },
  { id: "applicants", label: "Applicants",       icon: <Users size={16} /> },
  { id: "reviewers",  label: "Reviewers",        icon: <UserCog size={16} /> },
  { id: "cycles",     label: "Cycles & Archive", icon: <Archive size={16} /> },
];

export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  return (
    <aside className="reviewer-sidebar admin-sidebar">
      {/* Brand */}
      <div className="reviewer-brand">
        <div className="reviewer-logo" aria-hidden="true">
          <Sparkles size={16} />
        </div>
        <div>
          <div className="reviewer-brand-title">Scholarship System</div>
          <div className="reviewer-brand-sub">University Admin</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="reviewer-nav" aria-label="Admin navigation">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`reviewer-nav-item ${currentView === item.id ? "is-active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User footer */}
      <div className="reviewer-footer-card1">
        <div className="reviewer-footer-avatar">A</div>
        <div className="reviewer-footer-meta">
          <div className="reviewer-footer-title">Admin</div>
          <div className="reviewer-footer-text">admin@university.edu</div>
          <button
            type="button"
            className="reviewer-logout-inline"
            onClick={() => (window.location.href = "/")}
          >
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}
