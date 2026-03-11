'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { LogOut } from 'lucide-react';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { NotificationsSection } from '@/components/settings/NotificationsSection';
import { isNativeApp } from '@/lib/capacitor';
import { PrivacySection } from '@/components/settings/PrivacySection';
import { EventsSection } from '@/components/settings/EventsSection';
import { CardPreferencesSection } from '@/components/settings/CardPreferencesSection';

interface UserData {
  id: string;
  email: string;
  pendingEmail: string | null;
  name: string;
  timezone: string;
  mobile: string | null;
  notificationChannel: 'email' | 'sms' | 'both';
  shareNewConnections: boolean;
  pushEnabled: boolean;
}

interface ProfileData {
  id: string;
  name: string;
  profilePicture: string | null;
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
  const [cardCredits, setCardCredits] = useState<number | null>(null);
  const [checkoutBundleId, setCheckoutBundleId] = useState<string | null>(null);

  // Sign-off state
  const [cardSignOff, setCardSignOff] = useState('');
  const [cardSignOffCustom, setCardSignOffCustom] = useState('');
  const [cardSignOffIsCustom, setCardSignOffIsCustom] = useState(false);

  // Sender address state
  const [cardSenderName, setCardSenderName] = useState('');
  const [cardSenderStreet, setCardSenderStreet] = useState('');
  const [cardSenderCity, setCardSenderCity] = useState('');
  const [cardSenderState, setCardSenderState] = useState('');
  const [cardSenderZip, setCardSenderZip] = useState('');

  // Push notification state
  const [pushEnabled, setPushEnabled] = useState(false);

  // Ref for mobile input auto-focus
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Privacy state
  const [shareNewConnections, setShareNewConnections] = useState(true);
  const [savedShareNewConnections, setSavedShareNewConnections] = useState(true);

  // Saved state — used to compute isDirty and to discard changes
  const [savedFormData, setSavedFormData] = useState({
    name: '', email: '', timezone: '', mobile: '', notificationChannel: 'email' as 'email' | 'sms' | 'both',
  });
  const [savedReminderPrefs, setSavedReminderPrefs] = useState<number[]>([0, 1, 7]);
  const [savedCardSignOff, setSavedCardSignOff] = useState('');
  const [savedCardSignOffIsCustom, setSavedCardSignOffIsCustom] = useState(false);
  const [savedCardSignOffCustom, setSavedCardSignOffCustom] = useState('');
  const [savedCardSenderName, setSavedCardSenderName] = useState('');
  const [savedCardSenderStreet, setSavedCardSenderStreet] = useState('');
  const [savedCardSenderCity, setSavedCardSenderCity] = useState('');
  const [savedCardSenderState, setSavedCardSenderState] = useState('');
  const [savedCardSenderZip, setSavedCardSenderZip] = useState('');

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

