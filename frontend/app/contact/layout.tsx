import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ติดต่อเรา',
  description: 'ติดต่อทีมงาน Solar Thani สำหรับข้อสงสัย แจ้งปัญหา หรือขอคำแนะนำเรื่องการติดตั้งโซลาร์เซลล์',
  openGraph: {
    title: 'ติดต่อเรา — Solar Thani',
    description: 'ติดต่อทีมงาน Solar Thani สำหรับข้อสงสัย แจ้งปัญหา หรือขอคำแนะนำเรื่องการติดตั้งโซลาร์เซลล์',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'ติดต่อเรา — Solar Thani',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
