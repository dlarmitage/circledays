'use client';

import { useEffect } from 'react';
import { SplashScreen } from '@capacitor/splash-screen';
import { isNativeApp } from '@/lib/capacitor';

export function CapacitorSplashScreen() {
  useEffect(() => {
    if (!isNativeApp()) return;

    const timer = setTimeout(() => {
      SplashScreen.hide({ fadeOutDuration: 300 });
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
