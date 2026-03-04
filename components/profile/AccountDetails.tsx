'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  User,
  Mail,
  Phone,
  Pencil,
  Check,
  X,
} from 'lucide-react';

interface AccountDetailsProps {
  userData: {
    email: string;
    mobile: string | null;
  };
  onSaveField: (field: 'email' | 'mobile', value: string) => Promise<void>;
}

export function AccountDetails({ userData, onSaveField }: AccountDetailsProps) {
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingMobile, setEditingMobile] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  const [mobileValue, setMobileValue] = useState('');
  const [saving, setSaving] = useState(false);

  const startEditingEmail = () => {
    setEmailValue(userData.email || '');
    setEditingEmail(true);
  };

  const startEditingMobile = () => {
    setMobileValue(userData.mobile || '');
    setEditingMobile(true);
  };

  const handleSave = async (field: 'email' | 'mobile') => {
    setSaving(true);
    try {
      const value = field === 'email' ? emailValue : mobileValue;
      await onSaveField(field, value);
      if (field === 'email') {
        setEditingEmail(false);
      } else {
        setEditingMobile(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-teal-600" />
          Account Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">
            Email
          </label>
          {editingEmail ? (
            <div className="flex gap-2">
              <Input
                type="email"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                placeholder="your@email.com"
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={() => handleSave('email')}
                loading={saving}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingEmail(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900">{userData.email}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={startEditingEmail}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Mobile */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">
            Mobile Number
          </label>
          {editingMobile ? (
            <div className="flex gap-2">
              <Input
                type="tel"
                value={mobileValue}
                onChange={(e) => setMobileValue(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={() => handleSave('mobile')}
                loading={saving}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingMobile(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className={userData.mobile ? 'text-gray-900' : 'text-gray-400 italic'}>
                  {userData.mobile || 'Not set'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={startEditingMobile}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Used for SMS reminders
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
