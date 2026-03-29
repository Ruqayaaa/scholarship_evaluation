import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import archiver from "archiver";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 5000;

// ── Supabase clients ──────────────────────────────────────────────────────────

// Admin client: service role, bypasses RLS — used for admin/reviewer operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// User-scoped client: uses the caller's JWT so RLS policies are satisfied.
// Used for applicant submit operations where auth.uid() must match applicant_id.
function userClient(token) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

// ── Middleware ────────────────────────────────────────────────────────────────
const corsOptions = {
  origin: (origin, callback) => {
    const allowed = [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ];
    if (!origin || allowed.includes(origin) || /^https:\/\/.*\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.options("*", cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ── Auth middleware ───────────────────────────────────────────────────────────
async function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return res.status(401).json({ error: "Invalid token" });

  req.user = user;
  next();
}

// ── Score normalizers ─────────────────────────────────────────────────────────

const PS_KEYS = [
  "interests_and_values",
  "academic_commitment",
  "clarity_of_vision",
  "organization",
  "language_quality",
];

const RESUME_KEYS = [
  "academic_achievement",
  "leadership_and_extracurriculars",
  "community_service",
  "research_and_work_experience",
  "skills_and_certifications",
  "awards_and_recognition",
];

/**
 * The model wraps criterion scores under a "criteria" key and sets overall_score=0.
 * Flatten to top level and recalculate overall_score from the actual criteria values.
 */
function normalizePsScore(score) {
  if (!score || typeof score !== "object") return score;
  let flat = { ...score };

  // Flatten nested "criteria" key to top level
  if (flat.criteria && typeof flat.criteria === "object") {
    flat = { ...flat, ...flat.criteria };
  }

  // Recalculate overall_score from criteria (fixes model outputting 0)
  const total = PS_KEYS.reduce((sum, k) => sum + (Number(flat[k]) || 0), 0);
  if (total > 0) {
    flat.overall_score = total;
    flat.grade_pct = parseFloat(((total / 100) * 100).toFixed(1));
  }

  // Ensure strengths/improvements are always arrays
  if (!Array.isArray(flat.strengths)) flat.strengths = [];
  if (!Array.isArray(flat.improvements)) flat.improvements = [];

  return flat;
}

/**
 * Recalculate resume overall_score from criteria in case model set it to 0.
 */
const RESUME_CRITERION_FEEDBACK = {
  academic_achievement: {
    strength:    "Strong academic record with notable grades and scholarly achievements",
    improvement: "Academic record shows room for improvement in grades or academic engagement",
  },
  leadership_and_extracurriculars: {
    strength:    "Demonstrates meaningful leadership roles and active extracurricular involvement",
    improvement: "Limited evidence of leadership experience or extracurricular participation",
  },
  community_service: {
    strength:    "Shows consistent commitment to community service and volunteer work",
    improvement: "Community involvement is minimal and could be significantly expanded",
  },
  research_and_work_experience: {
    strength:    "Highlights relevant research projects or professional work experience",
    improvement: "Work or research experience is limited — more practical experience is recommended",
  },
  skills_and_certifications: {
    strength:    "Presents a well-rounded skill set supported by relevant certifications",
    improvement: "Skills and certifications section lacks depth or relevant qualifications",
  },
  awards_and_recognition: {
    strength:    "Recognized for outstanding achievements through awards and honors",
    improvement: "Few awards or recognitions listed — stronger accomplishments would strengthen the application",
  },
};

function normalizeResumeScore(score) {
  if (!score || typeof score !== "object") return score;
  const flat = { ...score };

  const total = RESUME_KEYS.reduce((sum, k) => sum + (Number(flat[k]) || 0), 0);
  if (total > 0) flat.overall_score = total;

  // Always regenerate qualitative feedback so it explains why, not just restates the score.
  flat.strengths = RESUME_KEYS
    .filter((k) => (Number(flat[k]) || 0) >= 21)
    .map((k) => RESUME_CRITERION_FEEDBACK[k].strength);

  flat.improvements = RESUME_KEYS
    .filter((k) => (Number(flat[k]) || 0) <= 10 && (Number(flat[k]) || 0) > 0)
    .map((k) => RESUME_CRITERION_FEEDBACK[k].improvement);

  return flat;
}

// ── Helper: convert DB application row → frontend BackendApplicant shape ──────
// Pass the caller's scoped db client so RLS is satisfied for every query.
async function toApplicantShape(app, db = supabase) {
  const [{ data: assignments }, { data: profile }, { data: evaluations }] = await Promise.all([
    db.from("reviewer_assignments").select("reviewer_id").eq("application_id", app.id),
    db.from("profiles").select("name").eq("id", app.applicant_id).single(),
    db.from("reviewer_evaluations").select("*").eq("application_id", app.id),
  ]);

  // Extract metadata stored inside personal_statement_input JSONB
  const psInput = app.personal_statement_input || {};
  const portfolioUrl    = psInput._portfolio_url    || null;
  const portfolioName   = psInput._portfolio_name   || null;
  const interviewAt     = psInput._interview_at     || null;
  const interviewMessage = psInput._interview_message || "";

  return {
    id: app.id,
    applicantId: app.applicant_id,
    cycleId: app.cycle_id || null,
    name: profile?.name || "Applicant",
    submittedAt: app.submitted_at || app.created_at,
    status: app.status,
    finalDecision: app.final_decision || "Pending",
    decisionNotes: app.decision_notes || "",
    decisionAt: app.decision_at || null,
    interviewAt,
    interviewMessage,
    assignedReviewerIds: assignments?.map((a) => a.reviewer_id) || [],
    reviewerEvaluations: evaluations || [],
    personalStatement: app.personal_statement_input
      ? {
          input: app.personal_statement_input,
          score: normalizePsScore(app.personal_statement_score) || {},
        }
      : null,
    resume: app.resume_input
      ? {
          input: app.resume_input,
          score: normalizeResumeScore(app.resume_score) || {},
        }
      : null,
    portfolio: portfolioUrl
      ? {
          summary: portfolioName || "Portfolio",
          items: [{ title: portfolioName || "Portfolio", description: "", url: portfolioUrl }],
        }
      : null,
  };
}

// ── CSV helper ────────────────────────────────────────────────────────────────
function toCSV(headers, rows) {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

// ── Helper: get a db client scoped to the caller's token ─────────────────────
function reqDb(req) {
  const token = req.headers.authorization?.split(" ")[1];
  return token ? userClient(token) : supabase;
}

// ── Helper: upsert an application for applicantId in the active cycle ─────────
async function upsertApplication(db, applicantId, fields) {
  const { data: activeCycle } = await supabase
    .from("cycles").select("id").eq("status", "active")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  const cycleId = activeCycle?.id || null;

  let q = db.from("applications").select("id").eq("applicant_id", applicantId);
  q = cycleId ? q.eq("cycle_id", cycleId) : q.is("cycle_id", null);
  const { data: existing } = await q.maybeSingle();

  if (existing) {
    const { data, error } = await db.from("applications")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", existing.id).select().single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await db.from("applications")
      .insert({ applicant_id: applicantId, cycle_id: cycleId, submitted_at: new Date().toISOString(), ...fields })
      .select().single();
    if (error) throw error;
    return data;
  }
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// ── Original scoring endpoint (unchanged) ─────────────────────────────────────
app.post("/score/personal-statement", (req, res) => {
  res.json({
    success: true,
    total_score: 8,
    message: "POST route is working",
    received: req.body,
  });
});

// ── Applicant: get own application ───────────────────────────────────────────
app.get("/applicants/:applicantId/application", authenticate, async (req, res) => {
  try {
    // Find the active cycle — if none exists, applicant can't have a current application
    const { data: activeCycle, error: cycleErr } = await supabase
      .from("cycles").select("id").eq("status", "active")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    // No active cycle (or cycles table not set up yet) → no current application
    if (cycleErr || !activeCycle?.id) return res.json(null);

    const { data, error } = await supabase
      .from("applications").select("*")
      .eq("applicant_id", req.params.applicantId)
      .eq("cycle_id", activeCycle.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.json(null);

    res.json(await toApplicantShape(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Applicant: submit personal statement ─────────────────────────────────────
app.post("/applicants/submit/personal-statement", authenticate, async (req, res) => {
  try {
    const { applicantId, input, score, name } = req.body;
    if (!applicantId) return res.status(400).json({ error: "applicantId required" });
    const db = reqDb(req);
    if (name) await db.from("profiles").update({ name }).eq("id", applicantId);
    const data = await upsertApplication(db, applicantId, {
      personal_statement_input: input,
      personal_statement_score: score,
      status: "Submitted",
    });
    res.json({ ok: true, applicant: await toApplicantShape(data, db) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Applicant: submit resume ──────────────────────────────────────────────────
app.post("/applicants/submit/resume", authenticate, async (req, res) => {
  try {
    const { applicantId, input, score } = req.body;
    if (!applicantId) return res.status(400).json({ error: "applicantId required" });
    const db = reqDb(req);
    const data = await upsertApplication(db, applicantId, {
      resume_input: input,
      resume_score: score,
      status: "Submitted",
    });
    res.json({ ok: true, applicant: await toApplicantShape(data, db) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Applicant: submit portfolio (uploads file via service role, saves URL in JSONB) ─
// Accepts either:
//   { applicantId, portfolioUrl, portfolioName }  — legacy: URL already uploaded by client
//   { applicantId, fileData (base64), fileName, mimeType } — new: backend handles storage upload
app.post("/applicants/submit/portfolio", authenticate, async (req, res) => {
  try {
    const { applicantId, portfolioUrl: clientUrl, portfolioName: clientName,
            fileData, fileName, mimeType } = req.body;
    if (!applicantId) return res.status(400).json({ error: "applicantId required" });
    if (!clientUrl && !fileData) return res.status(400).json({ error: "fileData or portfolioUrl required" });

    let finalUrl = clientUrl || null;
    let finalName = clientName || fileName || "Portfolio";

    // If file bytes sent, upload to Supabase Storage using service role
    if (fileData && fileName) {
      const buffer = Buffer.from(fileData, "base64");
      const path = `${applicantId}/${Date.now()}_${fileName}`;

      // Ensure bucket exists (service role can create it)
      await supabase.storage.createBucket("portfolios", { public: true }).catch(() => {});

      const { error: uploadErr } = await supabase.storage
        .from("portfolios")
        .upload(path, buffer, { contentType: mimeType || "application/octet-stream", upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("portfolios").getPublicUrl(path);
      finalUrl = urlData.publicUrl;
      finalName = fileName;
    }

    // Find the active cycle
    const { data: activeCycle } = await supabase
      .from("cycles").select("id").eq("status", "active")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    // Find the applicant's current application (service role bypasses RLS)
    let q = supabase.from("applications").select("id, personal_statement_input")
      .eq("applicant_id", applicantId);
    q = activeCycle?.id ? q.eq("cycle_id", activeCycle.id) : q.is("cycle_id", null);
    const { data: existing, error: findErr } = await q.maybeSingle();
    if (findErr) throw findErr;
    if (!existing) return res.status(404).json({ error: "No application found for this applicant" });

    // Merge portfolio info into the existing JSONB without touching other fields
    const updatedInput = {
      ...(existing.personal_statement_input || {}),
      _portfolio_url:  finalUrl,
      _portfolio_name: finalName,
    };

    const { error: updateErr } = await supabase
      .from("applications")
      .update({ personal_statement_input: updatedInput, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (updateErr) throw updateErr;

    res.json({ ok: true, portfolioUrl: finalUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Cycles: list ─────────────────────────────────────────────────────────────
app.get("/admin/cycles", async (req, res) => {
  try {
    const db = reqDb(req);
    const { data, error } = await db
      .from("cycles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Cycles: create ────────────────────────────────────────────────────────────
app.post("/admin/cycles", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "name required" });
    const db = reqDb(req);
    const { data, error } = await db
      .from("cycles")
      .insert({ name: name.trim() })
      .select()
      .single();
    if (error) throw error;
    res.json({ ok: true, cycle: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Cycles: end/archive ───────────────────────────────────────────────────────
app.patch("/admin/cycles/:id/end", async (req, res) => {
  try {
    const db = reqDb(req);
    const { data, error } = await db
      .from("cycles")
      .update({ status: "archived", ended_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ ok: true, cycle: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Cycles: download ZIP (applications.csv + scores.csv) ─────────────────────
app.get("/admin/cycles/:id/download", async (req, res) => {
  try {
    const { data: cycle, error: cycleErr } = await supabase
      .from("cycles").select("*").eq("id", req.params.id).single();
    if (cycleErr || !cycle) return res.status(404).json({ error: "Cycle not found" });

    const { data: apps = [] } = await supabase
      .from("applications").select("*")
      .eq("cycle_id", req.params.id)
      .order("submitted_at", { ascending: true });

    const appIds = apps.map((a) => a.id);
    const applicantIds = [...new Set(apps.map((a) => a.applicant_id))];

    const [{ data: profiles = [] }, { data: { users = [] } }, { data: evaluations = [] }] =
      await Promise.all([
        supabase.from("profiles").select("id, name").in("id", applicantIds.length ? applicantIds : ["_"]),
        supabase.auth.admin.listUsers({ perPage: 1000 }),
        appIds.length
          ? supabase.from("reviewer_evaluations").select("*").in("application_id", appIds)
          : Promise.resolve({ data: [] }),
      ]);

    const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p.name]));
    const emailMap   = Object.fromEntries(users.map((u) => [u.id, u.email]));
    const evalMap    = Object.fromEntries(evaluations.map((e) => [e.application_id, e]));

    // applications.csv
    const appHeaders = [
      "Name", "Email", "Submitted At", "Status", "Final Decision", "Decision Notes",
      "Personal Statement", "Leadership Experience", "Career Goals", "Academic Goals", "Resume Text",
    ];
    const appRows = apps.map((a) => {
      const ps = a.personal_statement_input || {};
      const re = a.resume_input || {};
      return [
        profileMap[a.applicant_id] || "",
        emailMap[a.applicant_id]   || "",
        a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : "",
        a.status || "",
        a.final_decision || "",
        a.decision_notes || "",
        ps.personal_statement      || "",
        ps.leadership_experience   || "",
        ps.career_goals            || "",
        ps.academic_goals          || "",
        re.resume_text             || "",
      ];
    });

    // scores.csv
    const scoreHeaders = [
      "Name", "Email",
      "PS: Interests & Values (/20)", "PS: Academic Commitment (/20)", "PS: Clarity of Vision (/20)",
      "PS: Organization (/20)", "PS: Language Quality (/20)", "PS: Overall (/100)",
      "Resume: Academic Achievement (/30)", "Resume: Leadership (/30)", "Resume: Community Service (/30)",
      "Resume: Research & Work (/30)", "Resume: Skills (/30)", "Resume: Awards (/30)", "Resume: Overall (/180)",
      "Reviewer Recommendation", "Reviewer Notes", "Reviewer Score (/100)", "Final Decision",
    ];
    const scoreRows = apps.map((a) => {
      const ps = normalizePsScore(a.personal_statement_score) || {};
      const re = normalizeResumeScore(a.resume_score) || {};
      const ev = evalMap[a.id] || {};
      const revScores = ev.scores || {};
      const vals = Object.entries(revScores)
        .filter(([k]) => !k.startsWith("_"))
        .map(([, v]) => (typeof v === "number" ? v : 0));
      const revScore = vals.length
        ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10)
        : "";
      return [
        profileMap[a.applicant_id] || "",
        emailMap[a.applicant_id]   || "",
        ps.interests_and_values    ?? "",
        ps.academic_commitment     ?? "",
        ps.clarity_of_vision       ?? "",
        ps.organization            ?? "",
        ps.language_quality        ?? "",
        ps.overall_score           ?? "",
        re.academic_achievement              ?? "",
        re.leadership_and_extracurriculars   ?? "",
        re.community_service                 ?? "",
        re.research_and_work_experience      ?? "",
        re.skills_and_certifications         ?? "",
        re.awards_and_recognition            ?? "",
        re.overall_score                     ?? "",
        ev.recommendation || "",
        ev.notes          || "",
        revScore,
        a.final_decision  || "",
      ];
    });

    const appCsv   = toCSV(appHeaders, appRows);
    const scoreCsv = toCSV(scoreHeaders, scoreRows);
    const safeName = cycle.name.replace(/[^a-zA-Z0-9\-_]/g, "_");

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.zip"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => { if (!res.headersSent) res.status(500).end(err.message); });
    archive.pipe(res);
    archive.append(appCsv,   { name: "applications.csv" });
    archive.append(scoreCsv, { name: "scores.csv" });
    await archive.finalize();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// ── Admin: list all applicants ────────────────────────────────────────────────
app.get("/admin/applicants", async (req, res) => {
  try {
    const db = reqDb(req);
    const cycleId = req.query.cycleId;

    let query = db.from("applications").select("*").order("created_at", { ascending: false });
    if (cycleId) query = query.eq("cycle_id", cycleId);
    const { data, error } = await query;

    if (error) throw error;

    const applicants = await Promise.all(data.map((a) => toApplicantShape(a, db)));

    // Mark returning applicants (have applied in a previous cycle too)
    if (data.length > 0) {
      const allIds = [...new Set(data.map((a) => a.applicant_id))];
      const { data: allApps = [] } = await supabase
        .from("applications").select("applicant_id").in("applicant_id", allIds);
      const countMap = {};
      allApps.forEach((a) => { countMap[a.applicant_id] = (countMap[a.applicant_id] || 0) + 1; });
      applicants.forEach((ap, i) => {
        ap.returning = (countMap[data[i].applicant_id] || 0) > 1;
      });
    }

    res.json(applicants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: applicant history across cycles ────────────────────────────────────
app.get("/admin/history/:applicantUserId", async (req, res) => {
  try {
    const { data: apps, error } = await supabase
      .from("applications")
      .select("*")
      .eq("applicant_id", req.params.applicantUserId)
      .order("submitted_at", { ascending: false });
    if (error) throw error;

    const cycleIds = [...new Set((apps || []).map((a) => a.cycle_id).filter(Boolean))];
    const { data: cycles = [] } = cycleIds.length
      ? await supabase.from("cycles").select("id, name, status").in("id", cycleIds)
      : { data: [] };
    const cycleMap = Object.fromEntries(cycles.map((c) => [c.id, c]));

    const { data: evals = [] } = apps?.length
      ? await supabase.from("reviewer_evaluations")
          .select("application_id, recommendation, status")
          .in("application_id", apps.map((a) => a.id))
      : { data: [] };
    const evalMap = {};
    evals.forEach((e) => { evalMap[e.application_id] = e; });

    const history = (apps || []).map((a) => ({
      id: a.id,
      cycle: a.cycle_id ? (cycleMap[a.cycle_id] || { id: a.cycle_id, name: "Unknown", status: "archived" }) : null,
      submittedAt: a.submitted_at || a.created_at,
      status: a.status,
      finalDecision: a.final_decision || "Pending",
      decisionNotes: a.decision_notes || "",
      reviewerRecommendation: evalMap[a.id]?.recommendation || null,
      reviewerStatus: evalMap[a.id]?.status || null,
    }));

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: get single applicant ───────────────────────────────────────────────
app.get("/admin/applicants/:id", async (req, res) => {
  try {
    const db = reqDb(req);

    const { data, error } = await db
      .from("applications")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: "Not found" });

    res.json(await toApplicantShape(data, db));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: assign reviewer ────────────────────────────────────────────────────
app.patch("/admin/applicants/:id/assign", async (req, res) => {
  try {
    const { reviewerId } = req.body;
    const db = reqDb(req);

    const { error: upsertErr } = await db.from("reviewer_assignments").upsert({
      application_id: req.params.id,
      reviewer_id: reviewerId,
    });
    if (upsertErr) throw upsertErr;

    const { error: updateErr } = await db
      .from("applications")
      .update({ status: "Under Review", updated_at: new Date().toISOString() })
      .eq("id", req.params.id);
    if (updateErr) throw updateErr;

    const { data } = await db
      .from("applications")
      .select("*")
      .eq("id", req.params.id)
      .single();

    res.json({ ok: true, applicant: await toApplicantShape(data, db) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: unassign reviewer ──────────────────────────────────────────────────
app.patch("/admin/applicants/:id/unassign", async (req, res) => {
  try {
    const { reviewerId } = req.body;
    const db = reqDb(req);

    const { error: deleteErr } = await db
      .from("reviewer_assignments")
      .delete()
      .eq("application_id", req.params.id)
      .eq("reviewer_id", reviewerId);
    if (deleteErr) throw deleteErr;

    const { data: remaining } = await db
      .from("reviewer_assignments")
      .select("reviewer_id")
      .eq("application_id", req.params.id);

    if (!remaining || remaining.length === 0) {
      await db
        .from("applications")
        .update({ status: "Submitted", updated_at: new Date().toISOString() })
        .eq("id", req.params.id);
    }

    const { data } = await db
      .from("applications")
      .select("*")
      .eq("id", req.params.id)
      .single();

    res.json({ ok: true, applicant: await toApplicantShape(data, db) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: stats ──────────────────────────────────────────────────────────────
app.get("/admin/stats", async (req, res) => {
  try {
    const db = reqDb(req);
    const cycleId = req.query.cycleId;

    let appsQuery = db.from("applications").select("status");
    if (cycleId) appsQuery = appsQuery.eq("cycle_id", cycleId);

    const [{ data: apps }, { data: reviewerProfiles }] = await Promise.all([
      appsQuery,
      db.from("profiles").select("id").eq("role", "reviewer"),
    ]);

    res.json({
      total: apps?.length || 0,
      submitted: apps?.filter((a) => a.status === "Submitted").length || 0,
      underReview: apps?.filter((a) => a.status === "Under Review").length || 0,
      reviewers: reviewerProfiles?.length || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Reviewers: list ───────────────────────────────────────────────────────────
app.get("/reviewers", async (_req, res) => {
  try {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("role", "reviewer");

    const {
      data: { users },
    } = await supabase.auth.admin.listUsers();

    const reviewerIds = profiles?.map((p) => p.id) || [];
    const reviewers = users
      .filter((u) => reviewerIds.includes(u.id))
      .map((u) => {
        const profile = profiles?.find((p) => p.id === u.id);
        return { id: u.id, name: profile?.name || u.email, email: u.email };
      });

    res.json(reviewers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Reviewers: add (creates account directly with password) ──────────────────
app.post("/reviewers", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "name, email and password required" });

    // Create the user directly — no invite email needed
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: "reviewer" },
    });

    if (error) {
      if (
        error.message.toLowerCase().includes("already") ||
        error.message.toLowerCase().includes("exists")
      )
        return res.status(409).json({ error: "Reviewer with this email already exists" });
      throw error;
    }

    // Upsert profile — works even if the trigger hasn't fired yet
    await supabase
      .from("profiles")
      .upsert({ id: data.user.id, name, role: "reviewer" }, { onConflict: "id" });

    res.json({ ok: true, reviewer: { id: data.user.id, name, email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Reviewers: delete ─────────────────────────────────────────────────────────
app.delete("/reviewers/:id", async (req, res) => {
  try {
    const { error } = await supabase.auth.admin.deleteUser(req.params.id);
    if (error) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Reviewer: get assigned applicants ────────────────────────────────────────
app.get("/reviewer/:reviewerId/applicants", async (req, res) => {
  try {
    const db = reqDb(req);

    const { data: assignments, error: assignErr } = await db
      .from("reviewer_assignments")
      .select("application_id")
      .eq("reviewer_id", req.params.reviewerId);

    if (assignErr) throw assignErr;
    if (!assignments || assignments.length === 0) return res.json([]);

    const appIds = assignments.map((a) => a.application_id);
    const { data: apps, error } = await db
      .from("applications")
      .select("*")
      .in("id", appIds);

    if (error) throw error;

    const applicants = await Promise.all((apps || []).map((a) => toApplicantShape(a, db)));
    res.json(applicants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Reviewer: get own evaluation for an application ──────────────────────────
app.get("/reviewer/:reviewerId/applications/:appId/evaluation", async (req, res) => {
  try {
    const db = reqDb(req);

    const { data, error } = await db
      .from("reviewer_evaluations")
      .select("*")
      .eq("application_id", req.params.appId)
      .eq("reviewer_id", req.params.reviewerId)
      .maybeSingle();

    if (error) throw error;
    res.json(data || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Reviewer: save/submit evaluation ─────────────────────────────────────────
app.patch("/reviewer/:reviewerId/applications/:appId/evaluation", async (req, res) => {
  try {
    const { recommendation, notes, scores, status } = req.body;
    const db = reqDb(req);

    const { data, error } = await db
      .from("reviewer_evaluations")
      .upsert(
        {
          application_id: req.params.appId,
          reviewer_id: req.params.reviewerId,
          recommendation: recommendation || "Pending",
          notes: notes || "",
          scores: scores || {},
          status: status || "draft",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "application_id,reviewer_id" }
      )
      .select()
      .single();

    if (error) throw error;

    // When reviewer submits, update the application status using service role
    if (status === "submitted") {
      await supabase
        .from("applications")
        .update({ status: "Evaluated", updated_at: new Date().toISOString() })
        .eq("id", req.params.appId);
    }

    res.json({ ok: true, evaluation: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: schedule interview ─────────────────────────────────────────────────
// Stores interview data inside personal_statement_input JSONB (no schema change needed)
// Uses service role (supabase) — reqDb(req) is user-scoped and RLS blocks admin reads.
app.patch("/admin/applicants/:id/interview", async (req, res) => {
  try {
    const { interviewAt, message } = req.body;

    // Read existing input so we can merge without overwriting applicant data
    const { data: existing, error: fetchErr } = await supabase
      .from("applications")
      .select("personal_statement_input")
      .eq("id", req.params.id)
      .single();
    if (fetchErr) throw fetchErr;

    const updatedInput = {
      ...(existing?.personal_statement_input || {}),
      _interview_at: interviewAt || null,
      _interview_message: message || "",
    };

    const { data, error } = await supabase
      .from("applications")
      .update({
        personal_statement_input: updatedInput,
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ ok: true, applicant: await toApplicantShape(data) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: set final decision ─────────────────────────────────────────────────
app.patch("/admin/applicants/:id/decision", async (req, res) => {
  try {
    const { decision, notes } = req.body;
    const db = reqDb(req);

    const { data, error } = await db
      .from("applications")
      .update({
        final_decision: decision,
        decision_notes: notes || "",
        decision_at: new Date().toISOString(),
        // Mirror the decision into status so admin list reflects it
        ...(decision && decision !== "Pending" ? { status: decision } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ ok: true, applicant: await toApplicantShape(data, db) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
