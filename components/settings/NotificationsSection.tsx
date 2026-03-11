'use client';

import { RefObject } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { NOTIFICATION_CHANNELS } from '@/lib/constants';
import { Bell, Smartphone } from 'lucide-react';
import { isNativeApp } from '@/lib/capacitor';

const REMINDER_OPTIONS = [
  { days: 0, label: 'Day of', emoji: '📅' },
  { days: 1, label: '1 day', emoji: '1️⃣' },
  { days: 3, label: '3 days', emoji: '3️⃣' },
  { days: 7, label: '1 week', emoji: '📆' },
  { days: 14, label: '2 weeks', emoji: '🗓️' },
];

interface NotificationsSectionProps {
  reminderPrefs: number[];
  onToggleReminderDay: (days: number) => void;
  notificationChannel: 'email' | 'sms' | 'both';
  mobile: string;
  onNotificationChannelChange: (channel: 'email' | 'sms' | 'both') => void;
  onMobileChange: (mobile: string) => void;
  mobileInputRef: RefObject<HTMLInputElement | null>;
  pushEnabled?: boolean;
  onPushEnabledChange?: (enabled: boolean) => void;
}

export function NotificationsSection({
  reminderPrefs,
  onToggleReminderDay,
  notificationChannel,
  mobile,
  onNotificationChannelChange,
  onMobileChange,
  mobileInputRef,
  pushEnabled,
  onPushEnabledChange,
}: NotificationsSectionProps) {
  return (
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
                  onClick={() => onToggleReminderDay(option.days)}
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
          value={notificationChannel}
          onChange={(e) => {
            const newChannel = e.target.value as 'email' | 'sms' | 'both';
            onNotificationChannelChange(newChannel);
            // Auto-focus mobile input when switching to SMS/both without a number
            if ((newChannel === 'sms' || newChannel === 'both') && !mobile) {
              setTimeout(() => mobileInputRef.current?.focus(), 100);
            }
          }}
        />

        {(notificationChannel === 'sms' || notificationChannel === 'both') && (
          <>
            {!mobile && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm text-amber-800">
                  Add your mobile number below to start receiving SMS reminders.
                </p>
              </div>
            )}
            <Input
              ref={mobileInputRef}
              label="Mobile number"
              type="tel"
              value={mobile}
              onChange={(e) => onMobileChange(e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </>
        )}
        {/* Push Notifications (native app only) */}
        {isNativeApp() && onPushEnabledChange && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Push notifications</p>
                <p className="text-xs text-gray-500">Get reminders on your lock screen</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onPushEnabledChange(!pushEnabled)}
              className={`
                relative w-11 h-6 rounded-full transition-colors duration-200
                ${pushEnabled ? 'bg-teal-500' : 'bg-gray-300'}
              `}
            >
              <span
                className={`
                  absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200
                  ${pushEnabled ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
