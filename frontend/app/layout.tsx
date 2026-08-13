import type { Metadata } from 'next';
import Script from 'next/script';
import '@fontsource/sarabun/300.css';
import '@fontsource/sarabun/400.css';
import '@fontsource/sarabun/500.css';
import '@fontsource/sarabun/600.css';
import '@fontsource/sarabun/700.css';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { db } from '@/lib/db';

async function getSiteSettings() {
  try {
    const rows = (await db.prepare("SELECT key, value FROM site_content WHERE key IN ('ga4_id','clarity_id','logo_url')").all()) as { key: string; value: string }[];
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const safe = (v?: string) => v?.replace(/[^A-Za-z0-9_-]/g, '') ?? '';
    return { ga4Id: safe(map['ga4_id']), clarityId: safe(map['clarity_id']), logoUrl: map['logo_url'] || '' };
  } catch { return { ga4Id: '', clarityId: '', logoUrl: '' }; }
}

export async function generateMetadata(): Promise<Metadata> {
  const { logoUrl } = await getSiteSettings();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sorathani.com'),
    title: {
      default: 'Solar Thani — ค้นหาผู้ติดตั้งโซลาร์เซลล์',
      template: '%s | Solar Thani',
    },
    description:
      'แหล่งรวมผู้ติดตั้งโซลาร์เซลล์ที่ผ่านการตรวจสอบกว่า 150 รายทั่วประเทศไทย เปรียบเทียบราคา รีวิว และเลือกผู้ติดตั้งที่ดีที่สุดสำหรับคุณ',
    keywords: ['โซลาร์เซลล์', 'ติดตั้งโซลาร์', 'solar thani', 'ผู้ติดตั้งโซลาร์'],
    openGraph: {
      siteName: 'Solar Thani',
      locale: 'th_TH',
      type: 'website',
    },
    icons: logoUrl ? { icon: logoUrl, shortcut: logoUrl, apple: logoUrl } : undefined,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { ga4Id, clarityId } = await getSiteSettings();
  return (
    <html lang="th">
      <body className="min-h-screen flex flex-col antialiased">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />

        {ga4Id && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} strategy="afterInteractive" />
            <Script id="ga4-init" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
              window.dataLayer=window.dataLayer||[];
              function gtag(){dataLayer.push(arguments);}
              gtag('js',new Date());
              gtag('config','${ga4Id}');
            ` }} />
          </>
        )}

        {clarityId && (
          <Script id="clarity-init" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window,document,"clarity","script","${clarityId}");
          ` }} />
        )}
      </body>
    </html>
  );
}
