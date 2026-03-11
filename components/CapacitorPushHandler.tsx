'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PushNotifications } from '@capacitor/push-notifications';
import { isNativeApp } from '@/lib/capacitor';

interface CapacitorPushHandlerProps {
  userId?: string;
  pushEnabled?: boolean;
}

export function CapacitorPushHandler({ userId, pushEnabled }: CapacitorPushHandlerProps) {
  const router = useRouter();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!isNativeApp() || !userId || !pushEnabled || registeredRef.current) return;
    registeredRef.current = true;

    const setup = async () => {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== 'granted') return;

      // Set up listeners BEFORE calling register() — token event fires immediately
      await PushNotifications.addListener('registration', async (token) => {
        try {
          await fetch('/api/push/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token.value, platform: 'ios' }),
          });
        } catch (error) {
          console.error('Failed to register push token:', error);
        }
      });

      await PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration failed:', error);
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        const profileId = notification.notification.data?.profileId;
        if (profileId) {
          router.push(`/profile/${profileId}`);
        } else {
          router.push('/dashboard');
        }
      });

      // Now register — the listeners above will catch the token
      await PushNotifications.register();
    };

    setup();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [userId, pushEnabled, router]);

  return null;
}
