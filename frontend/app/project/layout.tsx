import type { Metadata } from 'next';

// Every /project/[token]/* page is a secret-link customer page (no login) — never index it.
export const metadata: Metadata = {
  robots: 'noindex, nofollow',
};

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