    // Check if user just opted out of nudge emails
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('nudgeOptedOut') === 'true') {
        setMessage({ type: 'success', text: 'Got it! You won\'t receive notification setup reminders anymore.' });
        window.history.replaceState({}, '', '/settings');
      }
    }

    Promise.all([
      fetch('/api/auth/me').then(res => res.json()),
      fetch('/api/preferences').then(res => res.json()),
      fetch('/api/card-preferences').then(res => res.json()),
      fetch('/api/card-credits').then(res => res.json()),
    ]).then(async ([authData, prefsData, cardPrefsData, cardCreditsData]) => {
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

        // Load push notification setting
        setPushEnabled(authData.user.pushEnabled || false);

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
      if (cardPrefsData.preferences) {
        // Load sign-off
        const loadedSignOff = cardPrefsData.preferences.signOff || '';
        const firstName = (authData.user?.name || '').split(' ')[0];
        const presets = [firstName, `Warmly, ${firstName}`, `Love, ${firstName}`, `Cheers, ${firstName}`];
        const isPreset = presets.includes(loadedSignOff);
        if (isPreset) {
          setCardSignOff(loadedSignOff);
          setCardSignOffIsCustom(false);
          setCardSignOffCustom('');
          setSavedCardSignOff(loadedSignOff);
          setSavedCardSignOffIsCustom(false);
          setSavedCardSignOffCustom('');
        } else if (loadedSignOff) {
          setCardSignOffIsCustom(true);
          setCardSignOffCustom(loadedSignOff);
          setSavedCardSignOffIsCustom(true);
          setSavedCardSignOffCustom(loadedSignOff);
        }

        // Load sender address
        const sName = cardPrefsData.preferences.senderName || '';
        const sStreet = cardPrefsData.preferences.senderAddress1 || '';
        const sCity = cardPrefsData.preferences.senderCity || '';
        const sState = cardPrefsData.preferences.senderState || '';
        const sZip = cardPrefsData.preferences.senderZip || '';
        setCardSenderName(sName);
        setCardSenderStreet(sStreet);
        setCardSenderCity(sCity);
        setCardSenderState(sState);
        setCardSenderZip(sZip);
        setSavedCardSenderName(sName);
        setSavedCardSenderStreet(sStreet);
        setSavedCardSenderCity(sCity);
        setSavedCardSenderState(sState);
        setSavedCardSenderZip(sZip);
      }
      if (typeof cardCreditsData.balance === 'number') {
        setCardCredits(cardCreditsData.balance);
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

  const activeCardSignOff = cardSignOffIsCustom ? cardSignOffCustom : cardSignOff;
  const savedActiveCardSignOff = savedCardSignOffIsCustom ? savedCardSignOffCustom : savedCardSignOff;

  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(savedFormData) ||
      JSON.stringify(reminderPrefs) !== JSON.stringify(savedReminderPrefs) ||
      shareNewConnections !== savedShareNewConnections ||
      activeCardSignOff !== savedActiveCardSignOff ||
      cardSenderName !== savedCardSenderName ||
      cardSenderStreet !== savedCardSenderStreet ||
      cardSenderCity !== savedCardSenderCity ||
      cardSenderState !== savedCardSenderState ||
      cardSenderZip !== savedCardSenderZip;
  }, [formData, savedFormData, reminderPrefs, savedReminderPrefs, shareNewConnections, savedShareNewConnections, activeCardSignOff, savedActiveCardSignOff, cardSenderName, savedCardSenderName, cardSenderStreet, savedCardSenderStreet, cardSenderCity, savedCardSenderCity, cardSenderState, savedCardSenderState, cardSenderZip, savedCardSenderZip]);

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
    setShareNewConnections(savedShareNewConnections);
    setCardSignOff(savedCardSignOff);
    setCardSignOffIsCustom(savedCardSignOffIsCustom);
    setCardSignOffCustom(savedCardSignOffCustom);
    setCardSenderName(savedCardSenderName);
    setCardSenderStreet(savedCardSenderStreet);
    setCardSenderCity(savedCardSenderCity);
    setCardSenderState(savedCardSenderState);
    setCardSenderZip(savedCardSenderZip);
    setMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
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

      if (userResult.user?.pendingEmail) {
        setMessage({
          type: 'success',
          text: `Confirmation email sent to ${userResult.user.pendingEmail}. Please check your inbox to confirm the change.`
        });
        const authRes = await fetch('/api/auth/me');
        const authData = await authRes.json();
        if (authData.user) {
          setUserData(authData.user);
        }
      }

      const prefsRes = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultLeadDays: reminderPrefs }),
      });

      if (!prefsRes.ok) {
        throw new Error('Failed to save preferences');
      }

      await fetch('/api/card-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signOff: activeCardSignOff,
          senderName: cardSenderName,
          senderAddress1: cardSenderStreet,
          senderCity: cardSenderCity,
          senderState: cardSenderState,
          senderZip: cardSenderZip,
        }),
      });

      setSavedFormData(formData);
      setSavedReminderPrefs(reminderPrefs);
      setSavedShareNewConnections(shareNewConnections);
      setSavedCardSignOff(cardSignOff);
      setSavedCardSignOffIsCustom(cardSignOffIsCustom);
      setSavedCardSignOffCustom(cardSignOffCustom);
      setSavedCardSenderName(cardSenderName);
      setSavedCardSenderStreet(cardSenderStreet);
      setSavedCardSenderCity(cardSenderCity);
      setSavedCardSenderState(cardSenderState);
      setSavedCardSenderZip(cardSenderZip);
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

  const handlePushEnabledChange = async (enabled: boolean) => {
    setPushEnabled(enabled);
    try {
      await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pushEnabled: enabled }),
      });
    } catch (error) {
      console.error('Failed to update push setting:', error);
      setPushEnabled(!enabled); // Revert on failure
    }
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

      <ProfileSection
        formData={{ name: formData.name, email: formData.email, timezone: formData.timezone }}
        onFormChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
        profileData={profileData}
        userData={userData ? { email: userData.email, pendingEmail: userData.pendingEmail } : null}
        onPhotoChange={handlePhotoChange}
      />

      <NotificationsSection
        reminderPrefs={reminderPrefs}
        onToggleReminderDay={toggleReminderDay}
        notificationChannel={formData.notificationChannel}
        mobile={formData.mobile}
        onNotificationChannelChange={(channel) => setFormData(prev => ({ ...prev, notificationChannel: channel }))}
        onMobileChange={(mobile) => setFormData(prev => ({ ...prev, mobile }))}
        mobileInputRef={mobileInputRef}
        pushEnabled={pushEnabled}
        onPushEnabledChange={handlePushEnabledChange}
      />

      <PrivacySection
        shareNewConnections={shareNewConnections}
        onChange={setShareNewConnections}
      />

      <EventsSection
        events={events}
        profileData={profileData ? { id: profileData.id, name: profileData.name } : null}
        profileName={formData.name}
        editingEvent={editingEvent}
        editModalOpen={editModalOpen}
        addModalOpen={addModalOpen}
        onEditEvent={handleEditEvent}
        onCloseEditModal={() => { setEditModalOpen(false); setEditingEvent(null); }}
        onOpenAddModal={() => setAddModalOpen(true)}
        onCloseAddModal={() => setAddModalOpen(false)}
        onEventUpdated={handleEventUpdated}
        onEventAdded={handleEventAdded}
      />

      <CardPreferencesSection
        firstName={formData.name.split(' ')[0]}
        cardCredits={cardCredits}
        cardSignOff={cardSignOff}
        cardSignOffCustom={cardSignOffCustom}
        cardSignOffIsCustom={cardSignOffIsCustom}
        onSignOffSelect={(signOff) => { setCardSignOff(signOff); setCardSignOffIsCustom(false); }}
        onSignOffCustomToggle={() => setCardSignOffIsCustom(true)}
        onSignOffCustomChange={setCardSignOffCustom}
        senderAddress={{
          name: cardSenderName,
          street: cardSenderStreet,
          city: cardSenderCity,
          state: cardSenderState,
          zip: cardSenderZip,
        }}
        onSenderAddressChange={(updates) => {
          if (updates.name !== undefined) setCardSenderName(updates.name);
          if (updates.street !== undefined) setCardSenderStreet(updates.street);
          if (updates.city !== undefined) setCardSenderCity(updates.city);
          if (updates.state !== undefined) setCardSenderState(updates.state);
          if (updates.zip !== undefined) setCardSenderZip(updates.zip);
        }}
        onSenderAddressPlaceSelect={(parsed) => {
          setCardSenderStreet(parsed.street);
          if (parsed.city) setCardSenderCity(parsed.city);
          if (parsed.state) setCardSenderState(parsed.state);
          if (parsed.zip) setCardSenderZip(parsed.zip);
        }}
        checkoutBundleId={checkoutBundleId}
        onCheckoutBundleSelect={setCheckoutBundleId}
        onPurchaseSuccess={handlePurchaseSuccess}
        onCheckoutClose={() => setCheckoutBundleId(null)}
      />

      {/* Save / Discard -- only visible when there are unsaved changes */}
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
    </div>
  );
}
