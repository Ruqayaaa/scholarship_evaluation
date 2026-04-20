import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

interface Props {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

type AuthState = "loading" | "authenticated" | "unauthenticated" | "unauthorized";

export function ProtectedRoute({ children, allowedRoles, redirectTo = "/applicant/auth" }: Props) {
  const [authState, setAuthState] = useState<AuthState>("loading");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        if (!cancelled) setAuthState("unauthenticated");
        return;
      }

      if (!allowedRoles || allowedRoles.length === 0) {
        if (!cancelled) setAuthState("authenticated");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (!cancelled) {
        if (profile && allowedRoles.includes(profile.role)) {
          setAuthState("authenticated");
        } else {
          setAuthState("unauthorized");
        }
      }
    }

    check();
    return () => { cancelled = true; };
  }, [allowedRoles]);

  if (authState === "loading") {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", background: "var(--bg, #f8fafc)",
      }}>
        <div style={{ fontSize: 14, color: "#64748b", fontWeight: 600 }}>Loading…</div>
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return <Navigate to={redirectTo} replace />;
  }

  if (authState === "unauthorized") {
    return <Navigate to="/applicant/auth" replace />;
  }

  return <>{children}</>;
}
