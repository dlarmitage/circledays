'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { COMMON_TIMEZONES, NOTIFICATION_CHANNELS } from '@/lib/constants';
import { User, Bell, Upload, LogOut, Trash2 } from 'lucide-react';

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

export default function SettingsPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    timezone: '',
    mobile: '',
    notificationChannel: 'email' as 'email' | 'sms' | 'both',
  });
  
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUserData(data.user);
          setProfileData(data.profile);
          setFormData({
            name: data.user.name,
            timezone: data.user.timezone,
            mobile: data.user.mobile || '',
            notificationChannel: data.user.notificationChannel,
          });
        }
        setLoading(false);
      });
  }, []);
  
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          timezone: formData.timezone,
          mobile: formData.mobile || null,
          notificationChannel: formData.notificationChannel,
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to save');
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
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar
              src={profileData?.profilePicture}
              name={formData.name}
              size="xl"
            />
            <Button variant="secondary" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Change Photo
            </Button>
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
        <CardContent className="space-y-4">
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
    </div>
  );
}

