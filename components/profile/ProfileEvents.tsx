'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate, turningAge, getDaysUntilText, daysUntil } from '@/lib/utils';
import {
  Cake,
  Heart,
  Calendar,
  Lock,
} from 'lucide-react';
import type { ProfileEvent } from './types';

interface ProfileEventsProps {
  events: ProfileEvent[];
  onEditEvent: (event: ProfileEvent) => void;
  onAddEvent: () => void;
}

function getEventIcon(type: string) {
  switch (type) {
    case 'birthday': return Cake;
    case 'anniversary': return Heart;
    default: return Calendar;
  }
}

export function ProfileEvents({
  events,
  onEditEvent,
  onAddEvent,
}: ProfileEventsProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-teal-600" />
          Occasions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-gray-500 text-sm">No occasions yet</p>
        ) : (
          <div className="space-y-3">
            {events.map(event => {
              const Icon = getEventIcon(event.type);
              const eventDaysUntil = daysUntil(event.date, event.recurring ?? true);
              const age = event.type === 'birthday' ? turningAge(event.date) : null;
              const isPastOneTime = !event.recurring && eventDaysUntil < 0;

              return (
                <button
                  key={event.id}
                  onClick={() => onEditEvent(event)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 flex items-center gap-1.5">
                        {event.type === 'custom' ? event.customLabel : event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                        {event.isPrivate && (
                          <Lock className="w-3 h-3 text-amber-500" />
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(event.date, { month: 'long', day: 'numeric', year: 'numeric' })}
                        {age && ` \u00b7 Turning ${age}`}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={isPastOneTime ? 'default' : eventDaysUntil === 0 ? 'danger' : eventDaysUntil <= 7 ? 'warning' : 'success'}
                  >
                    {getDaysUntilText(eventDaysUntil)}
                  </Badge>
                </button>
              );
            })}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          onClick={onAddEvent}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Add Occasion
        </Button>
      </CardContent>
    </Card>
  );
}
