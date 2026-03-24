import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) throw new Error("Could not load user profile.");

      switch (profile.role) {
        case "admin":      navigate("/admin");      break;
        case "superadmin": navigate("/superadmin"); break;
        case "reviewer":   navigate("/reviewer");   break;
        default:
          await supabase.auth.signOut();
          throw new Error("This login is for admin and reviewer accounts only.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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

      <button className="auth-btn" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "LOG IN"}
      </button>
    </form>
  );
}
