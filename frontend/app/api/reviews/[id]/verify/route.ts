import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recalcInstallerRating } from '@/lib/reviews';
import { sendEmail, buildInstallerReviewNotifyEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.redirect(new URL('/', APP_URL));

  const review = (await db.prepare(
    `SELECT * FROM reviews WHERE id = ? AND verify_token = ? AND status = 'pending'`
  ).get(id, token)) as { id: number; installer_id: number; reviewer_name: string; rating: number; body: string } | undefined;

  if (!review) return NextResponse.redirect(new URL('/?verify=invalid', APP_URL));

  await db.prepare(`UPDATE reviews SET status = 'active', verified_at = ? WHERE id = ?`)
    .run(new Date().toISOString(), review.id);
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

  return NextResponse.redirect(new URL(`/installers/${review.installer_id}?review_verified=1`, APP_URL));
}
