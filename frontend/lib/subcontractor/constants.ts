// Pure constants/helpers for the Sub-contractor Job Assignment feature — kept in their own
// module (no `@/lib/db` import) so client components (e.g. SpecialtyPicker) can import them
// without pulling the `pg` Pool into the browser bundle. `lib/subcontractor/service.ts`
// (server-only, DB access) re-exports these for convenience on the server side.

/** The 4 fixed job categories — confirmed spec, not user-configurable. Order matters: it's the
 * display/rollup order everywhere (roster chips, per-milestone rows, customer stage tracker). */
export const JOB_CATEGORIES = ['สำรวจ', 'ติดตั้งแผง', 'เดินสายไฟ', 'ล้างแผง'] as const;
export type JobCategory = (typeof JOB_CATEGORIES)[number];

export const CATEGORY_ICON: Record<JobCategory, string> = {
  'สำรวจ': '📋',
  'ติดตั้งแผง': '🔧',
  'เดินสายไฟ': '🔌',
  'ล้างแผง': '🧽',
};

export function isJobCategory(v: unknown): v is JobCategory {
  return typeof v === 'string' && (JOB_CATEGORIES as readonly string[]).includes(v);
}

/** Parses the JSON-array-string specialty_tags column, tolerating malformed/legacy data. */
export function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function serializeTags(tags: string[]): string {
  const clean = Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean))).slice(0, 20);
  return JSON.stringify(clean);
}
