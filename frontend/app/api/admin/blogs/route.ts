import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const sp     = req.nextUrl.searchParams;
  const status = sp.get('status');
  const page   = parseInt(sp.get('page') || '1');
  const limit  = parseInt(sp.get('limit') || '20');
  const offset = (page - 1) * limit;

  const where  = status ? `WHERE status = ?` : '';
  const params = status ? [status] : [];
  const total  = ((await db.prepare(`SELECT COUNT(*) AS c FROM blogs ${where}`).get(...params)) as { c: number }).c;
  const rows   = await db.prepare(
    `SELECT id, title, slug, category, status, featured, published_at, created_at FROM blogs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return NextResponse.json({ success: true, data: rows, total });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { title, slug, excerpt, content, author, category, tags, status, meta_title, meta_description, published_at, cover_image } = body;
  if (!title || !slug || !content)
    return NextResponse.json({ success: false, message: 'title, slug, content จำเป็น' }, { status: 400 });

  try {
    const info = (await db.prepare(
      `INSERT INTO blogs (title, slug, excerpt, content, cover_image, author, category, tags, status, meta_title, meta_description, published_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`
    ).get(title, slug, excerpt || '', content, cover_image || '', author || 'ทีมงาน Solar Thani Thailand',
      category || 'ทั่วไป', tags || '[]', status || 'active', meta_title || title,
      meta_description || excerpt || '', published_at || new Date().toISOString().slice(0, 10)
    )) as { id: number };
    return NextResponse.json({ success: true, id: info.id }, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === '23505')
      return NextResponse.json({ success: false, message: 'slug ซ้ำ' }, { status: 400 });
    throw e;
  }
}
