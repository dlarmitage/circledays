'use client';

import { useEffect } from 'react';
import { isNativeApp } from '@/lib/capacitor';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (isNativeApp()) return;
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope);
        })
        .catch((error) => {
          console.log('SW registration failed:', error);
        });
    }
  }, []);

  return null;
}

