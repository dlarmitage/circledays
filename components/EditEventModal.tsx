'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { X, Calendar, Cake, Heart, Trash2, AlertTriangle } from 'lucide-react';

interface Event {
  id: string;
  type: 'birthday' | 'anniversary' | 'custom';
  customLabel: string | null;
  date: string;
}

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  profileName: string;
  onEventUpdated: () => void;
}

const EVENT_TYPES = [
  { value: 'birthday', label: 'Birthday', icon: Cake },
  { value: 'anniversary', label: 'Anniversary', icon: Heart },
  { value: 'custom', label: 'Custom Event', icon: Calendar },
];

export function EditEventModal({ isOpen, onClose, event, profileName, onEventUpdated }: EditEventModalProps) {
  const [eventType, setEventType] = useState<'birthday' | 'anniversary' | 'custom'>('birthday');
  const [customLabel, setCustomLabel] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize form with event data
  useEffect(() => {
    if (isOpen && event) {
      setEventType(event.type);
      setCustomLabel(event.customLabel || '');
      // Extract YYYY-MM-DD from the date string (handles both "2004-12-10" and "2004-12-10T00:00:00.000Z")
      const formattedDate = event.date.split('T')[0];
      setDate(formattedDate);
      setError(null);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, event]);
  
  const handleSave = async () => {
    if (!event) return;
    
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
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: eventType,
          customLabel: eventType === 'custom' ? customLabel : null,
          date,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update event');
      }
      
      onEventUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async () => {
    if (!event) return;
    
    setDeleting(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete event');
      }
      
      onEventUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setDeleting(false);
    }
  };
  
  if (!isOpen || !event) return null;
  
  const selectedType = EVENT_TYPES.find(t => t.value === eventType);
  const Icon = selectedType?.icon || Calendar;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-teal-600" />
            Edit Event
          </CardTitle>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {showDeleteConfirm ? (
            // Delete Confirmation
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-coral-50 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-coral-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-coral-900">Delete this event?</p>
                  <p className="text-sm text-coral-700">
                    This will permanently remove this event from {profileName}'s profile.
                  </p>
                </div>
              </div>
              
              {error && (
                <p className="text-sm text-coral-600">{error}</p>
              )}
              
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={handleDelete}
                  loading={deleting}
                >
                  Delete Event
                </Button>
              </div>
            </div>
          ) : (
            // Edit Form
            <>
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
              />
              
              {error && (
                <p className="text-sm text-coral-600">{error}</p>
              )}
              
              <div className="flex gap-3 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-coral-600 hover:bg-coral-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <div className="flex-1" />
                <Button
                  variant="secondary"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  loading={saving}
                  disabled={!date || (eventType === 'custom' && !customLabel.trim())}
                >
                  Save Changes
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

