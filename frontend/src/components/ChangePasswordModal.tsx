import { useState } from "react";
import { supabase } from "../lib/supabase";

interface Props {
  onClose: () => void;
}

export default function ChangePasswordModal({ onClose }: Props) {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleSave() {
    setMsg(null);
    if (newPassword.length < 6) {
      setMsg({ text: "Password must be at least 6 characters.", ok: false });
      return;
    }
    if (newPassword !== confirm) {
      setMsg({ text: "Passwords do not match.", ok: false });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) {
      setMsg({ text: error.message, ok: false });
    } else {
      setMsg({ text: "Password updated successfully.", ok: true });
      setTimeout(onClose, 1400);
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)", display: "flex",
        alignItems: "center", justifyContent: "center",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#fff", borderRadius: 16, padding: 28,
          width: "100%", maxWidth: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          display: "flex", flexDirection: "column", gap: 16,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 17, color: "var(--navy)" }}>
          Change Password
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>
            New Password
          </label>
          <input
            type="password"
            className="input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min. 6 characters"
            autoFocus
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>
            Confirm Password
          </label>
          <input
            type="password"
            className="input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat new password"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
        </div>

        {msg && (
          <div
            style={{
              fontSize: 13, fontWeight: 600, padding: "8px 12px", borderRadius: 8,
              background: msg.ok ? "rgba(22,163,74,0.1)" : "rgba(239,68,68,0.1)",
              color: msg.ok ? "#16a34a" : "#dc2626",
            }}
          >
            {msg.text}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="ghost-btn" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="primary-btn" type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Password"}
          </button>
        </div>
      </div>
    </div>
  );
}
