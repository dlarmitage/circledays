'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { X, Calendar, Cake, Heart } from 'lucide-react';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  profileName: string;
  onEventAdded: () => void;
}

const EVENT_TYPES = [
  { value: 'birthday', label: 'Birthday', icon: Cake },
  { value: 'anniversary', label: 'Anniversary', icon: Heart },
  { value: 'custom', label: 'Custom Event', icon: Calendar },
];

export function AddEventModal({ isOpen, onClose, profileId, profileName, onEventAdded }: AddEventModalProps) {
  const [eventType, setEventType] = useState<'birthday' | 'anniversary' | 'custom'>('birthday');
  const [customLabel, setCustomLabel] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setEventType('birthday');
      setCustomLabel('');
      setDate('');
      setError(null);
    }
  }, [isOpen]);
  
  const handleSave = async () => {
    if (!date) {
      setError('Please select a date');
      return;
    }
    
    if (eventType === 'custom' && !customLabel.trim()) {
      setError('Please enter a label for this custom event');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/profiles/${profileId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: eventType,
          customLabel: eventType === 'custom' ? customLabel : undefined,
          date,
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
  const Icon = selectedType?.icon || Calendar;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-teal-600" />
            Add Event for {profileName}
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
              Event Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {EVENT_TYPES.map(type => {
                const TypeIcon = type.icon;
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
              label="Event Name"
              placeholder="e.g., Work Anniversary, Graduation"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              required
            />
          )}
          
          {/* Date */}
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            hint={eventType === 'birthday' ? "Enter their birth date" : "When does this event occur?"}
          />
          
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
              Add Event
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

