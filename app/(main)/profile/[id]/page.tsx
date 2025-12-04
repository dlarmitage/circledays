'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { formatDate, calculateAge, getDaysUntilText, daysUntil } from '@/lib/utils';
import {
  ArrowLeft,
  Cake,
  Heart,
  Calendar,
  StickyNote,
  Users,
  UserPlus,
  UserMinus,
  Mail,
  Pencil,
} from 'lucide-react';

interface Event {
  id: string;
  type: 'birthday' | 'anniversary' | 'custom';
  customLabel: string | null;
  date: string;
}

interface Connection {
  id: string;
  name: string;
  profilePicture: string | null;
}

interface ProfileData {
  profile: {
    id: string;
    name: string;
    profilePicture: string | null;
    linkedUserId: string | null;
    createdByUserId: string;
  };
  events: Event[];
  note: { content: string } | null;
  connections: Connection[];
  isDirectConnection: boolean;
  isOwnProfile: boolean;
  isCreator: boolean;
  hopDistance?: number;
}

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  
  useEffect(() => {
    fetch(`/api/profiles/${id}`)
      .then(res => res.json())
      .then(profileData => {
        setData(profileData);
        setNoteContent(profileData.note?.content || '');
        setLoading(false);
      })
      .catch(() => {
        router.push('/dashboard');
      });
  }, [id, router]);
  
  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      await fetch(`/api/profiles/${id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteContent }),
      });
    } finally {
      setSavingNote(false);
    }
  };
  
  const handleConnect = async () => {
    const res = await fetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: id }),
    });
    
    if (res.ok) {
      // Refresh the page data
      window.location.reload();
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (!data?.profile) {
    return null;
  }
  
  const { profile, events, connections, isDirectConnection, isOwnProfile, isCreator } = data;
  
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'birthday': return Cake;
      case 'anniversary': return Heart;
      default: return Calendar;
    }
  };
  
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Back</span>
      </button>
      
      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="flex flex-col items-center text-center py-8">
          <Avatar
            src={profile.profilePicture}
            name={profile.name}
            size="xl"
            className="mb-4"
          />
          <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">
            {profile.name}
          </h1>
          
          {!isDirectConnection && data.hopDistance && (
            <Badge variant="info" className="mb-4">
              {data.hopDistance} hops away
            </Badge>
          )}
          
          {!profile.linkedUserId && isCreator && (
            <Badge variant="default" className="mb-4">
              Not on CircleDays yet
            </Badge>
          )}
          
          <div className="flex gap-2 mt-4">
            {isOwnProfile || isCreator ? (
              <Button variant="secondary" size="sm">
                <Pencil className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            ) : !isDirectConnection ? (
              <Button onClick={handleConnect}>
                <UserPlus className="w-4 h-4 mr-2" />
                {data.hopDistance && data.hopDistance <= 2 ? 'Connect' : 'Request Connection'}
              </Button>
            ) : null}
            
            {isCreator && !profile.linkedUserId && (
              <Button variant="secondary" size="sm">
                <Mail className="w-4 h-4 mr-2" />
                Invite
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Events - only show for direct connections */}
      {isDirectConnection && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-gray-500 text-sm">No events yet</p>
            ) : (
              <div className="space-y-3">
                {events.map(event => {
                  const Icon = getEventIcon(event.type);
                  const eventDaysUntil = daysUntil(event.date);
                  const age = event.type === 'birthday' ? calculateAge(event.date) + 1 : null;
                  
                  return (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {event.type === 'custom' ? event.customLabel : event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(event.date, { month: 'long', day: 'numeric', year: 'numeric' })}
                            {age && ` · Turning ${age}`}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={eventDaysUntil === 0 ? 'danger' : eventDaysUntil <= 7 ? 'warning' : 'success'}
                      >
                        {getDaysUntilText(eventDaysUntil)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
            
            {(isOwnProfile || isCreator) && (
              <Button variant="ghost" size="sm" className="mt-4">
                <Calendar className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Notes - only for direct connections */}
      {isDirectConnection && !isOwnProfile && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-teal-600" />
              My Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Add private notes about this person..."
              className="w-full h-32 p-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSaveNote}
              loading={savingNote}
              className="mt-2"
            >
              Save Note
            </Button>
            <p className="text-xs text-gray-400 mt-2">
              Only you can see these notes
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Connections */}
      {isDirectConnection && connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              {profile.name}'s Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {connections.slice(0, 9).map(connection => (
                <button
                  key={connection.id}
                  onClick={() => router.push(`/profile/${connection.id}`)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <Avatar
                    src={connection.profilePicture}
                    name={connection.name}
                    size="sm"
                  />
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {connection.name}
                  </span>
                </button>
              ))}
            </div>
            {connections.length > 9 && (
              <p className="text-sm text-gray-500 mt-3">
                +{connections.length - 9} more connections
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

