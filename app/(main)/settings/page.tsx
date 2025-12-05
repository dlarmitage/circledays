'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PhotoUpload } from '@/components/PhotoUpload';
import { Spinner } from '@/components/ui/Spinner';
import { EditEventModal } from '@/components/EditEventModal';
import { AddEventModal } from '@/components/AddEventModal';
import { COMMON_TIMEZONES, NOTIFICATION_CHANNELS } from '@/lib/constants';
import { formatDate, parseLocalDate } from '@/lib/utils';
import { User, Bell, LogOut, Calendar, Cake, Heart, Star, Pencil, Lock, Plus } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  name: string;
  timezone: string;
  mobile: string | null;
  notificationChannel: 'email' | 'sms' | 'both';
}

interface ProfileData {
  id: string;
  name: string;
  profilePicture: string | null;
}

interface ReminderPreferences {
  defaultLeadDays: number[];
}

interface Event {
  id: string;
  type: 'birthday' | 'anniversary' | 'custom';
  customLabel: string | null;
  date: string;
  recurring: boolean;
  isPrivate: boolean;
  createdByUserId: string | null;
}

const REMINDER_OPTIONS = [
  { days: 0, label: 'Day of', emoji: '📅' },
  { days: 1, label: '1 day', emoji: '1️⃣' },
  { days: 3, label: '3 days', emoji: '3️⃣' },
  { days: 7, label: '1 week', emoji: '📆' },
  { days: 14, label: '2 weeks', emoji: '🗓️' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [reminderPrefs, setReminderPrefs] = useState<number[]>([0, 1, 7]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Event modal state
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    timezone: '',
    mobile: '',
    notificationChannel: 'email' as 'email' | 'sms' | 'both',
  });
  
  const fetchEvents = async (profileId: string) => {
    try {
      const res = await fetch(`/api/profiles/${profileId}`);
      const data = await res.json();
      setEvents(data.profile?.events || []);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  };
  
  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(res => res.json()),
      fetch('/api/preferences').then(res => res.json()),
    ]).then(async ([authData, prefsData]) => {
      if (authData.user) {
        setUserData(authData.user);
        setProfileData(authData.profile);
        setFormData({
          name: authData.user.name,
          timezone: authData.user.timezone,
          mobile: authData.user.mobile || '',
          notificationChannel: authData.user.notificationChannel,
        });
        
        // Fetch events for user's profile
        if (authData.profile?.id) {
          await fetchEvents(authData.profile.id);
        }
      }
      if (prefsData.preferences) {
        setReminderPrefs(prefsData.preferences.defaultLeadDays);
      }
      setLoading(false);
    });
  }, []);
  
  const toggleReminderDay = (days: number) => {
    setReminderPrefs(prev => {
      if (prev.includes(days)) {
        // Don't allow removing all - keep at least one
        if (prev.length === 1) return prev;
        return prev.filter(d => d !== days);
      } else {
        return [...prev, days].sort((a, b) => a - b);
      }
    });
  };
  
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      // Save user settings
      const userRes = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          timezone: formData.timezone,
          mobile: formData.mobile || null,
          notificationChannel: formData.notificationChannel,
        }),
      });
      
      if (!userRes.ok) {
        throw new Error('Failed to save user settings');
      }
      
      // Save reminder preferences
      const prefsRes = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultLeadDays: reminderPrefs,
        }),
      });
      
      if (!prefsRes.ok) {
        throw new Error('Failed to save preferences');
      }
      
      setMessage({ type: 'success', text: 'Settings saved!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };
  
  const handlePhotoChange = (url: string | null) => {
    if (profileData) {
      setProfileData({ ...profileData, profilePicture: url });
    }
  };
  
  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setEditModalOpen(true);
  };
  
  const handleEventUpdated = () => {
    setEditModalOpen(false);
    setEditingEvent(null);
    if (profileData?.id) {
      fetchEvents(profileData.id);
    }
  };
  
  const handleEventAdded = () => {
    setAddModalOpen(false);
    if (profileData?.id) {
      fetchEvents(profileData.id);
    }
  };
  
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'birthday': return <Cake className="w-4 h-4 text-coral-500" />;
      case 'anniversary': return <Heart className="w-4 h-4 text-pink-500" />;
      default: return <Star className="w-4 h-4 text-amber-500" />;
    }
  };
  
  const getEventLabel = (event: Event) => {
    switch (event.type) {
      case 'birthday': return 'Birthday';
      case 'anniversary': return 'Anniversary';
      default: return event.customLabel || 'Custom Event';
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
      <div className="mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900">
          Settings
        </h1>
        <p className="text-gray-600 mt-1">
          Manage your account and preferences
        </p>
      </div>
      
      {/* Profile Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-teal-600" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <PhotoUpload
              currentPhoto={profileData?.profilePicture}
              name={formData.name}
              profileId={profileData?.id}
              onPhotoChange={handlePhotoChange}
              size="xl"
            />
          </div>
          
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          
          <Input
            label="Email"
            value={userData?.email || ''}
            disabled
            hint="Email cannot be changed"
          />
          
          <Select
            label="Timezone"
            options={COMMON_TIMEZONES.map(tz => ({ value: tz.value, label: tz.label }))}
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
          />
        </CardContent>
      </Card>
      
      {/* Notifications Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-teal-600" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Reminder Timing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remind me
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Tap to select when you want to be reminded
            </p>
            <div className="flex flex-wrap gap-2">
              {REMINDER_OPTIONS.map(option => {
                const isSelected = reminderPrefs.includes(option.days);
                return (
                  <button
                    key={option.days}
                    type="button"
                    onClick={() => toggleReminderDay(option.days)}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium
                      transition-all duration-200 active:scale-95
                      ${isSelected 
                        ? 'bg-teal-500 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                  >
                    <span>{option.emoji}</span>
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {reminderPrefs.length === 0 
                ? 'Select at least one reminder time'
                : `You'll be reminded ${reminderPrefs.map(d => 
                    d === 0 ? 'on the day' : d === 1 ? '1 day before' : `${d} days before`
                  ).join(', ')}`
              }
            </p>
          </div>
          
          {/* Notification Method */}
          <Select
            label="Notification method"
            options={NOTIFICATION_CHANNELS.map(c => ({ value: c.value, label: c.label }))}
            value={formData.notificationChannel}
            onChange={(e) => setFormData({ ...formData, notificationChannel: e.target.value as typeof formData.notificationChannel })}
          />
          
          {(formData.notificationChannel === 'sms' || formData.notificationChannel === 'both') && (
            <Input
              label="Mobile number"
              type="tel"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              placeholder="+1 (555) 000-0000"
            />
          )}
        </CardContent>
      </Card>
      
      {/* My Events Section */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            My Events
          </CardTitle>
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => setAddModalOpen(true)}
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
                onClick={() => setAddModalOpen(true)}
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
                      onClick={() => handleEditEvent(event)}
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
      
      {/* Save Button */}
      <div className="flex items-center gap-4 mb-8">
        <Button onClick={handleSave} loading={saving}>
          Save Changes
        </Button>
        {message && (
          <p className={`text-sm ${message.type === 'success' ? 'text-teal-600' : 'text-coral-600'}`}>
            {message.text}
          </p>
        )}
      </div>
      
      {/* Danger Zone */}
      <Card className="border-coral-200">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="font-medium text-gray-900">Sign Out</p>
            <p className="text-sm text-gray-500">Sign out of your account</p>
          </div>
          <Button variant="secondary" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
      
      {/* Legal Links */}
      <div className="text-center mt-8 mb-4">
        <a
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-500 hover:text-teal-600 transition-colors"
        >
          Terms of Service & Privacy Policy
        </a>
      </div>
      
      {/* Edit Event Modal */}
      {editingEvent && (
        <EditEventModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingEvent(null);
          }}
          event={editingEvent}
          profileName={formData.name}
          onEventUpdated={handleEventUpdated}
        />
      )}
      
      {/* Add Event Modal */}
      {profileData && (
        <AddEventModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          profileId={profileData.id}
          profileName={formData.name}
          onEventAdded={handleEventAdded}
        />
      )}
    </div>
  );
}
