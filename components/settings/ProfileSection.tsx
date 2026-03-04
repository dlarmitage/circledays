'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PhotoUpload } from '@/components/PhotoUpload';
import { COMMON_TIMEZONES } from '@/lib/constants';
import { User } from 'lucide-react';

interface ProfileData {
  id: string;
  name: string;
  profilePicture: string | null;
}

interface UserData {
  email: string;
  pendingEmail: string | null;
}

interface FormData {
  name: string;
  email: string;
  timezone: string;
}

interface ProfileSectionProps {
  formData: FormData;
  onFormChange: (updates: Partial<FormData>) => void;
  profileData: ProfileData | null;
  userData: UserData | null;
  onPhotoChange: (url: string | null) => void;
}

export function ProfileSection({ formData, onFormChange, profileData, userData, onPhotoChange }: ProfileSectionProps) {
  return (
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
            onPhotoChange={onPhotoChange}
            size="xl"
          />
        </div>

        <Input
          label="Name"
          value={formData.name}
          onChange={(e) => onFormChange({ name: e.target.value })}
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
          onChange={(e) => onFormChange({ email: e.target.value })}
          hint={userData?.pendingEmail ? `Current: ${userData.email} • Pending: ${userData.pendingEmail}` : "Used for magic link sign-in and notifications"}
        />

        <Select
          label="Timezone"
          options={COMMON_TIMEZONES.map(tz => ({ value: tz.value, label: tz.label }))}
          value={formData.timezone}
          onChange={(e) => onFormChange({ timezone: e.target.value })}
        />
      </CardContent>
    </Card>
  );
}
