import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  robots: 'noindex',
};

async function getSiteContent() {
  try {
    const rows = (await db
      .prepare("SELECT key, value FROM site_content WHERE key IN ('logo_url','site_name')")
      .all()) as { key: string; value: string }[];
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return { logo: map['logo_url'] || null, name: map['site_name'] || 'Solar Thani' };
  } catch {
    return { logo: null, name: 'Solar Thani' };
  }
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const site = await getSiteContent();

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg border border-[var(--color-border)] p-8">
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            {site.logo ? (
              <img src={site.logo} alt={site.name} className="h-12 mx-auto object-contain" />
            ) : (
              <div className="inline-flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-amber-400 flex items-center justify-center text-xl shadow-md">
                  ☀️
                </div>
                <span className="font-black text-xl text-[var(--color-text)]">{site.name}</span>
              </div>
            )}
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}
