import Link from 'next/link';
import Image from 'next/image';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import NavbarClient from './NavbarClient';

async function getSiteContent(): Promise<{ logo: string | null; name: string }> {
  try {
    const rows = (await db
      .prepare("SELECT key, value FROM site_content WHERE key IN ('logo_url','site_name')")
      .all()) as { key: string; value: string }[];
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      logo: map['logo_url'] || null,
      name: map['site_name'] || 'Solar Thani',
    };
  } catch {
    return { logo: null, name: 'Solar Thani' };
  }
}

export default async function Navbar() {
  const [session, site] = await Promise.all([
    getSession(),
    getSiteContent(),
  ]);

  const logoSrc = site.logo || null;

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link href="/" className="navbar-logo">
          {logoSrc ? (
            <Image
              src={logoSrc}
              alt={site.name}
              width={140}
              height={40}
              className="h-12 w-auto object-contain"
              unoptimized
            />
          ) : (
            <>
              <div className="logo-sun">☀️</div>
              <span>{site.name}</span>
            </>
          )}
        </Link>

        {/* Client component handles nav + auth + mobile menu */}
        <NavbarClient session={session} logoUrl={logoSrc} siteName={site.name} />
      </div>
    </header>
  );
}
