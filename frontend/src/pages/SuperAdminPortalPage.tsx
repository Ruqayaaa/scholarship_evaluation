import { useMemo, useState } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ShieldCheck, Building2, Users, Power, Plus, Pencil } from "lucide-react";

type University = {
  id: string;
  name: string;
  status: "Active" | "Inactive";
  contactEmail: string;
};

type Reviewer = {
  id: string;
  fullName: string;
  email: string;
  universityId: string;
  role: "Reviewer" | "Head Reviewer" | "University Admin";
  status: "Active" | "Inactive";
};

type UniAdmin = {
  id: string;
  fullName: string;
  email: string;
  status: "Active" | "Inactive";
};

const uid = () => Math.random().toString(16).slice(2, 10).toUpperCase();
const uidAdmin = () => Math.random().toString(16).slice(2, 10).toUpperCase();

export default function SuperAdminPortalPage() {
  const [activeTab, setActiveTab] = useState<"Universities" | "Reviewers">(
    "Universities"
  );
  const [query, setQuery] = useState("");

  const [universities, setUniversities] = useState<University[]>([
    {
      id: "UNI-AUBH",
      name: "American University of Bahrain",
      status: "Active",
      contactEmail: "scholarships@aubh.edu.bh",
    },
    {
      id: "UNI-DCU",
      name: "Demo City University",
      status: "Inactive",
      contactEmail: "aid@dcu.edu",
    },
  ]);

  const [reviewers, setReviewers] = useState<Reviewer[]>([
    {
      id: "REV-1001",
      fullName: "Sara Ahmed",
      email: "sara.ahmed@aubh.edu.bh",
      universityId: "UNI-AUBH",
      role: "Reviewer",
      status: "Active",
    },
    {
      id: "REV-1002",
      fullName: "Omar Hassan",
      email: "omar.hassan@aubh.edu.bh",
      universityId: "UNI-AUBH",
      role: "Head Reviewer",
      status: "Active",
    },
    {
      id: "REV-2001",
      fullName: "Lina Noor",
      email: "l.noor@dcu.edu",
      universityId: "UNI-DCU",
      role: "University Admin",
      status: "Inactive",
    },
  ]);

  const [uniAdmins, setUniAdmins] = useState<Record<string, UniAdmin[]>>({
    "UNI-AUBH": [
      { id: "ADM-01", fullName: "AUBH Admin 1", email: "admin1@aubh.edu.bh", status: "Active" },
      { id: "ADM-02", fullName: "AUBH Admin 2", email: "admin2@aubh.edu.bh", status: "Inactive" },
    ],
    "UNI-DCU": [
      { id: "ADM-03", fullName: "DCU Admin", email: "admin@dcu.edu", status: "Active" },
    ],
  });

  const uniMap = useMemo(
    () => new Map(universities.map((u) => [u.id, u])),
    [universities]
  );

  const metrics = useMemo(() => {
    const activeUnis = universities.filter((u) => u.status === "Active").length;
    const activeRevs = reviewers.filter((r) => r.status === "Active").length;
    const inactiveAccounts = reviewers.filter((r) => r.status === "Inactive").length;
    return { activeUnis, activeRevs, inactiveAccounts };
  }, [universities, reviewers]);

  const filteredUniversities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return universities;
    return universities.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        u.contactEmail.toLowerCase().includes(q)
    );
  }, [universities, query]);

  const filteredReviewers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reviewers;
    return reviewers.filter((r) => {
      const uni = uniMap.get(r.universityId)?.name ?? "";
      return (
        r.fullName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        uni.toLowerCase().includes(q)
      );
    });
  }, [reviewers, query, uniMap]);

  const [uniModalOpen, setUniModalOpen] = useState(false);
  const [editingUni, setEditingUni] = useState<University | null>(null);
  const [uniEditTab, setUniEditTab] = useState<"Admins" | "Settings">("Admins");

  const [uniDraft, setUniDraft] = useState<{ name: string; contactEmail: string }>({
    name: "",
    contactEmail: "",
  });

  const [adminDraft, setAdminDraft] = useState({ fullName: "", email: "" });

  const openCreateUni = () => {
    setEditingUni(null);
    setUniEditTab("Settings");
    setUniDraft({ name: "", contactEmail: "" });
    setUniModalOpen(true);
  };

  const openEditUni = (u: University) => {
    setEditingUni(u);
    setUniDraft({ name: u.name, contactEmail: u.contactEmail });
    setUniEditTab("Admins"); 
    setUniModalOpen(true);
  };

  const closeUniModal = () => {
    setUniModalOpen(false);
    setEditingUni(null);
    setAdminDraft({ fullName: "", email: "" });
  };

  const saveUniSettings = () => {
    if (!uniDraft.name.trim() || !uniDraft.contactEmail.trim()) return;

    if (!editingUni) {
      const newUniId = `UNI-${uid()}`;
      const newUni: University = {
        id: newUniId,
        status: "Active",
        name: uniDraft.name.trim(),
        contactEmail: uniDraft.contactEmail.trim(),
      };
      setUniversities((prev) => [newUni, ...prev]);
      setUniAdmins((prev) => ({ ...prev, [newUniId]: [] }));
      closeUniModal();
      return;
    }

    setUniversities((prev) =>
      prev.map((u) =>
        u.id === editingUni.id
          ? { ...u, name: uniDraft.name.trim(), contactEmail: uniDraft.contactEmail.trim() }
          : u
      )
    );
    closeUniModal();
  };

  const toggleUniStatus = (id: string) => {
    setUniversities((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: u.status === "Active" ? "Inactive" : "Active" } : u
      )
    );


    setReviewers((prev) =>
      prev.map((r) => (r.universityId === id ? { ...r, status: "Inactive" } : r))
    );
  };


  const addUniversityAdmin = () => {
    if (!editingUni) return;
    if (!adminDraft.fullName.trim() || !adminDraft.email.trim()) return;

    setUniAdmins((prev) => {
      const list = prev[editingUni.id] ?? [];
      const newAdmin: UniAdmin = {
        id: `ADM-${uidAdmin()}`,
        fullName: adminDraft.fullName.trim(),
        email: adminDraft.email.trim(),
        status: "Active",
      };
      return { ...prev, [editingUni.id]: [newAdmin, ...list] };
    });

    setAdminDraft({ fullName: "", email: "" });
  };

  const toggleUniversityAdmin = (adminId: string) => {
    if (!editingUni) return;
    setUniAdmins((prev) => {
      const list = prev[editingUni.id] ?? [];
      return {
        ...prev,
        [editingUni.id]: list.map((a) =>
          a.id === adminId ? { ...a, status: a.status === "Active" ? "Inactive" : "Active" } : a
        ),
      };
    });
  };

  const removeUniversityAdmin = (adminId: string) => {
    if (!editingUni) return;
    setUniAdmins((prev) => {
      const list = prev[editingUni.id] ?? [];
      return { ...prev, [editingUni.id]: list.filter((a) => a.id !== adminId) };
    });
  };

  const [revModalOpen, setRevModalOpen] = useState(false);
  const [editingRev, setEditingRev] = useState<Reviewer | null>(null);
  const [revDraft, setRevDraft] = useState<Omit<Reviewer, "id" | "status">>({
    fullName: "",
    email: "",
    universityId: universities[0]?.id ?? "",
    role: "Reviewer",
  });

  const openCreateRev = () => {
    setEditingRev(null);
    setRevDraft({
      fullName: "",
      email: "",
      universityId: universities[0]?.id ?? "",
      role: "Reviewer",
    });
    setRevModalOpen(true);
  };

  const openEditRev = (r: Reviewer) => {
    setEditingRev(r);
    setRevDraft({
      fullName: r.fullName,
      email: r.email,
      universityId: r.universityId,
      role: r.role,
    });
    setRevModalOpen(true);
  };

  const closeRevModal = () => {
    setRevModalOpen(false);
    setEditingRev(null);
  };

  const saveRev = () => {
    if (!revDraft.fullName.trim() || !revDraft.email.trim() || !revDraft.universityId) return;

    if (editingRev) {
      setReviewers((prev) =>
        prev.map((r) => (r.id === editingRev.id ? { ...r, ...revDraft } : r))
      );
    } else {
      const newRev: Reviewer = {
        id: `REV-${uid()}`,
        status: "Active",
        ...revDraft,
      };
      setReviewers((prev) => [newRev, ...prev]);
    }
    closeRevModal();
  };

  const toggleRevStatus = (id: string) => {
    setReviewers((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: r.status === "Active" ? "Inactive" : "Active" } : r
      )
    );
  };

  return (
   <div className="bg-shell">
  <div className="superadmin-layout">

    <aside className="side superadmin-side">

      <div className="side-head">
        <div className="side-brand">
          <div className="side-logo">
            <ShieldCheck className="side-icon" />
          </div>
          <div>
            <p className="side-title">Super Admin</p>
            <p className="side-sub">System Manager Console</p>
          </div>
        </div>
      </div>


      <div className="side-nav">
        <button
          className={`side-item sa-small ${
            activeTab === "Universities" ? "is-active" : ""
          }`}
          onClick={() => setActiveTab("Universities")}
        >
          <Building2 className="side-icon" />
          <span className="side-label">Universities</span>
        </button>

        <button
          className={`side-item sa-small ${
            activeTab === "Reviewers" ? "is-active" : ""
          }`}
          onClick={() => setActiveTab("Reviewers")}
        >
          <Users className="side-icon" />
          <span className="side-label">Reviewers</span>
        </button>
      </div>


      <div className="reviewer-footer-card superadmin-footer">
        <div className="reviewer-footer-avatar">A</div>

        <div className="reviewer-footer-meta">
          <div className="reviewer-footer-title">Admin</div>
          <div className="reviewer-footer-text">admin@system</div>

          <button
            type="button"
            className="reviewer-logout-inline"
            onClick={() => (window.location.href = "/")}
          >
            Log out
          </button>
        </div>
      </div>
    </aside>




        {/* Main */}
        <main className="superadmin-main">
          <div className="superadmin-page">
            <div className="superadmin-page-head">
              <h1 className="superadmin-page-title" style={{ color: "var(--navy)" }}>
                {activeTab === "Universities" ? "Universities" : "Reviewers"}
              </h1>
              <p className="superadmin-page-sub">
                {activeTab === "Universities"
                  ? "Create, edit, and manage universities + admins."
                  : "Control reviewer accounts and access."}
              </p>
            </div>

            {/* Metrics */}
            <div className="superadmin-metrics">
              <div className="admin-card">
                <div className="admin-card-head">
                  <div className="admin-card-head-row">
                    <div className="admin-card-title">Active Universities</div>
                    <span className="badge badge-outline">Live</span>
                  </div>
                </div>
                <div className="admin-card-body">
                  <div className="stat-num">{metrics.activeUnis}</div>
                </div>
              </div>

              <div className="admin-card">
                <div className="admin-card-head">
                  <div className="admin-card-head-row">
                    <div className="admin-card-title">Active Reviewers</div>
                    <span className="badge badge-outline">Enabled</span>
                  </div>
                </div>
                <div className="admin-card-body">
                  <div className="stat-num">{metrics.activeRevs}</div>
                </div>
              </div>

              <div className="admin-card">
                <div className="admin-card-head">
                  <div className="admin-card-head-row">
                    <div className="admin-card-title">Inactive Accounts</div>
                    <span className="badge badge-outline">Blocked</span>
                  </div>
                </div>
                <div className="admin-card-body">
                  <div className="stat-num">{metrics.inactiveAccounts}</div>
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="superadmin-toolbar">
              <div className="superadmin-toolbar-right">
                <input
                  className="field"
                  style={{ width: 320 }}
                  placeholder={`Search ${activeTab.toLowerCase()}...`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />

                {activeTab === "Universities" ? (
                  <button className="btn btn-primary" onClick={openCreateUni}>
                    <Plus width={16} height={16} /> New University
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={openCreateRev}>
                    <Plus width={16} height={16} /> Add Reviewer
                  </button>
                )}
              </div>
            </div>

            <div className="sep" />

            {/* Table Card */}
            <div className="admin-card" style={{ marginTop: 14 }}>
              <div className="admin-card-head">
                <div className="admin-card-head-row">
                  <div className="admin-card-title">
                    {activeTab === "Universities" ? "University List" : "Reviewer List"}
                  </div>
                </div>
              </div>

              <div className="admin-card-body">
                <div className="table-wrap">
                  {activeTab === "Universities" ? (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>University</th>
                          <th>Admins</th>
                          <th>Status</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUniversities.map((u) => {
                          const admins = uniAdmins[u.id] ?? [];
                          const activeAdmins = admins.filter((a) => a.status === "Active").length;

                          return (
                            <tr key={u.id}>
                              <td>
                                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                  <div>
                                    <div style={{ fontWeight: 800 }}>{u.name}</div>
                                    <div className="muted" style={{ fontSize: 12 }}>
                                      {u.id} • {u.contactEmail}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="muted">
                                {activeAdmins} active / {admins.length} total
                              </td>

                              <td>
                                <span className={`status ${u.status === "Active" ? "ok" : ""}`}>
                                  {u.status}
                                </span>
                              </td>

                              <td style={{ textAlign: "right" }}>
                                <button className="btn btn-outline btn-sm" onClick={() => openEditUni(u)}>
                                  <Pencil width={16} height={16} /> Edit
                                </button>{" "}
                                <button
                                  className={`btn ${u.status === "Active" ? "btn-outline" : "btn-primary"} btn-sm`}
                                  onClick={() => toggleUniStatus(u.id)}
                                >
                                  <Power width={16} height={16} />{" "}
                                  {u.status === "Active" ? "Deactivate" : "Activate"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Reviewer</th>
                          <th>University</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReviewers.map((r) => {
                          const uniName = uniMap.get(r.universityId)?.name ?? "—";
                          return (
                            <tr key={r.id}>
                              <td>
                                <div style={{ fontWeight: 800 }}>{r.fullName}</div>
                                <div className="muted" style={{ fontSize: 12 }}>
                                  {r.email} • {r.id}
                                </div>
                              </td>
                              <td className="muted">{uniName}</td>
                              <td className="muted">{r.role}</td>
                              <td>
                                <span className={`status ${r.status === "Active" ? "ok" : ""}`}>
                                  {r.status}
                                </span>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <button className="btn btn-outline btn-sm" onClick={() => openEditRev(r)}>
                                  <Pencil width={16} height={16} /> Edit
                                </button>{" "}
                                <button
                                  className={`btn ${r.status === "Active" ? "btn-outline" : "btn-primary"} btn-sm`}
                                  onClick={() => toggleRevStatus(r.id)}
                                >
                                  <Power width={16} height={16} />{" "}
                                  {r.status === "Active" ? "Deactivate" : "Activate"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* =========================
          UNIVERSITY
      ========================= */}
      {uniModalOpen && (
        <div className="sa-modal-overlay" onClick={closeUniModal}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-head">
              <div>
                <h3 className="sa-modal-title" style={{ color: "var(--navy)" }}>
                  {editingUni ? "Edit University" : "New University"}
                </h3>
                <p className="sa-modal-sub">
                  {editingUni ? `${editingUni.name} • ${editingUni.id}` : "Create a new university"}
                </p>
              </div>

              <button className="sa-modal-close" onClick={closeUniModal}>
                ✕
              </button>
            </div>

            <div className="sa-modal-body">
              <div className="sa-tabs">
                <button
                  className={`sa-tab ${uniEditTab === "Admins" ? "is-active" : ""}`}
                  onClick={() => setUniEditTab("Admins")}
                  disabled={!editingUni}
                  style={!editingUni ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                >
                  Admins
                </button>
                <button
                  className={`sa-tab ${uniEditTab === "Settings" ? "is-active" : ""}`}
                  onClick={() => setUniEditTab("Settings")}
                >
                  Settings
                </button>
              </div>

              {uniEditTab === "Admins" && editingUni && (
                <>
                  <div className="sa-grid">
                    <div style={{ display: "grid", gap: 8 }}>
                      <Label>Admin Full Name</Label>
                      <Input
                        value={adminDraft.fullName}
                        onChange={(e) => setAdminDraft((p) => ({ ...p, fullName: e.target.value }))}
                        placeholder="e.g., Sara Ahmed"
                      />
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      <Label>Admin Email</Label>
                      <Input
                        value={adminDraft.email}
                        onChange={(e) => setAdminDraft((p) => ({ ...p, email: e.target.value }))}
                        placeholder="e.g., sara@uni.edu"
                      />
                    </div>
                  </div>

                  <div className="sa-actions">
                    <button className="btn btn-primary" onClick={addUniversityAdmin}>
                      <Plus width={16} height={16} /> Add Admin
                    </button>
                  </div>

                  <div className="sep" style={{ margin: "14px 0" }} />

                  <div style={{ fontWeight: 900, color: "var(--navy)", marginBottom: 10 }}>
                    Current Admins
                  </div>

                  {(uniAdmins[editingUni.id] ?? []).length === 0 ? (
                    <div className="muted">No admins added yet.</div>
                  ) : (
                    <div>
                      {(uniAdmins[editingUni.id] ?? []).map((a) => (
                        <div className="sa-row" key={a.id}>
                          <div>
                            <div className="sa-row-title">{a.fullName}</div>
                            <div className="sa-row-sub">{a.email} • {a.id}</div>
                          </div>

                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span className={`status ${a.status === "Active" ? "ok" : ""}`}>
                              {a.status}
                            </span>

                            <button
                              className={`btn ${a.status === "Active" ? "btn-outline" : "btn-primary"} btn-sm`}
                              onClick={() => toggleUniversityAdmin(a.id)}
                            >
                              <Power width={16} height={16} />{" "}
                              {a.status === "Active" ? "Deactivate" : "Activate"}
                            </button>

                            <button className="btn btn-outline btn-sm" onClick={() => removeUniversityAdmin(a.id)}>
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {uniEditTab === "Admins" && !editingUni && (
                <div className="muted">Create the university first, then you can add admins.</div>
              )}

              {uniEditTab === "Settings" && (
                <>
                  <div className="sa-grid">
                    <div style={{ display: "grid", gap: 8 }}>
                      <Label>University Name</Label>
                      <Input
                        value={uniDraft.name}
                        onChange={(e) => setUniDraft((p) => ({ ...p, name: e.target.value }))}
                      />
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      <Label>Contact Email</Label>
                      <Input
                        value={uniDraft.contactEmail}
                        onChange={(e) => setUniDraft((p) => ({ ...p, contactEmail: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="sa-actions">
                    <button className="btn btn-outline" onClick={closeUniModal}>
                      Cancel
                    </button>
                    <button className="btn btn-primary" onClick={saveUniSettings}>
                      {editingUni ? "Save Changes" : "Create University"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REVIEWER MODAL */}
      {revModalOpen && (
        <div className="sa-modal-overlay" onClick={closeRevModal}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-head">
              <div>
                <h3 className="sa-modal-title" style={{ color: "var(--navy)" }}>
                  {editingRev ? "Edit Reviewer" : "Add Reviewer"}
                </h3>
                <p className="sa-modal-sub">
                  {editingRev ? `${editingRev.fullName} • ${editingRev.id}` : "Create a new reviewer account"}
                </p>
              </div>

              <button className="sa-modal-close" onClick={closeRevModal}>
                ✕
              </button>
            </div>

            <div className="sa-modal-body">
              <div className="sa-grid">
                <div style={{ display: "grid", gap: 8 }}>
                  <Label>Full Name</Label>
                  <Input
                    value={revDraft.fullName}
                    onChange={(e) => setRevDraft((p) => ({ ...p, fullName: e.target.value }))}
                  />
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <Label>Email</Label>
                  <Input
                    value={revDraft.email}
                    onChange={(e) => setRevDraft((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="sa-actions">
                <button className="btn btn-outline" onClick={closeRevModal}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={saveRev}>
                  {editingRev ? "Save Changes" : "Create Reviewer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
