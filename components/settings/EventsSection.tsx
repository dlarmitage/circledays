'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EditEventModal } from '@/components/EditEventModal';
import { AddEventModal } from '@/components/AddEventModal';
import { formatDate, parseLocalDate } from '@/lib/utils';
import { Calendar, Cake, Heart, Star, Pencil, Lock, Plus } from 'lucide-react';

interface Event {
  id: string;
  type: 'birthday' | 'anniversary' | 'custom';
  customLabel: string | null;
  date: string;
  recurring: boolean;
  isPrivate: boolean;
  createdByUserId: string | null;
}

interface ProfileData {
  id: string;
  name: string;
}

interface EventsSectionProps {
  events: Event[];
  profileData: ProfileData | null;
  profileName: string;
  editingEvent: Event | null;
  editModalOpen: boolean;
  addModalOpen: boolean;
  onEditEvent: (event: Event) => void;
  onCloseEditModal: () => void;
  onOpenAddModal: () => void;
  onCloseAddModal: () => void;
  onEventUpdated: () => void;
  onEventAdded: () => void;
}

function getEventIcon(type: string) {
  switch (type) {
    case 'birthday': return <Cake className="w-4 h-4 text-coral-500" />;
    case 'anniversary': return <Heart className="w-4 h-4 text-pink-500" />;
    default: return <Star className="w-4 h-4 text-amber-500" />;
  }
}

function getEventLabel(event: Event) {
  switch (event.type) {
    case 'birthday': return 'Birthday';
    case 'anniversary': return 'Anniversary';
    default: return event.customLabel || 'Custom Event';
  }
}

export function EventsSection({
  events,
  profileData,
  profileName,
  editingEvent,
  editModalOpen,
  addModalOpen,
  onEditEvent,
  onCloseEditModal,
  onOpenAddModal,
  onCloseAddModal,
  onEventUpdated,
  onEventAdded,
}: EventsSectionProps) {
  return (
    <>
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            My Events
          </CardTitle>
          <Button
            size="sm"
            variant="secondary"
            onClick={onOpenAddModal}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Events on your profile that others can see and get reminders for
          </p>

          {events.length === 0 ? (
            <div className="text-center py-6">
              <Cake className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-400 mb-3">
                No events yet
              </p>
              <Button
                size="sm"
                onClick={onOpenAddModal}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Your Birthday
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map(event => {
                const dateObj = parseLocalDate(event.date);
                const isUnknownYear = dateObj.getFullYear() === 1904;

                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="p-2 rounded-full bg-white">
                      {getEventIcon(event.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {getEventLabel(event)}
                        </p>
                        {event.isPrivate && (
                          <Lock className="w-3 h-3 text-gray-400" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatDate(dateObj)}
                        {!event.recurring && (
                          <span className="ml-2 text-xs text-gray-400">(one-time)</span>
                        )}
                        {isUnknownYear && event.type === 'birthday' && (
                          <span className="ml-2 text-xs text-amber-600">(year unknown)</span>
                        )}
                      </p>
                    </div>

                    <button
                      onClick={() => onEditEvent(event)}
                      className="p-2 hover:bg-white rounded-full transition-colors"
                      title="Edit event"
                    >
                      <Pencil className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Event Modal */}
      {editingEvent && (
        <EditEventModal
          isOpen={editModalOpen}
          onClose={onCloseEditModal}
          event={editingEvent}
          profileName={profileName}
          onEventUpdated={onEventUpdated}
        />
      )}

      {/* Add Event Modal */}
      {profileData && (
        <AddEventModal
          isOpen={addModalOpen}
          onClose={onCloseAddModal}
          profileId={profileData.id}
          profileName={profileName}
          onEventAdded={onEventAdded}
        />
      )}
    </>
  );
}
