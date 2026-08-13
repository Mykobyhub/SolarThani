import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import type { Installer } from '@/types';
import EditInstallerClient from './EditInstallerClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'แก้ไขผู้ติดตั้ง | Admin',
  robots: 'noindex',
};

export default async function EditInstallerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') redirect('/login');

  const { id } = await params;
  const installer = (await db.prepare('SELECT * FROM installers WHERE id = ?').get(id)) as Installer | undefined;
  if (!installer) notFound();

  return <EditInstallerClient installer={installer} />;
}
