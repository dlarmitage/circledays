'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Avatar } from '@/components/ui/Avatar';
import { COMMON_TIMEZONES, NOTIFICATION_CHANNELS } from '@/lib/constants';
import { ArrowRight, ArrowLeft, User, Globe, Bell, Cake, UserCheck, Sparkles } from 'lucide-react';

type Step = 'name' | 'birthday' | 'check-existing' | 'timezone' | 'notifications';

interface PendingInvite {
  id: string;
  profileId: string;
  profileName: string;
  profilePicture: string | null;
  invitedByName: string;
}

interface MatchingProfile {
  id: string;
  name: string;
  profilePicture: string | null;
  hasBirthdayMatch: boolean;
  createdByName: string;
}

function OnboardingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email');
  
  const [step, setStep] = useState<Step>('name');
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Existing profile data
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);
  const [matchingProfiles, setMatchingProfiles] = useState<MatchingProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    mobile: '',
    notificationChannel: 'email' as 'email' | 'sms' | 'both',
    birthdate: '',
  });
  
  useEffect(() => {
    if (!email) {
      router.push('/login');
    }
  }, [email, router]);
  
  // Check for existing profiles/invites after name and birthday are entered
  const checkExistingProfiles = async () => {
    setCheckingExisting(true);
    try {
      const res = await fetch('/api/auth/check-existing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: formData.name,
          birthday: formData.birthdate,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setPendingInvite(data.pendingInvite);
        setMatchingProfiles(data.matchingProfiles || []);
        
        // If we found matches, show the check-existing step
        if (data.pendingInvite || data.matchingProfiles?.length > 0) {
          setStep('check-existing');
        } else {
          setStep('timezone');
        }
      } else {
        setStep('timezone');
      }
    } catch (err) {
      console.error('Failed to check existing:', err);
      setStep('timezone');
    } finally {
      setCheckingExisting(false);
    }
  };
  
  const handleClaimProfile = (profileId: string) => {
    setSelectedProfileId(profileId);
  };
  
  const handleCreateNew = () => {
    setSelectedProfileId(null);
    setStep('timezone');
  };
  
  const handleContinueWithClaim = () => {
    if (selectedProfileId) {
      setStep('timezone');
    }
  };
  
  const handleNext = () => {
    if (step === 'name') {
      setStep('birthday');
    } else if (step === 'birthday') {
      checkExistingProfiles();
    } else if (step === 'check-existing') {
      setStep('timezone');
    } else if (step === 'timezone') {
      setStep('notifications');
    }
  };
  
  const handleBack = () => {
    if (step === 'birthday') {
      setStep('name');
    } else if (step === 'check-existing') {
      setStep('birthday');
    } else if (step === 'timezone') {
      // If we had matches, go back to check-existing, otherwise to birthday
      if (pendingInvite || matchingProfiles.length > 0) {
        setStep('check-existing');
      } else {
        setStep('birthday');
      }
    } else if (step === 'notifications') {
      setStep('timezone');
    }
  };
  
  const handleSubmit = async () => {
    if (!email) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: formData.name,
          timezone: formData.timezone,
          mobile: formData.mobile || undefined,
          notificationChannel: formData.notificationChannel,
          birthdate: formData.birthdate || undefined,
          claimProfileId: selectedProfileId || undefined,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account');
      }
      
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };
  
  const canProceed = () => {
    switch (step) {
      case 'name':
        return formData.name.trim().length > 0;
      case 'birthday':
        return true; // Optional
      case 'check-existing':
        return true; // Can proceed with selection or create new
      case 'timezone':
        return formData.timezone.length > 0;
      case 'notifications':
        return true;
      default:
        return false;
    }
  };
  
  const steps: Step[] = ['name', 'birthday', 'timezone', 'notifications'];
  const currentStepIndex = step === 'check-existing' ? 2 : steps.indexOf(step);
  const isLastStep = step === 'notifications';
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-cream to-teal-50 flex flex-col">
      {/* Progress */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-2 max-w-md mx-auto">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= currentStepIndex ? 'bg-teal-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
      
      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <Card padding="lg" className="animate-fade-in">
            {step === 'name' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
                    <User className="w-7 h-7 text-teal-600" />
                  </div>
                  <h1 className="font-display text-2xl font-bold text-gray-900">
                    What should we call you?
                  </h1>
                  <p className="text-gray-600 mt-2">
                    This is how you'll appear to others
                  </p>
                </div>
                
                <Input
                  label="Your name"
                  placeholder="Alex Smith"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  autoFocus
                />
              </div>
            )}
            
            {step === 'birthday' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-coral-50 flex items-center justify-center mx-auto mb-4">
                    <Cake className="w-7 h-7 text-coral-600" />
                  </div>
                  <h1 className="font-display text-2xl font-bold text-gray-900">
                    When's your birthday?
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Let your connections celebrate with you
                  </p>
                </div>
                
                <Input
                  label="Birthday (optional)"
                  type="date"
                  value={formData.birthdate}
                  onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                  hint="You can skip this and add it later"
                />
              </div>
            )}
            
            {step === 'check-existing' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                    <UserCheck className="w-7 h-7 text-amber-600" />
                  </div>
                  <h1 className="font-display text-2xl font-bold text-gray-900">
                    {pendingInvite ? "You've been invited!" : "We found a match"}
                  </h1>
                  <p className="text-gray-600 mt-2">
                    {pendingInvite 
                      ? `${pendingInvite.invitedByName} created a profile for you`
                      : 'Is one of these profiles you?'}
                  </p>
                </div>
                
                {/* Pending Invite */}
                {pendingInvite && (
                  <button
                    onClick={() => handleClaimProfile(pendingInvite.profileId)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-colors text-left ${
                      selectedProfileId === pendingInvite.profileId
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Avatar
                      src={pendingInvite.profilePicture}
                      name={pendingInvite.profileName}
                      size="lg"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{pendingInvite.profileName}</p>
                      <p className="text-sm text-gray-500">
                        Invited by {pendingInvite.invitedByName}
                      </p>
                    </div>
                    {selectedProfileId === pendingInvite.profileId && (
                      <Sparkles className="w-5 h-5 text-teal-500" />
                    )}
                  </button>
                )}
                
                {/* Matching Profiles */}
                {matchingProfiles.length > 0 && !pendingInvite && (
                  <div className="space-y-2">
                    {matchingProfiles.map(profile => (
                      <button
                        key={profile.id}
                        onClick={() => handleClaimProfile(profile.id)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-colors text-left ${
                          selectedProfileId === profile.id
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Avatar
                          src={profile.profilePicture}
                          name={profile.name}
                          size="lg"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{profile.name}</p>
                          <p className="text-sm text-gray-500">
                            Created by {profile.createdByName}
                            {profile.hasBirthdayMatch && ' · Birthday matches'}
                          </p>
                        </div>
                        {selectedProfileId === profile.id && (
                          <Sparkles className="w-5 h-5 text-teal-500" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Create New Option */}
                <button
                  onClick={handleCreateNew}
                  className={`w-full text-center py-3 rounded-xl border-2 transition-colors ${
                    selectedProfileId === null
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {pendingInvite || matchingProfiles.length > 0
                    ? "That's not me — create new profile"
                    : "Create new profile"}
                </button>
              </div>
            )}
            
            {step === 'timezone' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-7 h-7 text-teal-600" />
                  </div>
                  <h1 className="font-display text-2xl font-bold text-gray-900">
                    Where are you located?
                  </h1>
                  <p className="text-gray-600 mt-2">
                    We'll send reminders at the right time for you
                  </p>
                </div>
                
                <Select
                  label="Timezone"
                  options={COMMON_TIMEZONES.map(tz => ({ value: tz.value, label: tz.label }))}
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                />
                
                {selectedProfileId && (
                  <div className="flex items-center gap-2 text-sm text-teal-600 bg-teal-50 rounded-lg px-3 py-2">
                    <Sparkles className="w-4 h-4" />
                    You'll claim an existing profile
                  </div>
                )}
              </div>
            )}
            
            {step === 'notifications' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-7 h-7 text-teal-600" />
                  </div>
                  <h1 className="font-display text-2xl font-bold text-gray-900">
                    How should we remind you?
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Choose your preferred notification method
                  </p>
                </div>
                
                <div className="space-y-3">
                  {NOTIFICATION_CHANNELS.map((channel) => (
                    <label
                      key={channel.value}
                      className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                        formData.notificationChannel === channel.value
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="notificationChannel"
                        value={channel.value}
                        checked={formData.notificationChannel === channel.value}
                        onChange={(e) => setFormData({ ...formData, notificationChannel: e.target.value as typeof formData.notificationChannel })}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium text-gray-900">{channel.label}</span>
                    </label>
                  ))}
                </div>
                
                {(formData.notificationChannel === 'sms' || formData.notificationChannel === 'both') && (
                  <Input
                    label="Mobile number"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    hint="Required for SMS notifications"
                  />
                )}
              </div>
            )}
            
            {error && (
              <p className="text-sm text-coral-600 mt-4">{error}</p>
            )}
            
            {/* Navigation */}
            <div className="flex gap-3 mt-8">
              {step !== 'name' && (
                <Button variant="secondary" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              
              {step === 'check-existing' ? (
                <Button
                  className="flex-1"
                  onClick={selectedProfileId ? handleContinueWithClaim : handleCreateNew}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  onClick={isLastStep ? handleSubmit : handleNext}
                  disabled={!canProceed()}
                  loading={loading || checkingExisting}
                >
                  {isLastStep ? 'Get Started' : 'Continue'}
                  {!isLastStep && !checkingExisting && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-cream to-teal-50 flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OnboardingContent />
    </Suspense>
  );
}
