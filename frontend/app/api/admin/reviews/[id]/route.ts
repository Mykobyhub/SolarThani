import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { recalcInstallerRating } from '@/lib/reviews';
import { sendEmail, buildInstallerReviewNotifyEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { action } = body;

  const statusMap: Record<string, string> = { approve: 'active', reject: 'rejected' };
  const newStatus = statusMap[action];
  if (!newStatus) return NextResponse.json({ success: false, message: 'action ต้องเป็น approve | reject' }, { status: 400 });

  const review = (await db.prepare('SELECT * FROM reviews WHERE id = ?').get(id)) as {
    id: number; installer_id: number; reviewer_name: string; rating: number; body: string;
  } | undefined;
  if (!review) return NextResponse.json({ success: false, message: 'ไม่พบรีวิว' }, { status: 404 });

  await db.prepare('UPDATE reviews SET status=?, verified_at=? WHERE id=?')
    .run(newStatus, action === 'approve' ? new Date().toISOString() : null, review.id);

  if (action === 'approve') {
    await recalcInstallerRating(review.installer_id);
    const installer = (await db.prepare('SELECT id, name, email FROM installers WHERE id = ?')
      .get(review.installer_id)) as { id: number; name: string; email: string } | undefined;
    if (installer) {
      const html = await buildInstallerReviewNotifyEmail(installer.name, installer.id, review);
      sendEmail({
        to: installer.email,
        subject: `[Solar Thani] มีรีวิวใหม่ (${review.rating}/5)`,
        html,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ success: true, message: `${action} สำเร็จ` });
}
