'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PhotoUpload } from '@/components/PhotoUpload';
import { Spinner } from '@/components/ui/Spinner';
import { EditEventModal } from '@/components/EditEventModal';
import { AddEventModal } from '@/components/AddEventModal';
import { COMMON_TIMEZONES, NOTIFICATION_CHANNELS, CREDIT_BUNDLES, STRINGS } from '@/lib/constants';
import { formatDate, parseLocalDate } from '@/lib/utils';
import { User, Bell, LogOut, Calendar, Cake, Heart, Star, Pencil, Lock, Plus, Mail, CreditCard, History, Check, Eye } from 'lucide-react';
import { StripeCheckoutModal } from '@/components/StripeCheckoutModal';

interface UserData {
  id: string;
  email: string;
  pendingEmail: string | null;
  name: string;
  timezone: string;
  mobile: string | null;
  notificationChannel: 'email' | 'sms' | 'both';
  shareNewConnections: boolean;
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

interface StyleOption {
  id: string;
  name: string;
  preview?: string;
}

interface CardOrder {
  id: string;
  recipientName: string;
  recipientCity: string;
  recipientState: string;
  message: string;
  status: string;
  createdAt: string;
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

  // Card prefs state
  const [cardHandwritingId, setCardHandwritingId] = useState('');
  const [cardStationeryId, setCardStationeryId] = useState('');
  const [handwritingStyles, setHandwritingStyles] = useState<StyleOption[]>([]);
  const [stationeryOptions, setStationeryOptions] = useState<StyleOption[]>([]);
  const [cardCredits, setCardCredits] = useState<number | null>(null);
  const [cardOrders, setCardOrders] = useState<CardOrder[]>([]);
  const [checkoutBundleId, setCheckoutBundleId] = useState<string | null>(null);

  // Privacy state
  const [shareNewConnections, setShareNewConnections] = useState(true);
  const [savedShareNewConnections, setSavedShareNewConnections] = useState(true);

