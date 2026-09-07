import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { stripTags } from '@/lib/sanitize';
import { generateCustomerToken, isMilestonePaymentEnabled, type PaymentProjectRow } from '@/lib/payment/service';
import { notifyPlanProposed } from '@/lib/payment/notify';
import { getLineConfig } from '@/lib/line/send';

export const dynamic = 'force-dynamic';

// GET: installer's own projects (with nested milestones) + closed leads still available
// to start a new project from (i.e. not already attached to one).
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const projects = await db
    .prepare(
      `SELECT p.*,
         (SELECT COUNT(*) FROM payment_milestones m WHERE m.project_id = p.id) AS milestone_count,
         (SELECT COUNT(*) FROM payment_milestones m WHERE m.project_id = p.id AND m.status IN ('released','refunded')) AS released_count,
         COALESCE((SELECT json_agg(x ORDER BY x.seq) FROM (
           SELECT m.*,
             (SELECT provider_reference_id FROM payment_transactions t WHERE t.milestone_id = m.id AND t.type = 'release' ORDER BY t.created_at DESC LIMIT 1) AS release_reference,
             (SELECT created_at FROM payment_transactions t WHERE t.milestone_id = m.id AND t.type = 'release' ORDER BY t.created_at DESC LIMIT 1) AS release_transferred_at,
             -- Sub-contractor Job Assignment (installer-facing only — never nested into the
             -- customer-facing project endpoint): one row per assigned job category on this
             -- milestone, with the current assignee's name/phone/LINE-link status and a photo
             -- thumbnail list pulled from job_assignment_updates.
             COALESCE((SELECT json_agg(j ORDER BY j.category) FROM (
               SELECT ja.*,
                 s.name AS subcontractor_name, s.phone AS subcontractor_phone, s.line_user_id AS subcontractor_line_user_id,
                 ps.name AS previous_subcontractor_name,
                 COALESCE((SELECT json_agg(u.body ORDER BY u.created_at DESC) FROM job_assignment_updates u WHERE u.job_assignment_id = ja.id AND u.kind = 'photo'), '[]'::json) AS photos
               FROM job_assignments ja
               JOIN subcontractors s ON s.id = ja.subcontractor_id
               LEFT JOIN subcontractors ps ON ps.id = ja.previous_subcontractor_id
               WHERE ja.milestone_id = m.id
             ) j), '[]'::json) AS jobs
           FROM payment_milestones m WHERE m.project_id = p.id
         ) x), '[]'::json) AS milestones
       FROM payment_projects p
       WHERE p.installer_id = ?
       ORDER BY p.created_at DESC`
    )
    .all(session.id);

  const availableLeads = await db
    .prepare(
      `SELECT l.* FROM leads l
       WHERE l.installer_id = ? AND l.status = 'closed'
         AND NOT EXISTS (SELECT 1 FROM payment_projects p WHERE p.lead_id = l.id)
       ORDER BY l.created_at DESC`
    )
    .all(session.id);

  const enabled = await isMilestonePaymentEnabled();

  const installerRow = (await db.prepare('SELECT line_user_id FROM installers WHERE id = ?').get(session.id)) as { line_user_id: string | null } | undefined;
  const lineCfg = await getLineConfig();

  return NextResponse.json({
    success: true,
    projects,
    availableLeads,
    enabled,
    line: { enabled: lineCfg.enabled, oaBasicId: lineCfg.oaBasicId, linked: !!installerRow?.line_user_id },
  });
}

interface MilestoneInput {
  description: string;
  amount: number;
}

// POST: installer proposes a new milestone plan against a closed lead of theirs.
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  if (!(await isMilestonePaymentEnabled()))
    return NextResponse.json({ success: false, message: 'ฟีเจอร์นี้ยังไม่เปิดใช้งาน' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const leadId = Number(body.leadId);
  const title = stripTags(body.title || '').substring(0, 200);
  const address = body.address ? stripTags(body.address).substring(0, 500) : null;
  const milestonesInput = Array.isArray(body.milestones) ? (body.milestones as MilestoneInput[]) : [];

  if (!leadId) return NextResponse.json({ success: false, message: 'กรุณาเลือกลูกค้า' }, { status: 400 });
  if (!title) return NextResponse.json({ success: false, message: 'กรุณาระบุชื่อโครงการ' }, { status: 400 });
  if (milestonesInput.length < 2)
    return NextResponse.json({ success: false, message: 'ต้องมีอย่างน้อย 2 งวด' }, { status: 400 });

  const cleanMilestones = milestonesInput.map((m) => ({
    description: stripTags(m.description || '').substring(0, 300),
    amount: Number(m.amount),
  }));
  if (cleanMilestones.some((m) => !m.description))
    return NextResponse.json({ success: false, message: 'กรุณาระบุคำอธิบายทุกงวด' }, { status: 400 });
  if (cleanMilestones.some((m) => !Number.isFinite(m.amount) || m.amount <= 0))
    return NextResponse.json({ success: false, message: 'จำนวนเงินแต่ละงวดต้องมากกว่า 0' }, { status: 400 });

  // Lead must belong to this installer, be closed, and not already attached to a project.
  const lead = (await db.prepare("SELECT * FROM leads WHERE id = ? AND installer_id = ? AND status = 'closed'").get(
    leadId,
    session.id
  )) as { id: number; name: string; email: string; phone: string } | undefined;
  if (!lead) return NextResponse.json({ success: false, message: 'ไม่พบลูกค้าที่ปิดงานแล้วรายนี้' }, { status: 404 });

  const existing = await db.prepare('SELECT id FROM payment_projects WHERE lead_id = ?').get(leadId);
  if (existing) return NextResponse.json({ success: false, message: 'ลูกค้ารายนี้มีโครงการอยู่แล้ว' }, { status: 400 });

  const totalAmount = cleanMilestones.reduce((sum, m) => sum + m.amount, 0);
  const customerToken = generateCustomerToken();

  const project = (await db
    .prepare(
      `INSERT INTO payment_projects
         (lead_id, installer_id, customer_name, customer_email, customer_phone, title, address, total_amount, status, customer_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'proposed', ?)
       RETURNING *`
    )
    .get(leadId, session.id, lead.name, lead.email, lead.phone, title, address, totalAmount, customerToken)) as PaymentProjectRow;

  for (let i = 0; i < cleanMilestones.length; i++) {
    const m = cleanMilestones[i];
    await db
      .prepare(
        `INSERT INTO payment_milestones (project_id, seq, description, amount, status) VALUES (?, ?, ?, ?, 'pending_payment')`
      )
      .run(project.id, i + 1, m.description, m.amount);
  }

  notifyPlanProposed(project).catch(() => {}); // fire-and-forget, see api/contact/route.ts for the same convention

  return NextResponse.json({ success: true, message: 'สร้างแผนงวดสำเร็จ', projectId: project.id });
}
