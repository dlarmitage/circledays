'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PhotoUpload } from '@/components/PhotoUpload';
import { Spinner } from '@/components/ui/Spinner';
import { EVENT_TYPES } from '@/lib/constants';
import { ArrowLeft, Save, Plus, Trash2, Calendar, X, Repeat, CalendarCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Event {
  id: string;
  type: 'birthday' | 'anniversary' | 'custom';
  customLabel: string | null;
  date: string;
}

interface ProfileData {
  profile: {
    id: string;
    name: string;
    profilePicture: string | null;
  };
  events: Event[];
  isOwnProfile: boolean;
  isCreator: boolean;
  isPlatformAdmin?: boolean;
  userData?: {
    email: string;
    mobile: string | null;
    timezone: string;
    notificationChannel: 'email' | 'sms' | 'both';
  };
}

interface NewEvent {
  type: 'birthday' | 'anniversary' | 'custom';
  customLabel: string;
  date: string;
  recurring: boolean;
}

export default function EditProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [newEvent, setNewEvent] = useState<NewEvent | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  
  useEffect(() => {
    fetchProfile();
  }, [id]);
  
  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/profiles/${id}`);
      const data = await res.json();
      
      if (!data.profile) {
        router.push('/dashboard');
        return;
      }
      
      // Check permission: can edit if own profile, OR creator of unlinked profile, OR admin
      const canEdit = data.isOwnProfile || (data.isCreator && !data.profile.linkedUserId) || data.isPlatformAdmin;
      if (!canEdit) {
        router.push(`/profile/${id}`);
        return;
      }
      
      setProfileData(data);
      setName(data.profile.name);
      setPhotoUrl(data.profile.profilePicture);
      setEvents(data.events || []);
      if (data.userData) {
        setEmail(data.userData.email || '');
        setMobile(data.userData.mobile || '');
      }
      setLoading(false);
    } catch {
      router.push('/dashboard');
    }
  };
  
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      // Update profile
      const profileRes = await fetch(`/api/profiles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          profilePicture: photoUrl,
        }),
      });
      
      if (!profileRes.ok) {
        throw new Error('Failed to save profile');
      }
      
      // If own profile, also update user account data
      if (profileData?.isOwnProfile) {
        const userRes = await fetch('/api/users/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email: email || undefined,
            mobile: mobile || null,
          }),
        });
        
        if (!userRes.ok) {
          const data = await userRes.json();
          throw new Error(data.error || 'Failed to save account details');
        }
      }
      
      router.push(`/profile/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
      setSaving(false);
    }
  };
  
  const handleAddEvent = async () => {
    if (!newEvent || !newEvent.date) return;
    
    try {
      const res = await fetch(`/api/profiles/${id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newEvent.type,
          customLabel: newEvent.type === 'custom' ? newEvent.customLabel : undefined,
          date: newEvent.date,
          recurring: newEvent.type === 'custom' ? newEvent.recurring : true,
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to add event');
      }
      
      const data = await res.json();
      setEvents([...events, data.event]);
      setNewEvent(null);
    } catch (err) {
      setError('Failed to add event');
    }
  };
  
  const handleDeleteEvent = async (eventId: string) => {
    setDeletingEventId(eventId);
    
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete event');
      }
      
      setEvents(events.filter(e => e.id !== eventId));
    } catch (err) {
      setError('Failed to delete event');
    } finally {
      setDeletingEventId(null);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
        
        <Button onClick={handleSave} loading={saving}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>
      
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-6">
        Edit Profile
      </h1>
      
      {error && (
        <div className="mb-4 p-3 bg-coral-50 text-coral-700 rounded-xl text-sm">
          {error}
        </div>
      )}
      
      {/* Basic Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <PhotoUpload
              currentPhoto={photoUrl}
              name={name}
              profileId={id}
              onPhotoChange={setPhotoUrl}
              size="xl"
            />
          </div>
          
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name"
          />
          
          {/* Email and Mobile - only for own profile */}
          {profileData?.isOwnProfile && (
            <>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                hint="Used for login and notifications"
              />
              
              <Input
                label="Mobile Number"
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+1 (555) 000-0000"
                hint="Optional - for SMS reminders"
              />
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Existing Events */}
          {events.length > 0 && (
            <div className="space-y-3 mb-4">
              {events.map(event => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {event.type === 'custom' 
                        ? event.customLabel 
                        : event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(event.date, {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteEvent(event.id)}
                    loading={deletingEventId === event.id}
                  >
                    <Trash2 className="w-4 h-4 text-coral-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          {/* Add New Event */}
          {newEvent ? (
            <div className="border border-teal-200 rounded-xl p-4 bg-teal-50/50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">New Event</h4>
                <button
                  onClick={() => setNewEvent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <Select
                  label="Event Type"
                  options={EVENT_TYPES.map(t => ({ value: t.value, label: t.label }))}
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({
                    ...newEvent,
                    type: e.target.value as NewEvent['type'],
                  })}
                />
                
                {newEvent.type === 'custom' && (
                  <Input
                    label="Event Name"
                    placeholder="e.g., Gotcha Day"
                    value={newEvent.customLabel}
                    onChange={(e) => setNewEvent({
                      ...newEvent,
                      customLabel: e.target.value,
                    })}
                  />
                )}
                
                {newEvent.type === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequency
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewEvent({ ...newEvent, recurring: true })}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl transition-all ${
                          newEvent.recurring
                            ? 'bg-teal-100 border-2 border-teal-500'
                            : 'bg-white border-2 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <Repeat className={`w-4 h-4 ${newEvent.recurring ? 'text-teal-600' : 'text-gray-500'}`} />
                        <span className={`text-sm font-medium ${newEvent.recurring ? 'text-teal-900' : 'text-gray-700'}`}>
                          Every Year
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewEvent({ ...newEvent, recurring: false })}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl transition-all ${
                          !newEvent.recurring
                            ? 'bg-teal-100 border-2 border-teal-500'
                            : 'bg-white border-2 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <CalendarCheck className={`w-4 h-4 ${!newEvent.recurring ? 'text-teal-600' : 'text-gray-500'}`} />
                        <span className={`text-sm font-medium ${!newEvent.recurring ? 'text-teal-900' : 'text-gray-700'}`}>
                          One Time
                        </span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {newEvent.recurring 
                        ? "You'll be reminded every year" 
                        : "You'll only be reminded once (e.g., graduation)"}
                    </p>
                  </div>
                )}
                
                <Input
                  label="Date"
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({
                    ...newEvent,
                    date: e.target.value,
                  })}
                />
                
                <Button
                  onClick={handleAddEvent}
                  disabled={!newEvent.date || (newEvent.type === 'custom' && !newEvent.customLabel)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Event
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              onClick={() => setNewEvent({ type: 'birthday', customLabel: '', date: '', recurring: true })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

