import LoginForm from "../components/LoginForm";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const navigate = useNavigate();

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <button className="auth-back" onClick={() => navigate("/")}>
          ← Back
        </button>

        <div className="auth-tag">ADMIN & REVIEWER</div>
        <h2 className="auth-title">Staff Access</h2>
        <p className="auth-subtitle">Authorized personnel only. Use your institutional credentials.</p>

        <LoginForm />
      </div>
    </div>
  );
}
