'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { COMMON_TIMEZONES, NOTIFICATION_CHANNELS } from '@/lib/constants';
import { ArrowRight, ArrowLeft, User, Globe, Bell, Cake } from 'lucide-react';

type Step = 'name' | 'timezone' | 'notifications' | 'birthday';

function OnboardingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email');
  
  const [step, setStep] = useState<Step>('name');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
  
  const steps: Step[] = ['name', 'timezone', 'notifications', 'birthday'];
  const currentStepIndex = steps.indexOf(step);
  
  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  };
  
  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
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
      case 'timezone':
        return formData.timezone.length > 0;
      case 'notifications':
        return true; // All options are valid
      case 'birthday':
        return true; // Optional
      default:
        return false;
    }
  };
  
  const isLastStep = step === 'birthday';
  
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
            
            {error && (
              <p className="text-sm text-coral-600 mt-4">{error}</p>
            )}
            
            {/* Navigation */}
            <div className="flex gap-3 mt-8">
              {currentStepIndex > 0 && (
                <Button variant="secondary" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              
              <Button
                className="flex-1"
                onClick={isLastStep ? handleSubmit : handleNext}
                disabled={!canProceed()}
                loading={loading}
              >
                {isLastStep ? 'Get Started' : 'Continue'}
                {!isLastStep && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
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
