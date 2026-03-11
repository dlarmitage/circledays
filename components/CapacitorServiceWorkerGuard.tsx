'use client';

import { useEffect } from 'react';
import { isNativeApp } from '@/lib/capacitor';

export function CapacitorServiceWorkerGuard() {
  useEffect(() => {
    if (!isNativeApp()) return;

    navigator.serviceWorker?.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });

    caches.keys().then((names) => {
      names.forEach((n) => caches.delete(n));
    });
  }, []);

  return null;
}
