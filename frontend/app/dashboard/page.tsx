import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import type { Installer, Lead } from '@/types';
import DashboardClient from './DashboardClient';

export const metadata: Metadata = {
  title: 'แดชบอร์ด',
  robots: 'noindex',
};

async function getInstallerData(id: number): Promise<Installer | null> {
  try {
    return (await db.prepare('SELECT * FROM installers WHERE id=?').get(id)) as Installer | null;
  } catch { return null; }
}

async function getLeads(installerId: number): Promise<Lead[]> {
  try {
    return (await db.prepare('SELECT * FROM leads WHERE installer_id=? ORDER BY created_at DESC').all(installerId)) as Lead[];
  } catch { return []; }
}

async function getPortfolioCount(installerId: number): Promise<number> {
  try {
    const r = (await db.prepare('SELECT COUNT(*) as c FROM portfolio_photos WHERE installer_id=?').get(installerId)) as { c: number };
    return r.c;
  } catch { return 0; }
}

async function getDefaultInstallerLogo(): Promise<string | null> {
  try {
    const r = (await db.prepare("SELECT value FROM site_content WHERE key='default_installer_image'").get()) as { value: string } | undefined;
    return r?.value || null;
  } catch { return null; }
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role === 'admin') redirect('/admin');

  const installer = await getInstallerData(session.id);
  if (!installer) redirect('/login');

  const leads = await getLeads(installer.id);
  const portfolioCount = await getPortfolioCount(installer.id);
  const siteLogo = await getDefaultInstallerLogo();

  const stats = {
    totalLeads: leads.length,
    newLeads:   leads.filter((l) => l.status === 'new').length,
    contacted:  leads.filter((l) => l.status === 'contacted').length,
    closed:     leads.filter((l) => l.status === 'closed').length,
    profileViews: installer.profile_views || 0,
    portfolioCount,
  };

  return (
    <DashboardClient
      installer={installer}
      leads={leads}
      stats={stats}
      sessionId={session.id}
      siteLogo={siteLogo}
    />
  );
}
