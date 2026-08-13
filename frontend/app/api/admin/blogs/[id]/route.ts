import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const { id } = await params;
  const blog = await db.prepare('SELECT * FROM blogs WHERE id = ?').get(id);
  if (!blog) return NextResponse.json({ success: false, message: 'ไม่พบบทความ' }, { status: 404 });

  return NextResponse.json({ success: true, data: blog });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = (await db.prepare('SELECT * FROM blogs WHERE id = ?').get(id)) as Record<string, any> | undefined;
  if (!existing)
    return NextResponse.json({ success: false, message: 'ไม่พบบทความ' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const merged = { ...existing, ...body };
  const { title, slug, excerpt, content, author, category, tags, status, meta_title, meta_description, published_at, cover_image } = merged;

  try {
    await db.prepare(
      `UPDATE blogs SET title=?, slug=?, excerpt=?, content=?, cover_image=?, author=?, category=?, tags=?,
       status=?, meta_title=?, meta_description=?, published_at=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
    ).run(title, slug, excerpt, content, cover_image || '', author, category, tags, status, meta_title, meta_description, published_at, id);
    return NextResponse.json({ success: true });
  } catch (e) {
    if ((e as { code?: string }).code === '23505')
      return NextResponse.json({ success: false, message: 'slug ซ้ำ' }, { status: 400 });
    throw e;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const { id } = await params;
  const info = await db.prepare('DELETE FROM blogs WHERE id = ?').run(id);
  if (!info.changes) return NextResponse.json({ success: false, message: 'ไม่พบบทความ' }, { status: 404 });

  return NextResponse.json({ success: true });
}
