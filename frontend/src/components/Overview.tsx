import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { adminFetch, toLlmScore } from "../lib/api";

interface OverviewProps {
  onViewApplicants: () => void;
  cycleId?: string;
}

type Stats = { total: number; submitted: number; underReview: number; reviewers: number };
type Row   = { id: string; name: string; submittedAt: string; status: string; llmScore: number | null };
type BackendApplicant = {
  id: string;
  name: string;
  submittedAt: string;
  status: string;
  personalStatement: { score: Record<string, number> } | null;
  resume: { score: Record<string, number> } | null;
};

const STATS_CONFIG = [
  { key: "total",       label: "Total Applicants",  sub: "All submissions"   },
  { key: "submitted",   label: "Submitted",          sub: "Awaiting review"  },
  { key: "underReview", label: "Under Review",       sub: "Reviewer assigned" },
  { key: "reviewers",   label: "Active Reviewers",   sub: "Total registered"  },
] as const;

export function Overview({ onViewApplicants, cycleId }: OverviewProps) {
  const [stats, setStats] = useState<Stats>({ total: 0, submitted: 0, underReview: 0, reviewers: 0 });
  const [latest, setLatest] = useState<Row[]>([]);

  useEffect(() => {
    const qs = cycleId ? `?cycleId=${cycleId}` : "";

    adminFetch(`/admin/stats${qs}`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});

    adminFetch(`/admin/applicants${qs}`)
      .then((r) => r.json())
      .then((data: BackendApplicant[]) => {
        const rows: Row[] = data
          .slice(-5)
          .reverse()
          .map((a) => ({
            id: a.id,
            name: a.name,
            submittedAt: new Date(a.submittedAt).toLocaleDateString(),
            status: a.status,
            llmScore: toLlmScore(a),
          }));
        setLatest(rows);
      })
      .catch(() => {});
  }, [cycleId]);

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h1 className="admin-page-title">Overview</h1>
        <p className="admin-page-sub">Monitor applications and evaluation progress</p>
      </div>

      {/* Stat cards */}
      <div className="ds-stat-grid">
        {STATS_CONFIG.map(({ key, label, sub }) => (
          <div key={key} className="ds-stat-card">
            <div className="ds-stat-label">{label}</div>
            <div className="ds-stat-num">{stats[key]}</div>
            <div className="ds-stat-sub">{sub}</div>
          </div>
        ))}
      </div>

      {/* Recent submissions table */}
      <div className="ds-table-card">
        <div className="ds-table-head">
          <h2 className="ds-table-title">Recent Submissions</h2>
          <Button variant="outline" size="sm" onClick={onViewApplicants}>
            View All
          </Button>
        </div>

        {latest.length === 0 ? (
          <p className="admin-empty" style={{ padding: "20px 18px" }}>
            No submissions yet.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>AI Score (/100)</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((a) => (
                  <tr key={a.id}>
                    <td className="admin-td--name">{a.name}</td>
                    <td className="admin-td--muted">{a.submittedAt}</td>
                    <td>
                      <span className={`status ${a.status === "Under Review" ? "info" : ""}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="admin-td--num">
                      {a.llmScore != null ? a.llmScore.toFixed(1) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
