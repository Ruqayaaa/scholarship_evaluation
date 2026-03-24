export function scorePersonalStatement(
  data: Record<string, string>,
  name?: string
): Promise<{ score: Record<string, unknown> | null; saved: unknown }>;

export function scoreResume(
  resumeText: string
): Promise<{ score: Record<string, unknown> | null; saved: unknown }>;
