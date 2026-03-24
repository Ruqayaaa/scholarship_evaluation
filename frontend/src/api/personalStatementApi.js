// To use Google Colab GPU backend, set VITE_PYTHON_API in frontend/.env
// e.g.  VITE_PYTHON_API=https://xxxx.ngrok-free.app
import { supabase } from "../lib/supabase";

const PYTHON_API = import.meta.env.VITE_PYTHON_API || "http://localhost:8000";
const NODE_API = "http://localhost:5000";

async function post(baseUrl, path, data, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed: ${res.status} ${text}`);
  }
  return res.json();
}

/** Get the current auth session (token + user id) */
async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Save to Node backend — throws on failure so the caller can show an error.
 */
async function saveToAdmin(path, data, token) {
  const result = await post(NODE_API, path, data, token);
  return result ?? null;
}

export async function scorePersonalStatement(data, name) {
  const session = await getSession();

  if (!session) {
    throw new Error("You must be logged in to submit your application.");
  }

  const token = session.access_token;
  const applicantId = session.user.id;

  // Try Python scoring — failure here is non-fatal
  let score = null;
  try {
    score = await post(PYTHON_API, "/score/personal-statement", data, null);
  } catch {
    // Python backend may be unavailable — continue to save without score
  }

  // Save to database — this MUST succeed; throws if it fails
  const saved = await saveToAdmin(
    "/applicants/submit/personal-statement",
    {
      applicantId,
      name: name || undefined,
      input: data,
      score: score ?? {},
    },
    token
  );

  return { score, saved };
}

export async function scoreResume(resumeText) {
  const session = await getSession();

  if (!session) {
    throw new Error("You must be logged in to submit your application.");
  }

  const token = session.access_token;
  const applicantId = session.user.id;

  // Try Python scoring — failure here is non-fatal
  let score = null;
  try {
    score = await post(PYTHON_API, "/score/resume", { resume_text: resumeText }, null);
  } catch {
    // Python backend may be unavailable — continue to save without score
  }

  // Save to database — this MUST succeed; throws if it fails
  const saved = await saveToAdmin(
    "/applicants/submit/resume",
    {
      applicantId,
      input: { resume_text: resumeText },
      score: score ?? {},
    },
    token
  );

  return { score, saved };
}
