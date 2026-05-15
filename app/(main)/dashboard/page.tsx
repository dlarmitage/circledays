'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { EventCard } from '@/components/EventCard';
import { NewConnectionsCard } from '@/components/NewConnectionsCard';
import { MessageAssistModal } from '@/components/MessageAssistModal';
import { SendCardModal } from '@/components/SendCardModal';
import { ConnectionDiscoveriesCard } from '@/components/ConnectionDiscoveriesCard';
import { ConnectionDiscoveriesModal, type Discovery } from '@/components/ConnectionDiscoveriesModal';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { STRINGS } from '@/lib/constants';
import { Plus, Cake, Bell, X } from 'lucide-react';

const DISMISSED_CONNECTIONS_KEY = 'circledays_dismissed_connections';
const DISMISSED_DISCOVERIES_KEY = 'circledays_dismissed_discoveries';
const DISCOVERIES_BANNER_DISMISSED_KEY = 'circledays_discoveries_banner_dismissed';
const NOTIFICATIONS_NUDGE_DISMISSED_KEY = 'circledays_notifications_nudge_dismissed';

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
  cardOrdered?: boolean;
}

interface UserData {
  user: {
    id: string;
    name: string;
    email: string;
    mobile: string | null;
    notificationChannel: string | null;
    isPlatformAdmin?: boolean;
  };
}

