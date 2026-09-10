import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAffiliateSession } from '@/lib/auth';
import { db } from '@/lib/db';
import type { Affiliate } from '@/types';
import DashboardClient from './DashboardClient';

export const metadata: Metadata = {
  title: 'Affiliate Dashboard',
  robots: 'noindex',
};

async function getAffiliateData(id: number): Promise<Affiliate | null> {
  try {
    return (await db.prepare('SELECT * FROM affiliates WHERE id = ?').get(id)) as Affiliate | null;
  } catch {
    return null;
  }
}

export default async function AffiliateDashboardPage() {
  const session = await getAffiliateSession();
  if (!session) redirect('/affiliate/login');

  const affiliate = await getAffiliateData(session.id);
  if (!affiliate) redirect('/affiliate/login');

  return <DashboardClient affiliate={affiliate} />;
}
