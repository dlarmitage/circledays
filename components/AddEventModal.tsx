'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { X, Calendar, Cake, Heart, Repeat, CalendarCheck, Lock, Globe, HelpCircle, type LucideIcon } from 'lucide-react';
import { UNKNOWN_YEAR } from '@/lib/utils';
import { EVENT_TYPES } from '@/lib/constants';

const EVENT_TYPE_ICONS: Record<string, LucideIcon> = { birthday: Cake, anniversary: Heart, custom: Calendar };

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  profileName: string;
  onEventAdded: () => void;
}

export function AddEventModal({ isOpen, onClose, profileId, profileName, onEventAdded }: AddEventModalProps) {
  const [eventType, setEventType] = useState<'birthday' | 'anniversary' | 'custom'>('birthday');
  const [customLabel, setCustomLabel] = useState('');
  const [date, setDate] = useState('');
  const [recurring, setRecurring] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [unknownYear, setUnknownYear] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setEventType('birthday');
      setCustomLabel('');
      setDate('');
      setRecurring(true);
      setIsPrivate(false);
      setUnknownYear(false);
      setError(null);
    }
  }, [isOpen]);
  
  const handleSave = async () => {
    if (!date) {
      setError('Please select a date');
      return;
    }
    
    if (eventType === 'custom' && !customLabel.trim()) {
      setError('Please enter a label for this custom occasion');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      // If unknown year is checked for birthday, replace year with sentinel
      let eventDate = date;
      if (unknownYear && eventType === 'birthday' && date) {
        const [, month, day] = date.split('-');
        eventDate = `${UNKNOWN_YEAR}-${month}-${day}`;
      }
      
      const res = await fetch(`/api/profiles/${profileId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: eventType,
          customLabel: eventType === 'custom' ? customLabel : undefined,
          date: eventDate,
          recurring: eventType === 'custom' ? recurring : true,
          isPrivate,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add event');
      }
      
      onEventAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };
  
  if (!isOpen) return null;
  
  const selectedType = EVENT_TYPES.find(t => t.value === eventType);
  const Icon = EVENT_TYPE_ICONS[eventType] || Calendar;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-teal-600" />
            Add Occasion for {profileName}
          </CardTitle>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Event Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Occasion Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {EVENT_TYPES.map(type => {
                const TypeIcon = EVENT_TYPE_ICONS[type.value] || Calendar;
                const isSelected = eventType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setEventType(type.value as typeof eventType)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-teal-50 border-2 border-teal-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <TypeIcon className={`w-5 h-5 ${isSelected ? 'text-teal-600' : 'text-gray-500'}`} />
                    <span className={`text-xs font-medium ${isSelected ? 'text-teal-900' : 'text-gray-700'}`}>
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Custom Label (only for custom events) */}
          {eventType === 'custom' && (
            <Input
              label="Occasion Name"
              placeholder="e.g., Work Anniversary, Graduation"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              required
            />
          )}
          
          {/* Recurring toggle (only for custom events) */}
          {eventType === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frequency
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRecurring(true)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl transition-all ${
                    recurring
                      ? 'bg-teal-50 border-2 border-teal-500'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <Repeat className={`w-4 h-4 ${recurring ? 'text-teal-600' : 'text-gray-500'}`} />
                  <span className={`text-sm font-medium ${recurring ? 'text-teal-900' : 'text-gray-700'}`}>
                    Every Year
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRecurring(false)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl transition-all ${
                    !recurring
                      ? 'bg-teal-50 border-2 border-teal-500'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <CalendarCheck className={`w-4 h-4 ${!recurring ? 'text-teal-600' : 'text-gray-500'}`} />
                  <span className={`text-sm font-medium ${!recurring ? 'text-teal-900' : 'text-gray-700'}`}>
                    One Time
                  </span>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {recurring 
                  ? "You'll be reminded every year" 
                  : "You'll only be reminded once (e.g., graduation)"}
              </p>
            </div>
          )}
          
          {/* Date */}
          <div className="space-y-2">
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              hint={eventType === 'birthday' 
                ? (unknownYear ? "Just pick any year - we'll only use month and day" : "Enter their birth date")
                : "When does this occasion occur?"}
            />
            {eventType === 'birthday' && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={unknownYear}
                  onChange={(e) => setUnknownYear(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  I don't know the birth year
                </span>
              </label>
            )}
          </div>
          
          {/* Privacy Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visibility
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl transition-all ${
                  !isPrivate
                    ? 'bg-teal-50 border-2 border-teal-500'
                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                }`}
              >
                <Globe className={`w-4 h-4 ${!isPrivate ? 'text-teal-600' : 'text-gray-500'}`} />
                <span className={`text-sm font-medium ${!isPrivate ? 'text-teal-900' : 'text-gray-700'}`}>
                  Shared
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl transition-all ${
                  isPrivate
                    ? 'bg-amber-50 border-2 border-amber-500'
                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                }`}
              >
                <Lock className={`w-4 h-4 ${isPrivate ? 'text-amber-600' : 'text-gray-500'}`} />
                <span className={`text-sm font-medium ${isPrivate ? 'text-amber-900' : 'text-gray-700'}`}>
                  Private
                </span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isPrivate
                ? "Only you can see this occasion and get reminders"
                : "All connections can see this occasion"}
            </p>
          </div>
          
          {error && (
            <p className="text-sm text-coral-600">{error}</p>
          )}
          
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              loading={saving}
              disabled={!date || (eventType === 'custom' && !customLabel.trim())}
            >
              Add Occasion
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
