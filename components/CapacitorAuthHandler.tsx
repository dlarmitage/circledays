'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { App } from '@capacitor/app';
import { isNativeApp } from '@/lib/capacitor';

export function CapacitorAuthHandler() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeApp()) return;

    const listener = App.addListener('appUrlOpen', async ({ url }) => {
      try {
        const parsed = new URL(url);
        if (parsed.host === 'auth' && parsed.pathname === '/callback') {
          const exchangeToken = parsed.searchParams.get('exchange_token');
          if (!exchangeToken) return;

          const res = await fetch('/api/auth/exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exchangeToken }),
          });

          const data = await res.json();
          if (data.redirect) {
            router.push(data.redirect);
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error);
      }
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, [router]);

  return null;
}
