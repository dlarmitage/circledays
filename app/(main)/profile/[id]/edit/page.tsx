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
import { ArrowLeft, Save, Plus, Trash2, Calendar, X } from 'lucide-react';

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
}

interface NewEvent {
  type: 'birthday' | 'anniversary' | 'custom';
  customLabel: string;
  date: string;
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
      
      // Check permission
      if (!data.isOwnProfile && !data.isCreator) {
        router.push(`/profile/${id}`);
        return;
      }
      
      setProfileData(data);
      setName(data.profile.name);
      setPhotoUrl(data.profile.profilePicture);
      setEvents(data.events || []);
      setLoading(false);
    } catch {
      router.push('/dashboard');
    }
  };
  
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/profiles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          profilePicture: photoUrl,
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to save');
      }
      
      router.push(`/profile/${id}`);
    } catch (err) {
      setError('Failed to save changes');
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
                      {new Date(event.date).toLocaleDateString('en-US', {
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
              onClick={() => setNewEvent({ type: 'birthday', customLabel: '', date: '' })}
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

