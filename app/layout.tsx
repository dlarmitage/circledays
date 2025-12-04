import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CircleDays - Never Miss a Special Day',
  description: 'Track birthdays and special dates for the people you care about.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CircleDays',
  },
};

export const viewport: Viewport = {
  themeColor: '#0d5c5c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
