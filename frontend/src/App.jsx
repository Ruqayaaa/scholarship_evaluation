import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import { ApplicantAuth } from "./pages/ApplicantAuth";
import AdminLogin from "./pages/AdminLogin";
import ApplicantPortalPage from "./pages/ApplicantPortalPage";
import ReviewerPortalPage from "./pages/ReviewerPortalPage";
import AdminPortal from "./pages/AdminPortal";
import SuperAdminLoginPage from "./pages/SuperAdminLoginPage";
import SuperAdminPortalPage from "./pages/SuperAdminPortalPage";
import PersonalStatementForm from "./components/PersonalStatementForm";
import ResumeForm from "./components/ResumeForm";
import "./styles.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* Applicant */}
        <Route path="/applicant/auth" element={<ApplicantAuth />} />
        <Route path="/app" element={<ApplicantPortalPage />} />

        {/* Reviewer */}
        <Route path="/reviewer" element={<ReviewerPortalPage />} />

        {/* University Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminPortal />} />

        {/* Super Admin */}
        <Route path="/superadmin-login" element={<SuperAdminLoginPage />} />
        <Route path="/superadmin" element={<SuperAdminPortalPage />} />

        {/* Standalone scoring tools */}
        <Route path="/ps" element={<PersonalStatementForm />} />
        <Route path="/resume" element={<ResumeForm />} />

        {/* Keep this LAST */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
