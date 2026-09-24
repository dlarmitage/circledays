'use client';

import { useState, useEffect, useMemo } from 'react';
import { daysUntil } from '@/lib/utils';
import type { ProfileData } from './types';

function pickFallback(firstName: string): string {
  const fallbacks = [
    `Surprise ${firstName} with a handwritten card`,
    `Brighten ${firstName}'s day with a card`,
    `Send ${firstName} a card, just because`,
    `Make ${firstName}'s day with a handwritten note`,
    `A handwritten card for ${firstName}? Great idea`,
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

export function useCardNudge(data: ProfileData | null) {
  const shouldShow = data && !data.isOwnProfile && data.isDirectConnection && data.isPlatformAdmin;
  const firstName = data?.profile.name.split(' ')[0] ?? '';

  // Don't generate AI nudge copy when a card is already ordered for an upcoming occasion
  const hasCardOrdered = useMemo(() => {
    if (!data?.events?.length) return false;
    return data.events
      .map(e => ({ ...e, days: daysUntil(e.date, e.recurring ?? true) }))
      .filter(e => e.days >= -7 && e.days <= 90)
      .some(e => e.cardOrdered);
  }, [data]);

  const initialNudge = useMemo(
    () => (shouldShow && !hasCardOrdered ? pickFallback(firstName) : null),
    [shouldShow, hasCardOrdered, firstName]
  );

  const [nudgeText, setNudgeText] = useState<string | null>(initialNudge);

  useEffect(() => {
    if (!shouldShow || hasCardOrdered) {
      setNudgeText(null);
      return;
    }

    let eventContext: string | undefined;
    const upcomingEvents = data!.events
      .map(e => ({ ...e, days: daysUntil(e.date, e.recurring ?? true) }))
      .filter(e => e.days >= 0 && e.days <= 14)
      .sort((a, b) => a.days - b.days);
    if (upcomingEvents.length > 0) {
      const nearest = upcomingEvents[0];
      const label = nearest.type === 'custom' ? nearest.customLabel : nearest.type;
      eventContext = `${label} in ${nearest.days} days`;
    }

    fetch('/api/card-nudge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, eventContext }),
    })
      .then(res => res.json())
      .then(result => { if (result.nudge) setNudgeText(result.nudge); })
      .catch(() => { /* fallback already set via initialNudge */ });
  }, [shouldShow, hasCardOrdered, firstName, data]);

  return { nudgeText, hasCardOrdered };
}
