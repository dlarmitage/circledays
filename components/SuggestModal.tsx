'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { X, Send, Users, Check, Link2 } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  profilePicture: string | null;
  linkedUserId: string | null;
}

interface SuggestModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProfiles: Profile[];
  onSuggest: (connectTogether: boolean) => Promise<void>;
}

export function SuggestModal({ 
  isOpen, 
  onClose, 
  selectedProfiles, 
  onSuggest 
}: SuggestModalProps) {
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [connectTogether, setConnectTogether] = useState(true);
  
  // Calculate number of connections that would be created
  const numInterConnections = selectedProfiles.length * (selectedProfiles.length - 1) / 2;
  
  // Count profiles with and without accounts
  const profilesWithAccounts = selectedProfiles.filter(p => p.linkedUserId);
  const profilesWithoutAccounts = selectedProfiles.filter(p => !p.linkedUserId);
  
  // Show connect together option if more than 1 profile selected
  const showConnectTogether = selectedProfiles.length > 1;
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSending(false);
      setSuccess(false);
      setConnectTogether(true); // Default to true
    }
  }, [isOpen]);
  
  const handleSend = async () => {
    setSending(true);
    try {
      await onSuggest(connectTogether);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to send suggestions:', err);
    } finally {
      setSending(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-teal-600" />
            Suggest Connections
          </CardTitle>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-auto space-y-4">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Done!
              </h3>
              <p className="text-sm text-gray-600">
                {connectTogether ? (
                  <>
                    <span className="block mb-1">
                      All {selectedProfiles.length} people are now connected to each other.
                    </span>
                    {profilesWithAccounts.length > 0 && profilesWithoutAccounts.length > 0 && (
                      <span className="block">
                        {profilesWithAccounts.length} {profilesWithAccounts.length === 1 ? 'person' : 'people'} will be notified about {profilesWithoutAccounts.length} new {profilesWithoutAccounts.length === 1 ? 'connection' : 'connections'}.
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    {profilesWithoutAccounts.length > 0 && (
                      <span className="block mb-1">
                        {profilesWithoutAccounts.length} {profilesWithoutAccounts.length === 1 ? 'person' : 'people'} connected to you.
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>
          ) : (
            <>
              {/* Selected profiles summary */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Suggesting {selectedProfiles.length} {selectedProfiles.length === 1 ? 'person' : 'people'}:
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedProfiles.slice(0, 8).map(profile => (
                    <div 
                      key={profile.id}
                      className="flex items-center gap-1.5 bg-white rounded-full px-2 py-1 border border-gray-200"
                    >
                      <Avatar src={profile.profilePicture} name={profile.name} size="sm" />
                      <span className="text-xs text-gray-700 truncate max-w-[100px]">
                        {profile.name}
                      </span>
                    </div>
                  ))}
                  {selectedProfiles.length > 8 && (
                    <span className="text-xs text-gray-500 self-center">
                      +{selectedProfiles.length - 8} more
                    </span>
                  )}
                </div>
                
                {/* Connect together toggle */}
                {showConnectTogether && (
                  <button
                    type="button"
                    onClick={() => setConnectTogether(!connectTogether)}
                    className={`mt-3 w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                      connectTogether 
                        ? 'bg-teal-50 border border-teal-200' 
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                      connectTogether 
                        ? 'bg-teal-500' 
                        : 'border-2 border-gray-300'
                    }`}>
                      {connectTogether && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                        <Link2 className="w-4 h-4 text-teal-600" />
                        Connect these {selectedProfiles.length} people to each other
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Creates up to {numInterConnections} connections between them
                      </p>
                    </div>
                  </button>
                )}
              </div>
              
              {/* Info about what will happen */}
              <div className="bg-teal-50 rounded-xl p-4 space-y-2">
                {connectTogether ? (
                  <>
                    <div className="flex items-start gap-2">
                      <Link2 className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Everyone gets connected
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          All {selectedProfiles.length} people will be connected to each other and to you
                        </p>
                      </div>
                    </div>
                    {profilesWithAccounts.length > 0 && profilesWithoutAccounts.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Users className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {profilesWithAccounts.length} {profilesWithAccounts.length === 1 ? 'person has' : 'people have'} an account
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            They'll get suggestions to connect to the other {profilesWithoutAccounts.length}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-start gap-2">
                    <Link2 className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Connect to you only
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {profilesWithoutAccounts.length > 0 
                          ? `${profilesWithoutAccounts.length} ${profilesWithoutAccounts.length === 1 ? 'person' : 'people'} will be connected to you`
                          : 'Selected profiles will not be modified'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Actions */}
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
                  onClick={handleSend}
                  disabled={sending}
                  loading={sending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Suggest
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
