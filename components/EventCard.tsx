'use client';

import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getDaysUntilText, getEventTypeLabel, formatDate } from '@/lib/utils';
import { Cake, Heart, Calendar, Lock, Sparkles } from 'lucide-react';

interface EventCardProps {
  id: string;
  profileId: string;
  profileName: string;
  profilePicture?: string | null;
  type: 'birthday' | 'anniversary' | 'custom';
  customLabel?: string | null;
  date: string;
  daysUntil: number;
  age?: number;
  isPrivate?: boolean;
  onClick?: () => void;
  onMessageAssist?: () => void;
}

export function EventCard({
  profileName,
  profilePicture,
  type,
  customLabel,
  date,
  daysUntil,
  age,
  isPrivate,
  onClick,
  onMessageAssist,
}: EventCardProps) {
  const daysText = getDaysUntilText(daysUntil);
  const eventLabel = getEventTypeLabel(type, customLabel);

  const EventIcon = type === 'birthday' ? Cake : type === 'anniversary' ? Heart : Calendar;

  const getBadgeVariant = () => {
    if (daysUntil === 0) return 'danger';
    if (daysUntil === 1) return 'warning';
    return 'success';
  };

  const formattedDate = formatDate(date);

  const showMessageAssist = daysUntil <= 7 && onMessageAssist;

  return (
    <Card hover onClick={onClick} className="animate-slide-up">
      <div className="flex items-center gap-4">
        <Avatar src={profilePicture} name={profileName} size="lg" />

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{profileName}</h3>
          <div className="flex items-center gap-2 mt-1">
            <EventIcon className="w-4 h-4 text-teal-500" />
            <span className="text-sm text-gray-600">
              {eventLabel} · {formattedDate}
            </span>
            {isPrivate && (
              <Lock className="w-3 h-3 text-amber-500" />
            )}
          </div>
          {age && type === 'birthday' && (
            <p className="text-sm text-gray-500 mt-0.5">
              Turning {age}
            </p>
          )}

          {/* Message Assist button for upcoming events */}
          {showMessageAssist && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMessageAssist();
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-100 hover:bg-violet-200 rounded-full transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Message Assist
            </button>
          )}
        </div>

        <Badge variant={getBadgeVariant()} size="md">
          {daysText}
        </Badge>
      </div>
    </Card>
  );
}


