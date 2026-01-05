'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { COMMON_TIMEZONES, NOTIFICATION_CHANNELS } from '@/lib/constants';
import { Users, ArrowRight } from 'lucide-react';

interface InviteData {
  profileName: string;
  profilePicture: string | null;
  inviterName: string;
  contact: string;
  contactType: 'email' | 'phone';
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    notificationChannel: 'email' as 'email' | 'sms' | 'both',
  });

  useEffect(() => {
    fetchInvite();
  }, [token]);

  const fetchInvite = async () => {
    try {
      const res = await fetch(`/api/invites/${token}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid or expired invite');
        setLoading(false);
        return;
      }

      setInviteData(data);
      // Pre-populate based on contact type
      if (data.contactType === 'phone') {
        setFormData(prev => ({ ...prev, name: data.profileName, mobile: data.contact }));
      } else {
        setFormData(prev => ({ ...prev, name: data.profileName, email: data.contact }));
      }
      setLoading(false);
    } catch {
      setError('Failed to load invite');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept invite');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream via-cream to-teal-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream via-cream to-teal-50 flex items-center justify-center p-4">
        <Card padding="lg" className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-coral-50 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-coral-600" />
          </div>
          <h1 className="font-display text-xl font-bold text-gray-900 mb-2">
            Invite Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          <Button onClick={() => router.push('/login')}>
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-cream to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Avatar
            src={inviteData?.profilePicture}
            name={inviteData?.profileName || ''}
            size="xl"
            className="mx-auto mb-4"
          />
          <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
            You're Invited!
          </h1>
          <p className="text-gray-600">
            <strong>{inviteData?.inviterName}</strong> invited you to join CircleDays
          </p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Your Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="How should we call you?"
              required
            />

            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="you@example.com"
              required
            />

            <Input
              label="Mobile Number"
              type="tel"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              placeholder="+1 (555) 000-0000"
              required
            />

            {/* Privacy reassurance */}
            <p className="text-xs text-gray-500 -mt-2 px-1">
              We have the utmost respect for your privacy and will never share your personal contact information.
            </p>

            <Select
              label="Timezone"
              options={COMMON_TIMEZONES.map(tz => ({ value: tz.value, label: tz.label }))}
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            />

            <Select
              label="Notification Preference"
              options={NOTIFICATION_CHANNELS.map(c => ({ value: c.value, label: c.label }))}
              value={formData.notificationChannel}
              onChange={(e) => setFormData({ ...formData, notificationChannel: e.target.value as typeof formData.notificationChannel })}
            />

            {error && (
              <p className="text-sm text-coral-600">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={submitting}
              disabled={!formData.name || !formData.email || !formData.mobile}
            >
              Join CircleDays
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-4">
          By joining, you'll be connected to {inviteData?.inviterName} and start receiving birthday reminders.
        </p>
      </div>
    </div>
  );
}

