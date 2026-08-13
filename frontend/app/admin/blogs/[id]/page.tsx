import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import EditBlogClient from './EditBlogClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'แก้ไขบทความ | Admin',
  robots: 'noindex',
};

export default async function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') redirect('/login');

  const { id } = await params;
  const blog = await db.prepare('SELECT * FROM blogs WHERE id = ?').get(id);
  if (!blog) notFound();

  return <EditBlogClient blog={blog} />;
}
