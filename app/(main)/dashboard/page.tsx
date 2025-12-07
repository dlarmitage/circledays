'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { EventCard } from '@/components/EventCard';
import { SuggestionsCard } from '@/components/SuggestionsCard';
import { MessageAssistModal } from '@/components/MessageAssistModal';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { STRINGS } from '@/lib/constants';
import { Plus, Cake, Calendar } from 'lucide-react';

interface UpcomingEvent {
  id: string;
  profileId: string;
  profileName: string;
  profilePicture: string | null;
  type: 'birthday' | 'anniversary' | 'custom';
  customLabel: string | null;
  date: string;
  daysUntil: number;
  age?: number;
  isPrivate?: boolean;
}

interface UserData {
  user: {
    id: string;
    name: string;
  };
}

interface SuggestionGroup {
  fromUser: {
    id: string;
    name: string;
  };
  suggestions: {
    id: string;
    profile: {
      id: string;
      name: string;
      profilePicture: string | null;
    };
    createdAt: string;
  }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [suggestionGroups, setSuggestionGroups] = useState<SuggestionGroup[]>([]);
  
  // Message Assist modal state
  const [messageAssistEvent, setMessageAssistEvent] = useState<UpcomingEvent | null>(null);
  
  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await fetch('/api/suggestions');
      const data = await res.json();
      setSuggestionGroups(data.suggestions || []);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    }
  }, []);
  
  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(res => res.json()),
      fetch(`/api/events/upcoming?days=${days}`).then(res => res.json()),
      fetch('/api/suggestions').then(res => res.json()),
    ]).then(([userRes, eventsRes, suggestionsRes]) => {
      setUserData(userRes);
      setEvents(eventsRes.events || []);
      setSuggestionGroups(suggestionsRes.suggestions || []);
      setLoading(false);
    });
  }, [days]);
  
  const handleAcceptSuggestion = async (suggestionId: string) => {
    const res = await fetch(`/api/suggestions/${suggestionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept' }),
    });
    if (!res.ok) throw new Error('Failed to accept suggestion');
  };
  
  const handleDeclineSuggestion = async (suggestionId: string) => {
    const res = await fetch(`/api/suggestions/${suggestionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'decline' }),
    });
    if (!res.ok) throw new Error('Failed to decline suggestion');
  };
  
  const handleAcceptAllSuggestions = async () => {
    const res = await fetch('/api/suggestions/accept-all', {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to accept all suggestions');
  };
  
  const groupedEvents = events.reduce((acc, event) => {
    let group: string;
    if (event.daysUntil === 0) group = 'Today';
    else if (event.daysUntil === 1) group = 'Tomorrow';
    else if (event.daysUntil <= 7) group = 'This Week';
    else if (event.daysUntil <= 30) group = 'Next Four Weeks';
    else group = 'Later';
    
    if (!acc[group]) acc[group] = [];
    acc[group].push(event);
    return acc;
  }, {} as Record<string, UpcomingEvent[]>);
  
  const groupOrder = ['Today', 'Tomorrow', 'This Week', 'Next Four Weeks', 'Later'];
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900">
            {userData?.user?.name ? `Hey, ${userData.user.name.split(' ')[0]}!` : 'Dashboard'}
          </h1>
          <p className="text-gray-600 mt-1">
            {events.length} upcoming {events.length === 1 ? 'event' : 'events'}
          </p>
        </div>
        <Button onClick={() => router.push('/add-person')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Person
        </Button>
      </div>
      
      {/* Suggestions Card */}
      <SuggestionsCard
        groups={suggestionGroups}
        onAccept={handleAcceptSuggestion}
        onDecline={handleDeclineSuggestion}
        onAcceptAll={handleAcceptAllSuggestions}
        onRefresh={fetchSuggestions}
      />
      
      {/* Spacer when suggestions are visible */}
      {suggestionGroups.length > 0 && <div className="mb-6" />}
      
      {/* Time filter */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setDays(30)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            days === 30
              ? 'bg-teal-500 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          30 days
        </button>
        <button
          onClick={() => setDays(90)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            days === 90
              ? 'bg-teal-500 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          90 days
        </button>
      </div>
      
      {/* Events */}
      {events.length === 0 ? (
        <EmptyState
          icon={<Cake className="w-8 h-8" />}
          title={STRINGS.dashboard.nothingUpcoming}
          description={STRINGS.dashboard.addPeople}
          action={
            <Button onClick={() => router.push('/add-person')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Person
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {groupOrder.map(group => {
            const groupEvents = groupedEvents[group];
            if (!groupEvents?.length) return null;
            
            return (
              <div key={group}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  {group}
                </h2>
                <div className="space-y-3">
                  {groupEvents.map((event, index) => (
                    <div
                      key={event.id}
                      className={`stagger-${Math.min(index + 1, 5)}`}
                      style={{ animationFillMode: 'backwards' }}
                    >
                      <EventCard
                        {...event}
                        onClick={() => router.push(`/profile/${event.profileId}`)}
                        onMessageAssist={() => setMessageAssistEvent(event)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Message Assist Modal */}
      <MessageAssistModal
        isOpen={!!messageAssistEvent}
        onClose={() => setMessageAssistEvent(null)}
        profileId={messageAssistEvent?.profileId || ''}
        profileName={messageAssistEvent?.profileName || ''}
        profilePicture={messageAssistEvent?.profilePicture || null}
        eventType={messageAssistEvent?.type === 'custom' 
          ? (messageAssistEvent?.customLabel || 'event') 
          : (messageAssistEvent?.type || 'birthday')}
      />
    </div>
  );
}


