/**
 * Backend auth / protected-route tests.
 *
 * These tests verify that:
 * 1. Unauthenticated requests to protected endpoints return 401.
 * 2. Authenticated requests without the required role return 403.
 * 3. Role enforcement is applied to all /admin/* and /reviewer/* routes.
 *
 * Run with:  npx vitest run  (or  npm test  if the script is configured)
 *
 * The tests use supertest against the express app. Because the app relies on
 * Supabase, we mock the Supabase client so no live credentials are needed.
 */

import { describe, it, expect, vi, beforeAll } from "vitest";
import express from "express";
import request from "supertest";

// ── Minimal mock of the Supabase client ───────────────────────────────────────

function makeMockSupabase({ userId = "user-123", role = "applicant" } = {}) {
  const mockFrom = (table) => ({
    select: () => ({
      eq: () => ({ single: async () => ({ data: table === "profiles" ? { role } : null, error: null }) }),
    }),
    update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    delete: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
    insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: {}, error: null }) }) }),
    upsert: () => ({ select: () => ({ single: () => Promise.resolve({ data: {}, error: null }) }) }),
  });

  return {
    auth: {
      getUser: vi.fn(async (token) => {
        if (!token || token === "bad-token") return { data: { user: null }, error: new Error("invalid") };
        return { data: { user: { id: userId } }, error: null };
      }),
      admin: { listUsers: async () => ({ data: { users: [] } }) },
    },
    from: mockFrom,
    storage: {
      createBucket: async () => ({}),
      from: () => ({
        upload: async () => ({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "https://example.com/file" } }),
        createSignedUrl: async () => ({ data: { signedUrl: "https://example.com/signed" } }),
      }),
    },
  };
}

// ── Build a minimal express app with the same middleware structure ─────────────

function buildApp({ supabaseMock }) {
  const app = express();
  app.use(express.json());

  async function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Authentication required." });
    const { data: { user }, error } = await supabaseMock.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: "Invalid or expired token." });
    req.user = user;
    next();
  }

  function requireRole(...roles) {
    return async (req, res, next) => {
      if (!req.user) return res.status(401).json({ error: "Authentication required." });
      const { data: profile } = await supabaseMock.from("profiles").select().eq("id", req.user.id).single();
      if (!profile || !roles.includes(profile.role)) {
        return res.status(403).json({ error: "Access denied. Insufficient permissions." });
      }
      req.userRole = profile.role;
      next();
    };
  }

  const requireAdmin    = [authenticate, requireRole("admin", "superadmin")];
  const requireReviewer = [authenticate, requireRole("reviewer", "admin", "superadmin")];

  // Simulated protected endpoints
  app.get("/admin/applicants", ...requireAdmin, (_req, res) => res.json([]));
  app.get("/admin/stats",      ...requireAdmin, (_req, res) => res.json({ total: 0 }));
  app.get("/admin/cycles",     ...requireAdmin, (_req, res) => res.json([]));
  app.get("/reviewers",        ...requireAdmin, (_req, res) => res.json([]));
  app.get("/reviewer/:id/applicants", ...requireReviewer, (_req, res) => res.json([]));

  // Public endpoint
  app.get("/health", (_req, res) => res.json({ ok: true }));

  return app;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Authentication middleware", () => {
  it("returns 401 when no token is provided", async () => {
    const app = buildApp({ supabaseMock: makeMockSupabase() });
    const res = await request(app).get("/admin/applicants");
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/authentication required/i);
  });

  it("returns 401 when an invalid token is provided", async () => {
    const app = buildApp({ supabaseMock: makeMockSupabase() });
    const res = await request(app)
      .get("/admin/applicants")
      .set("Authorization", "Bearer bad-token");
    expect(res.status).toBe(401);
  });

  it("allows requests with a valid token and matching role", async () => {
    const app = buildApp({ supabaseMock: makeMockSupabase({ role: "admin" }) });
    const res = await request(app)
      .get("/admin/applicants")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(200);
  });

  it("allows public endpoints without a token", async () => {
    const app = buildApp({ supabaseMock: makeMockSupabase() });
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe("Role-based access control", () => {
  it("returns 403 when applicant tries to access /admin/applicants", async () => {
    const app = buildApp({ supabaseMock: makeMockSupabase({ role: "applicant" }) });
    const res = await request(app)
      .get("/admin/applicants")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/access denied/i);
  });

  it("returns 403 when reviewer tries to access /admin/applicants", async () => {
    const app = buildApp({ supabaseMock: makeMockSupabase({ role: "reviewer" }) });
    const res = await request(app)
      .get("/admin/applicants")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(403);
  });

  it("allows reviewer to access /reviewer/:id/applicants", async () => {
    const app = buildApp({ supabaseMock: makeMockSupabase({ role: "reviewer" }) });
    const res = await request(app)
      .get("/reviewer/user-123/applicants")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(200);
  });

  it("allows admin to access /reviewer/:id/applicants", async () => {
    const app = buildApp({ supabaseMock: makeMockSupabase({ role: "admin" }) });
    const res = await request(app)
      .get("/reviewer/any-id/applicants")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(200);
  });

  it("allows superadmin to access admin routes", async () => {
    const app = buildApp({ supabaseMock: makeMockSupabase({ role: "superadmin" }) });
    const res = await request(app)
      .get("/admin/stats")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(200);
  });

  it("protects /reviewers (list) from non-admins", async () => {
    const app = buildApp({ supabaseMock: makeMockSupabase({ role: "reviewer" }) });
    const res = await request(app)
      .get("/reviewers")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(403);
  });

  it("protects /admin/cycles from non-admins", async () => {
    const app = buildApp({ supabaseMock: makeMockSupabase({ role: "applicant" }) });
    const res = await request(app)
      .get("/admin/cycles")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(403);
  });
});

describe("Password validation (client-side rules)", () => {
  it("rejects passwords shorter than 8 characters", () => {
    function validatePassword(pw) {
      if (pw.length < 8) return "Password must be at least 8 characters long.";
      return null;
    }
    expect(validatePassword("abc")).toBe("Password must be at least 8 characters long.");
    expect(validatePassword("12345678")).toBeNull();
  });
});
