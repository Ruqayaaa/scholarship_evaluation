import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  UserCog,
  Archive,
  Sparkles,
} from "lucide-react";
import type { AdminView } from "../pages/AdminPortal";
import { supabase } from "../lib/supabase";

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
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("Admin");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? "");
        setUserName(user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Admin");
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

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
        <div className="reviewer-footer-avatar">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="reviewer-footer-meta">
          <div className="reviewer-footer-title">{userName}</div>
          <div className="reviewer-footer-text">{userEmail}</div>
          <button type="button" className="reviewer-logout-inline" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}
