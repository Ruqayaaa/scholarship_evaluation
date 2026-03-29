import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { adminFetch } from "../lib/api";

type Reviewer = { id: string; name: string; email: string };
type ApplicantRow = { assignedReviewerIds: string[] };

export function ReviewerManagement() {
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [assignedCounts, setAssignedCounts] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  function load() {
    adminFetch(`/reviewers`).then((r) => r.json()).then(setReviewers).catch(() => {});
    adminFetch(`/admin/applicants`)
      .then((r) => r.json())
      .then((applicants: ApplicantRow[]) => {
        const counts: Record<string, number> = {};
        applicants.forEach((a) =>
          a.assignedReviewerIds.forEach((id) => {
            counts[id] = (counts[id] ?? 0) + 1;
          })
        );
        setAssignedCounts(counts);
      })
      .catch(() => {});
  }

  useEffect(() => { load(); }, []);

  async function addReviewer() {
    setError("");
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Name, email and password are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.trim().length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setAdding(true);
    const res = await adminFetch(`/reviewers`, {
      method: "POST",
      body: JSON.stringify({ name: name.trim(), email: email.trim(), password: password.trim() }),
    });
    setAdding(false);
    if (res.ok) { setName(""); setEmail(""); setPassword(""); load(); }
    else { const d = await res.json(); setError(d.error ?? "Failed to add reviewer."); }
  }

  async function deleteReviewer(id: string) {
    await adminFetch(`/reviewers/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1 className="admin-title">Reviewer Management</h1>
        <p className="admin-subtitle">Add reviewers, then assign them to applicants from the Applicants tab</p>
      </div>

      {/* Stats */}
      <div className="admin-grid admin-grid-4" style={{ marginBottom: 14 }}>
        <div className="admin-card">
          <div className="admin-card-body">
            <div className="muted stat-label">Total Reviewers</div>
            <div className="stat-num">{reviewers.length}</div>
          </div>
        </div>
        <div className="admin-card">
          <div className="admin-card-body">
            <div className="muted stat-label">Total Assigned</div>
            <div className="stat-num">{Object.values(assignedCounts).reduce((a, b) => a + b, 0)}</div>
          </div>
        </div>
      </div>

      {/* Add reviewer form */}
      <Card className="admin-card" style={{ marginBottom: 14 }}>
        <CardHeader className="admin-card__header">
          <CardTitle className="admin-card__title">Add Reviewer</CardTitle>
        </CardHeader>
        <CardContent className="admin-card__content">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
            <Input
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: 180 }}
            />
            <Input
              placeholder="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: 220 }}
            />
            <Input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: 160 }}
            />
            <Button className="admin-primary-btn" onClick={addReviewer} disabled={adding}>
              {adding ? "Adding…" : "Add Reviewer"}
            </Button>
          </div>
          {error && <p style={{ color: "#ef4444", marginTop: 8, fontSize: 13 }}>{error}</p>}
        </CardContent>
      </Card>

      {/* Reviewers table */}
      <Card className="admin-card">
        <CardHeader className="admin-card__header">
          <CardTitle className="admin-card__title">Reviewers</CardTitle>
        </CardHeader>
        <CardContent className="admin-card__content">
          {reviewers.length === 0 ? (
            <p className="admin-empty">No reviewers yet. Add one above.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Assigned Applicants</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {reviewers.map((r) => {
                    const assigned = assignedCounts[r.id] ?? 0;
                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td className="muted">{r.email}</td>
                        <td>{assigned}</td>
                        <td>
                          <Badge
                            variant="outline"
                            className={assigned > 0 ? "admin-badge admin-badge--info" : "admin-badge admin-badge--muted"}
                          >
                            {assigned > 0 ? "Active" : "Unassigned"}
                          </Badge>
                        </td>
                        <td>
                          <Button
                            variant="outline"
                            onClick={() => deleteReviewer(r.id)}
                            style={{ color: "#ef4444", borderColor: "#ef4444", fontSize: 13, padding: "4px 10px" }}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
