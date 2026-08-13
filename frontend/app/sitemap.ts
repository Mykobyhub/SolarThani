import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sorathani.com';

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base,                    lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/installers`,    lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${base}/blog`,          lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: `${base}/calculator`,    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/contact`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  let installers: MetadataRoute.Sitemap = [];
  let blogs: MetadataRoute.Sitemap = [];

  try {
    const rows = (await db
      .prepare("SELECT id, updated_at FROM installers WHERE status='active'")
      .all()) as { id: number; updated_at: string }[];
    installers = rows.map((r) => ({
      url: `${base}/installers/${r.id}`,
      lastModified: new Date(r.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch {}

  try {
    const rows = (await db
      .prepare("SELECT slug, updated_at FROM blogs WHERE status='active'")
      .all()) as { slug: string; updated_at: string }[];
    blogs = rows.map((r) => ({
      url: `${base}/blog/${r.slug}`,
      lastModified: new Date(r.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));
  } catch {}

  return [...staticRoutes, ...installers, ...blogs];
}
