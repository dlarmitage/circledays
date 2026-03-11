'use client';

import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { getDaysUntilText, getEventTypeLabel, formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Cake, Heart, Calendar, Lock, Sparkles, Mail, CheckCircle2 } from 'lucide-react';

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
  cardOrdered?: boolean;
  onClick?: () => void;
  onMessageAssist?: () => void;
  onSendCard?: () => void;
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
  cardOrdered,
  onClick,
  onMessageAssist,
  onSendCard,
}: EventCardProps) {
  const router = useRouter();
  const daysText = getDaysUntilText(daysUntil);
  const eventLabel = getEventTypeLabel(type, customLabel);

  const EventIcon = type === 'birthday' ? Cake : type === 'anniversary' ? Heart : Calendar;

  const getBadgeVariant = () => {
    if (daysUntil < 0) return 'default';
    if (daysUntil === 0) return 'danger';
    if (daysUntil === 1) return 'warning';
    return 'success';
  };

  const formattedDate = formatDate(date);

  const showMessageAssist = Math.abs(daysUntil) <= 7 && onMessageAssist;
  const showSendCard = !!onSendCard;

  return (
    <Card hover onClick={onClick} className="animate-slide-up">
      {/* Top row: avatar, name/details, days badge */}
      <div className="flex items-center gap-4">
        <Avatar src={profilePicture} name={profileName} size="lg" />

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{profileName}</h3>
          <div className="flex items-center gap-2 mt-1">
            <EventIcon className="w-4 h-4 text-teal-500 shrink-0" />
            <span className="text-sm text-gray-600 truncate">
              {eventLabel} · {formattedDate}
            </span>
            {isPrivate && (
              <Lock className="w-3 h-3 text-amber-500 shrink-0" />
            )}
          </div>
          {age && type === 'birthday' && (
            <p className="text-sm text-gray-500 mt-0.5">
              Turning {age}
            </p>
          )}
        </div>

        <Badge variant={getBadgeVariant()} size="md" className="shrink-0">
          {daysText}
        </Badge>
      </div>

      {/* Action buttons row */}
      {(showMessageAssist || showSendCard || cardOrdered) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-3 ml-[calc(3.5rem+1rem)]">
          {showMessageAssist && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMessageAssist!();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-full transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              Message Assist
            </button>
          )}
          {cardOrdered ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push('/cards');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-full transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Card Ordered
            </button>
          ) : showSendCard && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSendCard!();
              }}
              title={daysUntil > 7 ? 'Card will be timed to arrive for their special day' : undefined}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 rounded-full transition-all shadow-sm"
            >
              <Mail className="w-3.5 h-3.5" />
              Send Card
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
