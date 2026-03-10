'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { PhotoUpload } from '@/components/PhotoUpload';
import { ArrowLeft, UserPlus, Cake, AlertTriangle, Check, Users, Link as LinkIcon, HelpCircle, Lock } from 'lucide-react';
import { UNKNOWN_YEAR } from '@/lib/utils';

interface PotentialDuplicate {
  id: string;
  name: string;
  profilePicture: string | null;
  isConnected: boolean;
  isLinked: boolean;
  score: number;
  reasons: string[];
}

export default function AddPersonPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<PotentialDuplicate[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [confirmedNew, setConfirmedNew] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    birthdate: '',
  });
  const [unknownYear, setUnknownYear] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  
  // Debounced duplicate check
  useEffect(() => {
    if (formData.name.trim().length < 2) {
      setDuplicates([]);
      setShowDuplicateWarning(false);
      setConfirmedNew(false);
      return;
    }
    
    const timer = setTimeout(async () => {
      setCheckingDuplicates(true);
      try {
        const res = await fetch('/api/profiles/check-duplicates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            birthday: formData.birthdate,
          }),
        });
        
        if (res.ok) {
          const data = await res.json();
          setDuplicates(data.duplicates || []);
          // Reset confirmation if duplicates change
          if (data.duplicates?.length > 0) {
            setConfirmedNew(false);
          }
        }
      } catch (err) {
        console.error('Failed to check duplicates:', err);
      } finally {
        setCheckingDuplicates(false);
      }
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timer);
  }, [formData.name, formData.birthdate]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If there are duplicates and user hasn't confirmed, show warning
    if (duplicates.length > 0 && !confirmedNew) {
      setShowDuplicateWarning(true);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // If unknown year is checked, replace year with sentinel
      let birthdate = formData.birthdate;
      if (unknownYear && birthdate) {
        const [, month, day] = birthdate.split('-');
        birthdate = `${UNKNOWN_YEAR}-${month}-${day}`;
      }
      
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          birthdate,
          profilePicture: photoUrl,
          isPrivate,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create profile');
      }
      
      router.push(`/profile/${data.profile.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };
  
  const handleConnectToExisting = async (profileId: string, isConnected: boolean) => {
    if (isConnected) {
      // Already connected, just navigate
      router.push(`/profile/${profileId}`);
      return;
    }
    
    setLoading(true);
    try {
      // Connect to existing profile
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });
      
      if (res.ok) {
        router.push(`/profile/${profileId}`);
      } else {
        throw new Error('Failed to connect');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setLoading(false);
    }
  };
  
  const handleConfirmNew = () => {
    setConfirmedNew(true);
    setShowDuplicateWarning(false);
  };
  
  const isValid = formData.name.trim().length > 0 && formData.birthdate.length > 0;
  const hasDuplicates = duplicates.length > 0;
  
  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Back</span>
      </button>
      
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
          <UserPlus className="w-8 h-8 text-white" />
        </div>
        <h1 className="font-display text-2xl font-bold text-gray-900">
          Add a Person
        </h1>
        <p className="text-gray-600 mt-2">
          Add someone to your circle and never miss their special days
        </p>
      </div>
      
      <Card padding="lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload */}
          <div className="flex justify-center">
            <PhotoUpload
              currentPhoto={photoUrl}
              name={formData.name || 'New Person'}
              onPhotoChange={setPhotoUrl}
              size="xl"
            />
          </div>
          
          <Input
            label="Name"
            placeholder="e.g., Mom, John Smith"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            autoFocus
            required
            autoComplete="off"
            data-1p-ignore
          />
          
          <div className="space-y-2">
            <Input
              label="Birthday"
              type="date"
              value={formData.birthdate}
              onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
              required
              hint={unknownYear ? "Just pick any year - we'll only use the month and day" : "We'll remind you when their birthday is coming up"}
            />
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
          </div>

          {/* Keep Private */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              Keep private — only you can see this person
            </span>
          </label>

          {/* Potential Duplicates Warning */}
          {hasDuplicates && !confirmedNew && (
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">
                    We found similar {duplicates.length === 1 ? 'person' : 'people'}
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Is this someone you're looking for?
                  </p>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                {duplicates.map(dup => (
                  <button
                    key={dup.id}
                    type="button"
                    onClick={() => handleConnectToExisting(dup.id, dup.isConnected)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-white hover:bg-amber-100 transition-colors text-left border border-amber-200"
                  >
                    <Avatar
                      src={dup.profilePicture}
                      name={dup.name}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{dup.name}</p>
                      <p className="text-xs text-amber-700">
                        {dup.reasons[0]}
                        {dup.isLinked && ' · Has account'}
                      </p>
                    </div>
                    {dup.isConnected ? (
                      <span className="text-xs text-teal-600 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Connected
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" />
                        Connect
                      </span>
                    )}
                  </button>
                ))}
              </div>
              
              <button
                type="button"
                onClick={handleConfirmNew}
                className="w-full text-center text-sm text-amber-700 hover:text-amber-900 font-medium py-2"
              >
                None of these — create new person
              </button>
            </div>
          )}
          
          {/* Confirmed creating new despite duplicates */}
          {hasDuplicates && confirmedNew && (
            <div className="flex items-center gap-2 text-sm text-teal-600 bg-teal-50 rounded-lg px-3 py-2">
              <Check className="w-4 h-4" />
              Creating new person (not a duplicate)
            </div>
          )}
          
          {error && (
            <p className="text-sm text-coral-600">{error}</p>
          )}
          
          <Button
            type="submit"
            className="w-full"
            disabled={!isValid || (hasDuplicates && !confirmedNew)}
            loading={loading}
          >
            <Cake className="w-4 h-4 mr-2" />
            Add to My Circle
          </Button>
        </form>
      </Card>
      
      <p className="text-center text-sm text-gray-500 mt-6">
        You can add more events and details after creating the profile
      </p>
      
      {/* Duplicate Warning Modal */}
      {showDuplicateWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Similar person exists</h3>
                  <p className="text-sm text-gray-600">Are you sure this is someone new?</p>
                </div>
              </div>
              
              <div className="space-y-2 mb-6">
                {duplicates.slice(0, 3).map(dup => (
                  <div
                    key={dup.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
                  >
                    <Avatar src={dup.profilePicture} name={dup.name} size="sm" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{dup.name}</p>
                      <p className="text-xs text-gray-500">{dup.reasons[0]}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowDuplicateWarning(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleConfirmNew}
                >
                  Create New
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
