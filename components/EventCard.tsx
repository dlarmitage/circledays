'use client';

import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { getDaysUntilText, getEventTypeLabel, formatDate } from '@/lib/utils';
import { Cake, Heart, Calendar } from 'lucide-react';

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
  onClick?: () => void;
}

export function EventCard({
  profileName,
  profilePicture,
  type,
  customLabel,
  date,
  daysUntil,
  age,
  onClick,
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
          </div>
          {age && type === 'birthday' && (
            <p className="text-sm text-gray-500 mt-0.5">
              Turning {age}
            </p>
          )}
        </div>
        
        <Badge variant={getBadgeVariant()} size="md">
          {daysText}
        </Badge>
      </div>
    </Card>
  );
}