interface NewConnection {
  connectionId: string;
  profile: {
    id: string;
    name: string;
    profilePicture: string | null;
  };
  createdAt: string;
  createdByUserId: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming');
  const [newConnections, setNewConnections] = useState<NewConnection[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Message Assist modal state
  const [messageAssistEvent, setMessageAssistEvent] = useState<UpcomingEvent | null>(null);

  // Send Card modal state
  const [sendCardEvent, setSendCardEvent] = useState<UpcomingEvent | null>(null);

  // Discoveries state
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [dismissedDiscoveryIds, setDismissedDiscoveryIds] = useState<Set<string>>(new Set());
  const [discoveryBannerDismissed, setDiscoveryBannerDismissed] = useState(false);
  const [notificationsNudgeDismissed, setNotificationsNudgeDismissed] = useState(false);
  const [discoveriesModalOpen, setDiscoveriesModalOpen] = useState(false);

  // Load dismissed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(DISMISSED_CONNECTIONS_KEY);
    if (saved) {
      try {
        setDismissedIds(new Set(JSON.parse(saved)));
      } catch (e) {
        // Invalid JSON, ignore
      }
    }
    const savedDiscoveries = localStorage.getItem(DISMISSED_DISCOVERIES_KEY);
    if (savedDiscoveries) {
      try {
        setDismissedDiscoveryIds(new Set(JSON.parse(savedDiscoveries)));
      } catch (e) {
        // Invalid JSON, ignore
      }
    }
    const bannerDismissed = localStorage.getItem(DISCOVERIES_BANNER_DISMISSED_KEY);
    if (bannerDismissed) {
      setDiscoveryBannerDismissed(true);
    }
    const nudgeDismissed = localStorage.getItem(NOTIFICATIONS_NUDGE_DISMISSED_KEY);
    if (nudgeDismissed) {
      setNotificationsNudgeDismissed(true);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(res => res.json()),
      fetch(`/api/events/upcoming?days=${days}&pastDays=7`).then(res => res.json()),
      fetch('/api/connections?includeNew=true').then(res => res.json()),
      fetch('/api/discoveries').then(res => res.json()),
    ]).then(([userRes, eventsRes, connectionsRes, discoveriesRes]) => {
      // Redirect to welcome screen if user hasn't seen it yet
      if (userRes.user && !userRes.user.hasSeenWelcome) {
        router.push('/welcome');
        return;
      }
      setUserData(userRes);
      setEvents(eventsRes.events || []);
      setNewConnections(connectionsRes.newConnections || []);
      setDiscoveries(discoveriesRes.discoveries || []);
      setLoading(false);
    });
  }, [days]);

  // Handle dismissing a new connection notification
  const handleDismissConnection = (connectionId: string) => {
    const newDismissed = new Set([...dismissedIds, connectionId]);
    setDismissedIds(newDismissed);
    localStorage.setItem(DISMISSED_CONNECTIONS_KEY, JSON.stringify([...newDismissed]));
  };

  // Handle disconnecting from someone who connected with you
  const handleDisconnect = async (connectionId: string) => {
    const res = await fetch(`/api/connections/${connectionId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      // Also dismiss so it doesn't reappear
      handleDismissConnection(connectionId);
      setNewConnections(prev => prev.filter(c => c.connectionId !== connectionId));
    }
  };

  // Dismiss all new connection notifications
  const handleDismissAllConnections = () => {
    const allIds = newConnections.map(c => c.connectionId);
    const newDismissed = new Set([...dismissedIds, ...allIds]);
    setDismissedIds(newDismissed);
    localStorage.setItem(DISMISSED_CONNECTIONS_KEY, JSON.stringify([...newDismissed]));
  };

  // Filter out already dismissed connections
  const visibleNewConnections = newConnections.filter(c => !dismissedIds.has(c.connectionId));

  // Discoveries handlers
  const handleDismissDiscovery = (profileId: string) => {
    const newDismissed = new Set([...dismissedDiscoveryIds, profileId]);
    setDismissedDiscoveryIds(newDismissed);
    localStorage.setItem(DISMISSED_DISCOVERIES_KEY, JSON.stringify([...newDismissed]));
  };

  const handleDismissDiscoveryBanner = () => {
    setDiscoveryBannerDismissed(true);
    localStorage.setItem(DISCOVERIES_BANNER_DISMISSED_KEY, 'true');
  };

  const handleDismissNotificationsNudge = () => {
    setNotificationsNudgeDismissed(true);
    localStorage.setItem(NOTIFICATIONS_NUDGE_DISMISSED_KEY, 'true');
  };

  const handleAddDiscovery = async (profileId: string) => {
    const res = await fetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId }),
    });
    if (!res.ok) {
      throw new Error('Failed to add connection');
    }
    // Refresh events in case the new connection has upcoming events
    const eventsRes = await fetch(`/api/events/upcoming?days=${days}&pastDays=7`);
    const eventsData = await eventsRes.json();
    setEvents(eventsData.events || []);
  };

  // Filter out dismissed discoveries
  const visibleDiscoveries = discoveries.filter(d => !dismissedDiscoveryIds.has(d.profileId));

  // Separate upcoming from recently passed events
  const upcomingEvents = events.filter(e => e.daysUntil >= 0);
  const pastEvents = events.filter(e => e.daysUntil < 0);

  const groupedEvents = upcomingEvents.reduce((acc, event) => {
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
        <div className="min-w-0">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900 truncate">
            {userData?.user?.name ? `Hey, ${userData.user.name.split(' ')[0]}!` : 'Dashboard'}
          </h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">
            {view === 'past'
              ? `${pastEvents.length} recently passed`
              : `${upcomingEvents.length} upcoming ${upcomingEvents.length === 1 ? 'occasion' : 'occasions'}`}
          </p>
        </div>
        <Button onClick={() => router.push('/add-person')} className="shrink-0">
          <Plus className="w-4 h-4 md:mr-2" />
          <span className="hidden md:inline">Add Person</span>
          <span className="md:hidden">Person</span>
        </Button>
      </div>

      {/* New Connections Card */}
      <NewConnectionsCard
        connections={visibleNewConnections}
        onDismiss={handleDismissConnection}
        onDisconnect={handleDisconnect}
        onDismissAll={handleDismissAllConnections}
      />

      {/* Notifications setup nudge */}
      {!notificationsNudgeDismissed && userData?.user && !userData.user.mobile && !userData.user.notificationChannel && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 flex items-start gap-3">
          <div className="shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mt-0.5">
            <Bell className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">You won't get reminders yet</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Add a mobile number or turn on email notifications in{' '}
              <button
                onClick={() => router.push('/settings')}
                className="underline font-medium hover:text-amber-900 transition-colors"
              >
                Settings
              </button>{' '}
              so CircleDays can remind you about upcoming occasions.
            </p>
          </div>
          <button
            onClick={handleDismissNotificationsNudge}
            className="shrink-0 text-amber-400 hover:text-amber-600 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Connection Discoveries Banner */}
      {!discoveryBannerDismissed && (
        <ConnectionDiscoveriesCard
          count={visibleDiscoveries.length}
          onShowMe={() => setDiscoveriesModalOpen(true)}
          onDismiss={handleDismissDiscoveryBanner}
        />
      )}

      {/* Time filter */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setView('upcoming'); setDays(30); }}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${view === 'upcoming' && days === 30
              ? 'bg-teal-500 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
        >
          Next 4 weeks
        </button>
        <button
          onClick={() => { setView('upcoming'); setDays(90); }}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${view === 'upcoming' && days === 90
              ? 'bg-teal-500 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
        >
          Next 3 months
        </button>
        {pastEvents.length > 0 && (
          <button
            onClick={() => setView('past')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${view === 'past'
                ? 'bg-gray-700 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
          >
            Past week
          </button>
        )}
      </div>

      {/* Events */}
      {view === 'past' ? (
        <div className="space-y-3">
          {pastEvents.map((event) => (
            <EventCard
              key={event.id}
              {...event}
              onClick={() => router.push(`/profile/${event.profileId}`)}
              onMessageAssist={() => setMessageAssistEvent(event)}
              onSendCard={userData?.user?.isPlatformAdmin ? () => setSendCardEvent(event) : undefined}
            />
          ))}
        </div>
      ) : upcomingEvents.length === 0 ? (
        <EmptyState
          icon={<Cake className="w-8 h-8" />}
          title={STRINGS.dashboard.nothingUpcoming}
          description={days === 30
            ? 'No occasions coming up in the next 4 weeks. Try expanding to 3 months, or add more people to your circle.'
            : 'No occasions coming up in the next 3 months. Add more people to your circle to stay connected.'}
          action={
            <Button onClick={() => router.push('/add-person')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Person
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
                        onSendCard={userData?.user?.isPlatformAdmin ? () => setSendCardEvent(event) : undefined}
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
          ? (messageAssistEvent?.customLabel || 'occasion')
          : (messageAssistEvent?.type || 'birthday')}
        daysUntil={messageAssistEvent?.daysUntil}
      />

      {/* Connection Discoveries Modal */}
      <ConnectionDiscoveriesModal
        isOpen={discoveriesModalOpen}
        onClose={() => setDiscoveriesModalOpen(false)}
        discoveries={visibleDiscoveries}
        onAdd={handleAddDiscovery}
        onDismiss={handleDismissDiscovery}
      />

      {/* Send Handwritten Card Modal */}
      <SendCardModal
        isOpen={!!sendCardEvent}
        onClose={() => setSendCardEvent(null)}
        profileId={sendCardEvent?.profileId || ''}
        profileName={sendCardEvent?.profileName || ''}
        profilePicture={sendCardEvent?.profilePicture || null}
        eventType={sendCardEvent?.type === 'custom'
          ? (sendCardEvent?.customLabel || 'event')
          : (sendCardEvent?.type || 'birthday')}
        daysUntil={sendCardEvent?.daysUntil}
        eventDate={sendCardEvent?.date}
        eventId={sendCardEvent?.id}
        userName={userData?.user?.name || ''}
      />
    </div>
  );
}


