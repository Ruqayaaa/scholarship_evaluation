import { useEffect, useState } from "react";
import { Users, Sparkles, Settings } from "lucide-react";
import { supabase } from "../lib/supabase";

type SidebarProps = {
  onNavigateApplicants: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
};

export default function Sidebar({ onNavigateApplicants, onSettings, onLogout }: SidebarProps) {
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("Reviewer");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? "");
        setUserName(user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Reviewer");
      }
    });
  }, []);

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

        {onSettings && (
          <button
            type="button"
            className="reviewer-nav-item"
            onClick={onSettings}
          >
            <Settings size={16} />
            <span>Settings</span>
          </button>
        )}
      </nav>

      {/* User footer */}
      <div className="reviewer-footer-card2">
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
