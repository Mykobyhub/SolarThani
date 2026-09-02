import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import AdminClient from './AdminClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin Panel',
  robots: 'noindex',
};

async function getAdminData() {
  try {
    const statsRow = (await db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM installers WHERE status='active')  AS "activeInstallers",
        (SELECT COUNT(*) FROM installers WHERE status='pending') AS "pendingInstallers",
        (SELECT COUNT(*) FROM leads)                             AS "totalLeads",
        (SELECT COUNT(*) FROM leads WHERE status='new')          AS "newLeads",
        (SELECT COUNT(*) FROM reviews WHERE status='pending')    AS "pendingReviews",
        (SELECT COUNT(*) FROM reviews WHERE status='active')     AS "activeReviews",
        (SELECT COUNT(*) FROM blogs WHERE status='active')       AS "publishedBlogs",
        (SELECT COUNT(*) FROM contact_messages WHERE status='new') AS "newMessages"
    `).get()) as Record<string, number>;
    const stats = {
      activeInstallers: Number(statsRow.activeInstallers),
      pendingInstallers: Number(statsRow.pendingInstallers),
      totalLeads: Number(statsRow.totalLeads),
      newLeads: Number(statsRow.newLeads),
      pendingReviews: Number(statsRow.pendingReviews),
      activeReviews: Number(statsRow.activeReviews),
      publishedBlogs: Number(statsRow.publishedBlogs),
      newMessages: Number(statsRow.newMessages),
    };

    const installers = await db.prepare(`
      SELECT id, name, email, status, location, rating, reviews_count, created_at, verified_at, claimed_at
      FROM installers ORDER BY created_at DESC
    `).all();

    const reviews = await db.prepare(`
      SELECT r.*, i.name AS installer_name
      FROM reviews r
      LEFT JOIN installers i ON i.id = r.installer_id
      ORDER BY r.created_at DESC LIMIT 100
    `).all();

    const leads = await db.prepare(`
      SELECT l.*, i.name AS installer_name
      FROM leads l
      LEFT JOIN installers i ON i.id = l.installer_id
      ORDER BY l.created_at DESC LIMIT 100
    `).all();

    const blogs = await db.prepare('SELECT id, title, slug, category, status, featured, author, published_at, cover_image FROM blogs ORDER BY created_at DESC LIMIT 100').all();

    const messages = await db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 50').all();

    const siteContent = (await db.prepare('SELECT key, value FROM site_content').all()) as { key: string; value: string }[];
    const contentMap = Object.fromEntries(siteContent.map((r) => [r.key, r.value]));

    // Never load raw client_secret into the page — only whether one is set.
    const oauthProviders = await db.prepare(
      "SELECT provider, client_id, active, (client_secret <> '') AS client_secret_set FROM oauth_providers ORDER BY provider"
    ).all();

    return { stats, installers, reviews, leads, blogs, messages, contentMap, oauthProviders };
  } catch {
    return { stats: {}, installers: [], reviews: [], leads: [], blogs: [], messages: [], contentMap: {}, oauthProviders: [] };
  }
}

export default async function AdminPage() {
  const session = await getSession();
  if (!session || session.role !== 'admin') redirect('/login');

  const data = await getAdminData();
  return <AdminClient data={data} />;
}
