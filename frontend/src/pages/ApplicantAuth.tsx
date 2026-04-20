import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type Mode = "login" | "signup" | "reset";

function parseAuthError(err: unknown): string {
  if (!(err instanceof Error)) return "An unexpected error occurred.";

  const msg = err.message;

  // Network / fetch errors
  if (msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("networkerror")) {
    return "Unable to connect to the authentication service. Please check your internet connection and try again.";
  }

  // Supabase password policy errors
  if (msg.toLowerCase().includes("password should be at least")) {
    return "Password must be at least 6 characters long.";
  }
  if (msg.toLowerCase().includes("password") && msg.toLowerCase().includes("characters")) {
    return msg; // already descriptive
  }
  if (msg.toLowerCase().includes("weak password") || msg.toLowerCase().includes("password is too weak")) {
    return "Your password is too weak. Use at least 8 characters with a mix of letters and numbers.";
  }

  // Supabase signup / login errors
  if (msg.toLowerCase().includes("user already registered") || msg.toLowerCase().includes("already registered")) {
    return "An account with this email already exists. Please log in instead.";
  }
  if (msg.toLowerCase().includes("invalid login credentials") || msg.toLowerCase().includes("invalid credentials")) {
    return "Incorrect email or password. Please try again.";
  }
  if (msg.toLowerCase().includes("email not confirmed")) {
    return "Please verify your email address before logging in. Check your inbox for a confirmation link.";
  }
  if (msg.toLowerCase().includes("too many requests")) {
    return "Too many login attempts. Please wait a few minutes before trying again.";
  }
  if (msg.toLowerCase().includes("rate limit")) {
    return "You have made too many requests. Please wait a moment and try again.";
  }

  // Generic fallback — return Supabase's message as-is if it's short and readable
  if (msg.length < 120) return msg;
  return "Something went wrong. Please try again.";
}

export function ApplicantAuth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const subtitle = useMemo(() => {
    if (mode === "login") return "Log in to access your portal.";
    if (mode === "signup") return "Create an applicant account to start your scholarship application.";
    return "Enter your email address and we will send you a password reset link.";
  }, [mode]);

  // Validate password requirements before hitting Supabase
  function validatePassword(pw: string): string | null {
    if (pw.length < 8) return "Password must be at least 8 characters long.";
    return null;
  }

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === "reset") {
      setLoading(true);
      try {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/applicant/auth`,
        });
        if (resetError) throw resetError;
        setSuccess("Password reset email sent! Check your inbox and follow the link to reset your password.");
      } catch (err) {
        setError(parseAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please re-enter your password.");
        return;
      }
      const pwErr = validatePassword(password);
      if (pwErr) { setError(pwErr); return; }
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { role: "applicant" } },
        });
        if (signUpError) throw signUpError;
        navigate("/app");
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        const role = profile?.role ?? "applicant";
        switch (role) {
          case "admin":      navigate("/admin");      break;
          case "superadmin": navigate("/superadmin"); break;
          case "reviewer":   navigate("/reviewer");   break;
          default:           navigate("/app");        break;
        }
      }
    } catch (err) {
      setError(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setSuccess(null);
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <button className="auth-back" onClick={() => navigate("/")}>
          ← Back
        </button>

        <div className="auth-tag">SCHOLARSHIP PORTAL</div>
        <h2 className="auth-title">
          {mode === "login" ? "Welcome Back" : mode === "signup" ? "Create Account" : "Reset Password"}
        </h2>
        <p className="auth-subtitle">{subtitle}</p>

        {mode !== "reset" && (
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${mode === "login" ? "is-active" : ""}`}
              onClick={() => switchMode("login")}
            >
              Log In
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === "signup" ? "is-active" : ""}`}
              onClick={() => switchMode("signup")}
            >
              New Applicant
            </button>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <label className="auth-label">Email</label>
            <input
              className="auth-input"
              type="email"
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {mode !== "reset" && (
            <div>
              <label className="auth-label">Password</label>
              <input
                className="auth-input"
                type="password"
                placeholder={mode === "signup" ? "At least 8 characters" : "Enter your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}

          {mode === "signup" && (
            <div>
              <label className="auth-label">Confirm Password</label>
              <input
                className="auth-input"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          {error && <p className="auth-error">{error}</p>}
          {success && (
            <p style={{ color: "#166534", background: "#dcfce7", padding: "10px 12px", borderRadius: 8, fontSize: 14, fontWeight: 600, margin: 0 }}>
              {success}
            </p>
          )}

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading
              ? "Please wait…"
              : mode === "login"
              ? "LOG IN"
              : mode === "signup"
              ? "CREATE ACCOUNT"
              : "SEND RESET LINK"}
          </button>
        </form>

        {/* Forgot password link — login mode only */}
        {mode === "login" && (
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <button
              type="button"
              onClick={() => switchMode("reset")}
              style={{ background: "none", border: "none", color: "var(--blue, #2563eb)", fontSize: 13, cursor: "pointer", fontWeight: 600, textDecoration: "underline" }}
            >
              Forgot your password?
            </button>
          </div>
        )}

        {/* Back to login — reset mode */}
        {mode === "reset" && (
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <button
              type="button"
              onClick={() => switchMode("login")}
              style={{ background: "none", border: "none", color: "var(--blue, #2563eb)", fontSize: 13, cursor: "pointer", fontWeight: 600, textDecoration: "underline" }}
            >
              ← Back to Log In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
