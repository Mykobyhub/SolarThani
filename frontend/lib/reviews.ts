import { db } from './db';

export async function recalcInstallerRating(installerId: number): Promise<void> {
  const r = (await db.prepare(`
    SELECT COUNT(*) AS cnt, AVG(CAST(rating AS REAL)) AS avg,
           SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) AS happy
    FROM reviews WHERE installer_id = ? AND status = 'active'
  `).get(installerId)) as { cnt: number; avg: number; happy: number };

  if (r.cnt > 0) {
    const satisfaction = Math.round((r.happy / r.cnt) * 100);
    await db.prepare(
      `UPDATE installers SET reviews_count = ?, rating = ?, satisfaction_rate = ? WHERE id = ?`
    ).run(r.cnt, Math.round(r.avg * 10) / 10, satisfaction, installerId);
  }
}
