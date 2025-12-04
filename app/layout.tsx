import type { Metadata, Viewport } from 'next';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import './globals.css';

export const metadata: Metadata = {
  title: 'CircleDays - Never Miss a Special Day',
  description: 'Track birthdays and special dates for the people you care about.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/favicon.ico', sizes: 'any' },
      { url: '/icons/touch-icon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/touch-icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CircleDays',
  },
  applicationName: 'CircleDays',
  keywords: ['birthday', 'reminder', 'anniversary', 'calendar', 'connections'],
  authors: [{ name: 'CircleDays' }],
  openGraph: {
    type: 'website',
    title: 'CircleDays - Never Miss a Special Day',
    description: 'Track birthdays, anniversaries, and special moments for everyone in your life. Get timely reminders via email or SMS.',
    siteName: 'CircleDays',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CircleDays - Never Miss a Special Day',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CircleDays - Never Miss a Special Day',
    description: 'Track birthdays, anniversaries, and special moments for everyone in your life.',
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#0d9488',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* PWA Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icons/touch-icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="72x72" href="/icons/touch-icon-72x72.png" />
        <link rel="apple-touch-icon" sizes="96x96" href="/icons/touch-icon-96x96.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/touch-icon-144x144.png" />
        <link rel="apple-touch-icon" sizes="168x168" href="/icons/touch-icon-168x168.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/touch-icon-192x192.png" />
        
        {/* PWA splash screens for iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CircleDays" />
        
        {/* MS Tile */}
        <meta name="msapplication-TileColor" content="#0d9488" />
        <meta name="msapplication-TileImage" content="/icons/touch-icon-144x144.png" />
      </head>
      <body>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