  // Saved state — used to compute isDirty and to discard changes
  const [savedFormData, setSavedFormData] = useState({
    name: '', email: '', timezone: '', mobile: '', notificationChannel: 'email' as 'email' | 'sms' | 'both',
  });
  const [savedReminderPrefs, setSavedReminderPrefs] = useState<number[]>([0, 1, 7]);
  const [savedCardHandwritingId, setSavedCardHandwritingId] = useState('');
  const [savedCardStationeryId, setSavedCardStationeryId] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    timezone: '',
    mobile: '',
    notificationChannel: 'email' as 'email' | 'sms' | 'both',
  });
  
  const fetchEvents = async (profileId: string) => {
    try {
      const res = await fetch(`/api/profiles/${profileId}`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  };
  
  useEffect(() => {
    // Check for email confirmation success
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('emailConfirmed') === 'true') {
        setMessage({ type: 'success', text: 'Email confirmed successfully!' });
        // Remove query param from URL
        window.history.replaceState({}, '', '/settings');
      }
    }
    
    // Check if returning from Stripe after a successful purchase
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('credits') === 'added') {
        setMessage({ type: 'success', text: 'Credits added! Your balance has been updated.' });
        window.history.replaceState({}, '', '/settings');
      }
    }

    Promise.all([
      fetch('/api/auth/me').then(res => res.json()),
      fetch('/api/preferences').then(res => res.json()),
      fetch('/api/card-preferences').then(res => res.json()),
      fetch('/api/card-credits').then(res => res.json()),
      fetch('/api/handwritten-cards').then(res => res.json()),
    ]).then(async ([authData, prefsData, cardPrefsData, cardCreditsData, cardOrdersData]) => {
      if (authData.user) {
        setUserData(authData.user);
        setProfileData(authData.profile);
        const loadedForm = {
          name: authData.user.name,
          email: authData.user.pendingEmail || authData.user.email,
          timezone: authData.user.timezone,
          mobile: authData.user.mobile || '',
          notificationChannel: authData.user.notificationChannel,
        };
        setFormData(loadedForm);
        setSavedFormData(loadedForm);

        // Load privacy setting
        const loadedShareNewConnections = authData.user.shareNewConnections !== false;
        setShareNewConnections(loadedShareNewConnections);
        setSavedShareNewConnections(loadedShareNewConnections);

        // Fetch events for user's profile
        if (authData.profile?.id) {
          await fetchEvents(authData.profile.id);
        }
      }
      if (prefsData.preferences) {
        setReminderPrefs(prefsData.preferences.defaultLeadDays);
        setSavedReminderPrefs(prefsData.preferences.defaultLeadDays);
      }
      let loadedHandwritingId = '';
      let loadedStationeryId = '';
      if (cardPrefsData.preferences) {
        loadedHandwritingId = cardPrefsData.preferences.handwritingId || '';
        loadedStationeryId = cardPrefsData.preferences.stationeryId || '';
        setCardHandwritingId(loadedHandwritingId);
        setCardStationeryId(loadedStationeryId);
      }
      if (cardPrefsData.handwritingStyles?.length) {
        setHandwritingStyles(cardPrefsData.handwritingStyles);
        if (!cardPrefsData.preferences?.handwritingId) {
          loadedHandwritingId = cardPrefsData.handwritingStyles[0].id;
          setCardHandwritingId(loadedHandwritingId);
        }
      }
      if (cardPrefsData.stationeryOptions?.length) {
        setStationeryOptions(cardPrefsData.stationeryOptions);
        if (!cardPrefsData.preferences?.stationeryId) {
          loadedStationeryId = cardPrefsData.stationeryOptions[0].id;
          setCardStationeryId(loadedStationeryId);
        }
      }
      setSavedCardHandwritingId(loadedHandwritingId);
      setSavedCardStationeryId(loadedStationeryId);
      if (typeof cardCreditsData.balance === 'number') {
        setCardCredits(cardCreditsData.balance);
      }
      if (cardOrdersData.orders) {
        setCardOrders(cardOrdersData.orders.slice(0, 10));
      }
      setLoading(false);
    });
  }, []);
  
  const toggleReminderDay = (days: number) => {
    setReminderPrefs(prev => {
      if (prev.includes(days)) {
        if (prev.length === 1) return prev;
        return prev.filter(d => d !== days);
      } else {
        return [...prev, days].sort((a, b) => a - b);
      }
    });
  };

  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(savedFormData) ||
      JSON.stringify(reminderPrefs) !== JSON.stringify(savedReminderPrefs) ||
      cardHandwritingId !== savedCardHandwritingId ||
      cardStationeryId !== savedCardStationeryId ||
      shareNewConnections !== savedShareNewConnections;
  }, [formData, savedFormData, reminderPrefs, savedReminderPrefs, cardHandwritingId, savedCardHandwritingId, cardStationeryId, savedCardStationeryId, shareNewConnections, savedShareNewConnections]);

  // Warn on browser close / refresh when there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleDiscard = () => {
    setFormData(savedFormData);
    setReminderPrefs(savedReminderPrefs);
    setCardHandwritingId(savedCardHandwritingId);
    setCardStationeryId(savedCardStationeryId);
    setShareNewConnections(savedShareNewConnections);
    setMessage(null);
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
          email: formData.email,
          timezone: formData.timezone,
          mobile: formData.mobile || null,
          notificationChannel: formData.notificationChannel,
          shareNewConnections,
        }),
      });
      
      if (!userRes.ok) {
        const errorData = await userRes.json();
        throw new Error(errorData.error || 'Failed to save user settings');
      }
      
      const userResult = await userRes.json();
      
      // If email was changed, show confirmation message
      if (userResult.user?.pendingEmail) {
        setMessage({ 
          type: 'success', 
          text: `Confirmation email sent to ${userResult.user.pendingEmail}. Please check your inbox to confirm the change.` 
        });
        // Refresh user data to show pending email
        const authRes = await fetch('/api/auth/me');
        const authData = await authRes.json();
        if (authData.user) {
          setUserData(authData.user);
        }
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

      // Save card preferences
      if (handwritingStyles.length > 0 || stationeryOptions.length > 0) {
        await fetch('/api/card-preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handwritingId: cardHandwritingId, stationeryId: cardStationeryId }),
        });
      }

      // Update saved state so isDirty resets to false
      setSavedFormData(formData);
      setSavedReminderPrefs(reminderPrefs);
      setSavedCardHandwritingId(cardHandwritingId);
      setSavedCardStationeryId(cardStationeryId);
      setSavedShareNewConnections(shareNewConnections);
      setMessage({ type: 'success', text: 'Settings saved!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handlePurchaseSuccess = async () => {
    setCheckoutBundleId(null);
    const res = await fetch('/api/card-credits');
    const data = await res.json();
    if (typeof data.balance === 'number') setCardCredits(data.balance);
    setMessage({ type: 'success', text: 'Credits added to your account!' });
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
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
          
          {userData?.pendingEmail && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>Email change pending:</strong> A confirmation email has been sent to <strong>{userData.pendingEmail}</strong>. 
                Please check your inbox and click the confirmation link to complete the change.
              </p>
            </div>
          )}
          
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            hint={userData?.pendingEmail ? `Current: ${userData.email} • Pending: ${userData.pendingEmail}` : "Used for magic link sign-in and notifications"}
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

      {/* Privacy Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-teal-600" />
            {STRINGS.privacy.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={shareNewConnections}
                onChange={(e) => setShareNewConnections(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-teal-500 transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">
                {STRINGS.privacy.shareNewConnections}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {STRINGS.privacy.shareNewConnectionsDescription}
              </p>
            </div>
          </label>
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
      
      {/* Handwritten Cards Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-teal-600" />
            Handwritten Cards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Credit balance */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-teal-600" />
              <div>
                <p className="font-medium text-gray-900">
                  {cardCredits !== null ? `${cardCredits} credit${cardCredits === 1 ? '' : 's'}` : '—'}
                </p>
                <p className="text-xs text-gray-500">Each credit sends one card (~$4 value)</p>
              </div>
            </div>
          </div>

          {/* Buy credits */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Buy credits</p>
            <div className="grid grid-cols-3 gap-2">
              {CREDIT_BUNDLES.map(bundle => (
                <button
                  key={bundle.id}
                  onClick={() => setCheckoutBundleId(bundle.id)}
                  className="flex flex-col items-center p-3 rounded-xl border-2 border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition-all text-center"
                >
                  <span className="font-semibold text-gray-900 text-sm">{bundle.label}</span>
                  <span className="text-xs text-gray-500 mt-0.5">${bundle.priceUsd.toFixed(2)}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Secure checkout via Stripe. Credits are added immediately after payment.
            </p>
          </div>

          <StripeCheckoutModal
            bundleId={checkoutBundleId}
            onSuccess={handlePurchaseSuccess}
            onClose={() => setCheckoutBundleId(null)}
          />

          {/* Handwriting style picker */}
          {handwritingStyles.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Preferred handwriting style</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {handwritingStyles.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setCardHandwritingId(s.id)}
                    className={`relative flex flex-col rounded-xl border-2 overflow-hidden transition-all active:scale-95 ${
                      cardHandwritingId === s.id
                        ? 'border-teal-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {s.preview ? (
                      <img
                        src={s.preview}
                        alt={s.name}
                        className="w-full aspect-[4/3] object-cover bg-gray-50"
                      />
                    ) : (
                      <div className="w-full aspect-[4/3] bg-gray-100 flex items-center justify-center">
                        <span className="text-2xl font-serif italic text-gray-400">Aa</span>
                      </div>
                    )}
                    <div className={`px-1.5 py-1 text-center text-xs font-medium truncate ${
                      cardHandwritingId === s.id ? 'bg-teal-500 text-white' : 'bg-white text-gray-700'
                    }`}>
                      {s.name}
                    </div>
                    {cardHandwritingId === s.id && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center shadow">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stationery picker */}
          {stationeryOptions.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Preferred stationery</p>
              <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 p-3 scrollbar-thin">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {stationeryOptions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setCardStationeryId(s.id)}
                      className={`relative flex flex-col rounded-xl border-2 overflow-hidden transition-all active:scale-95 ${
                        cardStationeryId === s.id
                          ? 'border-teal-500'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {s.preview ? (
                        <img
                          src={s.preview}
                          alt={s.name}
                          className="w-full aspect-[3/4] object-cover bg-gray-50"
                        />
                      ) : (
                        <div className="w-full aspect-[3/4] bg-gray-100 flex items-center justify-center">
                          <Mail className="w-5 h-5 text-gray-300" />
                        </div>
                      )}
                      <div className={`px-1 py-1 text-center leading-tight text-[10px] font-medium ${
                        cardStationeryId === s.id ? 'bg-teal-500 text-white' : 'bg-white text-gray-600'
                      }`}>
                        {s.name}
                      </div>
                      {cardStationeryId === s.id && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center shadow">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Scroll to see all {stationeryOptions.length} designs</p>
            </div>
          )}

          {/* Card history */}
          {cardOrders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-gray-500" />
                <p className="text-sm font-medium text-gray-700">Recent cards sent</p>
              </div>
              <div className="space-y-2">
                {cardOrders.map(order => (
                  <div key={order.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl text-sm">
                    <Mail className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{order.recipientName}</p>
                      <p className="text-xs text-gray-500">{order.recipientCity}, {order.recipientState}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{order.message}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      order.status === 'complete' ? 'bg-teal-100 text-teal-700' :
                      order.status === 'problem' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save / Discard — only visible when there are unsaved changes */}
      <div className="flex items-center gap-4 mb-8 min-h-[40px]">
        {isDirty && (
          <>
            <Button onClick={handleSave} loading={saving}>
              Save Changes
            </Button>
            <Button variant="secondary" onClick={handleDiscard} disabled={saving}>
              Discard
            </Button>
          </>
        )}
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
