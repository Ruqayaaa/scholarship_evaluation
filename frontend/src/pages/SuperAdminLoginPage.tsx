import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onLogin = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) throw new Error("Could not load user profile.");

      if (profile.role !== "superadmin") {
        await supabase.auth.signOut();
        throw new Error("This login is for super admin accounts only.");
      }

      navigate("/superadmin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-two-col">

        {/* Info panel */}
        <div className="auth-info-panel">
          <div className="auth-info-logo" />

          <div className="auth-tag" style={{ marginBottom: 20 }}>SUPER ADMIN</div>
          <h2 className="auth-info-heading">
            System-wide control, all in one place.
          </h2>
          <p className="auth-info-text">
            Manage universities, reviewers, and access permissions across the entire scholarship evaluation system.
          </p>

          <div className="auth-info-list">
            <div className="auth-info-list-title">What you can do here</div>
            <ul>
              <li>Create and deactivate universities</li>
              <li>Set contact emails and branding</li>
              <li>Add or remove reviewer accounts</li>
            </ul>
          </div>
        </div>

        {/* Login card */}
        <div className="auth-card" style={{ maxWidth: "none" }}>
          <button className="auth-back" onClick={() => navigate("/")}>
            ← Back
          </button>

          <div className="auth-tag">SUPER ADMIN CONSOLE</div>
          <h2 className="auth-title">Admin Login</h2>
          <p className="auth-subtitle">Use your super admin credentials to continue.</p>

          <form className="auth-form" onSubmit={onLogin}>
            <div>
              <label className="auth-label">Email</label>
              <input
                className="auth-input"
                type="email"
                placeholder="superadmin@yourdomain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="auth-label">Password</label>
              <input
                className="auth-input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "SIGN IN"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
