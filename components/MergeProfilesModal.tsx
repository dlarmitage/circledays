'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { X, Merge, Check, AlertTriangle } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  profilePicture: string | null;
  linkedUserId: string | null;
  eventCount?: number;
  connectionCount?: number;
  noteCount?: number;
}

interface MergeProfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileA: Profile;
  profileB: Profile;
  onMerge: (keepProfileId: string, mergeOptions: any) => Promise<void>;
}

export function MergeProfilesModal({
  isOpen,
  onClose,
  profileA,
  profileB,
  onMerge,
}: MergeProfilesModalProps) {
  const [keepProfile, setKeepProfile] = useState<'A' | 'B'>('A');
  const [mergeOptions, setMergeOptions] = useState({
    name: 'keep' as 'keep' | 'merge',
    profilePicture: 'keep' as 'keep' | 'merge',
    events: 'merge' as 'keep' | 'merge',
    connections: 'merge' as 'keep' | 'merge',
    notes: 'merge' as 'keep' | 'merge',
  });
  const [merging, setMerging] = useState(false);
  
  if (!isOpen) return null;
  
  const selectedProfile = keepProfile === 'A' ? profileA : profileB;
  const mergeProfile = keepProfile === 'A' ? profileB : profileA;
  
  const handleMerge = async () => {
    setMerging(true);
    try {
      await onMerge(selectedProfile.id, mergeOptions);
      onClose();
    } catch (error) {
      console.error('Merge failed:', error);
      alert('Failed to merge profiles. Please try again.');
    } finally {
      setMerging(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <Merge className="w-5 h-5 text-teal-600" />
            Merge Duplicate Profiles
          </CardTitle>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-auto space-y-6">
          {/* Warning */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900 mb-1">
                  This action cannot be undone
                </p>
                <p className="text-xs text-amber-700">
                  The selected profile will be kept, and the other will be deleted. All data from the deleted profile will be merged into the kept profile based on your selections below.
                </p>
              </div>
            </div>
          </div>
          
          {/* Select which profile to keep */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Keep this profile (the other will be deleted):
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setKeepProfile('A')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  keepProfile === 'A'
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Avatar src={profileA.profilePicture} name={profileA.name} size="md" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{profileA.name}</p>
                    {profileA.linkedUserId && (
                      <p className="text-xs text-gray-500">Has account</p>
                    )}
                  </div>
                  {keepProfile === 'A' && (
                    <Check className="w-5 h-5 text-teal-600" />
                  )}
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  {profileA.eventCount !== undefined && (
                    <p>{profileA.eventCount} events</p>
                  )}
                  {profileA.connectionCount !== undefined && (
                    <p>{profileA.connectionCount} connections</p>
                  )}
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setKeepProfile('B')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  keepProfile === 'B'
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Avatar src={profileB.profilePicture} name={profileB.name} size="md" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{profileB.name}</p>
                    {profileB.linkedUserId && (
                      <p className="text-xs text-gray-500">Has account</p>
                    )}
                  </div>
                  {keepProfile === 'B' && (
                    <Check className="w-5 h-5 text-teal-600" />
                  )}
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  {profileB.eventCount !== undefined && (
                    <p>{profileB.eventCount} events</p>
                  )}
                  {profileB.connectionCount !== undefined && (
                    <p>{profileB.connectionCount} connections</p>
                  )}
                </div>
              </button>
            </div>
          </div>
          
          {/* Merge options */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Merge Options</h3>
            
            {/* Name */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Name</p>
                <p className="text-xs text-gray-500">
                  Keep: {selectedProfile.name} | Merge: {mergeProfile.name}
                </p>
              </div>
              <select
                value={mergeOptions.name}
                onChange={(e) => setMergeOptions({ ...mergeOptions, name: e.target.value as 'keep' | 'merge' })}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
              >
                <option value="keep">Keep selected</option>
                <option value="merge">Use merge profile's name</option>
              </select>
            </div>
            
            {/* Profile Picture */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Profile Picture</p>
                <p className="text-xs text-gray-500">
                  {selectedProfile.profilePicture ? 'Has photo' : 'No photo'} | {mergeProfile.profilePicture ? 'Has photo' : 'No photo'}
                </p>
              </div>
              <select
                value={mergeOptions.profilePicture}
                onChange={(e) => setMergeOptions({ ...mergeOptions, profilePicture: e.target.value as 'keep' | 'merge' })}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
              >
                <option value="keep">Keep selected</option>
                <option value="merge">Use merge profile's photo</option>
              </select>
            </div>
            
            {/* Events */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Events</p>
                <p className="text-xs text-gray-500">
                  Combine all events from both profiles (duplicates will be skipped)
                </p>
              </div>
              <select
                value={mergeOptions.events}
                onChange={(e) => setMergeOptions({ ...mergeOptions, events: e.target.value as 'keep' | 'merge' })}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
              >
                <option value="keep">Keep only selected profile's</option>
                <option value="merge">Merge all events</option>
              </select>
            </div>
            
            {/* Connections */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Connections</p>
                <p className="text-xs text-gray-500">
                  Combine all connections from both profiles (duplicates will be skipped)
                </p>
              </div>
              <select
                value={mergeOptions.connections}
                onChange={(e) => setMergeOptions({ ...mergeOptions, connections: e.target.value as 'keep' | 'merge' })}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
              >
                <option value="keep">Keep only selected profile's</option>
                <option value="merge">Merge all connections</option>
              </select>
            </div>
            
            {/* Notes */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Private Notes</p>
                <p className="text-xs text-gray-500">
                  Combine notes from both profiles (per user)
                </p>
              </div>
              <select
                value={mergeOptions.notes}
                onChange={(e) => setMergeOptions({ ...mergeOptions, notes: e.target.value as 'keep' | 'merge' })}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
              >
                <option value="keep">Keep only selected profile's</option>
                <option value="merge">Merge all notes</option>
              </select>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={onClose}
              disabled={merging}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleMerge}
              loading={merging}
            >
              <Merge className="w-4 h-4 mr-2" />
              Merge Profiles
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

