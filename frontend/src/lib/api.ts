import { supabase } from "./supabase";

export const NODE_API = import.meta.env.VITE_NODE_API || "http://localhost:5000";

export async function adminFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return fetch(`${NODE_API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
}

type ScoredApplicant = {
  personalStatement: { score: Record<string, unknown> } | null;
  resume: { score: Record<string, unknown> } | null;
};

export function toLlmScore(a: ScoredApplicant): number | null {
  const scores: number[] = [];
  if (a.personalStatement?.score?.overall_score != null)
    scores.push((a.personalStatement.score.overall_score as number));
  if (a.resume?.score?.overall_score != null)
    scores.push(((a.resume.score.overall_score as number) / 180) * 100);
  if (!scores.length) return null;
  return Math.round(scores.reduce((x, y) => x + y, 0) / scores.length);
}
