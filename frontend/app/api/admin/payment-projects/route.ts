import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: every milestone-payment project + nested milestones (for the admin table/filters),
// a raw transaction log, and the open dispute queue.
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const projects = await db
    .prepare(
      `SELECT p.*, i.name AS installer_name, (i.line_user_id IS NOT NULL) AS installer_line_linked,
         COALESCE((SELECT json_agg(x ORDER BY x.seq) FROM (SELECT * FROM payment_milestones WHERE project_id = p.id) x), '[]'::json) AS milestones
       FROM payment_projects p
       JOIN installers i ON i.id = p.installer_id
       ORDER BY p.created_at DESC`
    )
    .all();

  const transactions = await db
    .prepare(
      `SELECT t.*, m.seq AS milestone_seq, p.id AS project_id, p.title AS project_title
       FROM payment_transactions t
       JOIN payment_milestones m ON m.id = t.milestone_id
       JOIN payment_projects p ON p.id = m.project_id
       ORDER BY t.created_at DESC
       LIMIT 200`
    )
    .all();

  const disputes = await db
    .prepare(
      `SELECT d.*, m.seq AS milestone_seq, m.description AS milestone_description, m.amount AS milestone_amount,
         p.id AS project_id, p.title AS project_title, p.customer_name, i.name AS installer_name
       FROM payment_disputes d
       JOIN payment_milestones m ON m.id = d.milestone_id
       JOIN payment_projects p ON p.id = m.project_id
       JOIN installers i ON i.id = p.installer_id
       ORDER BY d.created_at DESC`
    )
    .all();

  const statsRow = (await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM payment_projects) AS "totalProjects",
         (SELECT COUNT(*) FROM payment_projects WHERE status = 'active') AS "activeProjects",
         (SELECT COUNT(*) FROM payment_disputes WHERE status = 'open') AS "openDisputes",
         (SELECT COALESCE(SUM(amount), 0) FROM payment_milestones WHERE status IN ('paid_hold','in_progress','awaiting_confirmation','disputed')) AS "escrowValue"
      `
    )
    .get()) as Record<string, number>;

  return NextResponse.json({
    success: true,
    projects,
    transactions,
    disputes,
    stats: {
      totalProjects: Number(statsRow.totalProjects),
      activeProjects: Number(statsRow.activeProjects),
      openDisputes: Number(statsRow.openDisputes),
      escrowValue: Number(statsRow.escrowValue),
    },
  });
}
