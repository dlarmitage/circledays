'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { X, Send, Users, Check } from 'lucide-react';

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
  connections: Profile[];
  onSuggest: (toUserIds: string[]) => Promise<void>;
}

export function SuggestModal({ 
  isOpen, 
  onClose, 
  selectedProfiles, 
  connections,
  onSuggest 
}: SuggestModalProps) {
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Filter to only show connections who have accounts (can receive suggestions)
  // Also exclude people who are being suggested (they shouldn't suggest to themselves)
  const selectedProfileIds = new Set(selectedProfiles.map(p => p.id));
  const eligibleRecipients = connections.filter(c => 
    c.linkedUserId && !selectedProfileIds.has(c.id)
  );
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedRecipients(new Set());
      setSending(false);
      setSuccess(false);
    }
  }, [isOpen]);
  
  const toggleRecipient = (userId: string) => {
    setSelectedRecipients(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };
  
  const selectAll = () => {
    const allUserIds = eligibleRecipients
      .map(r => r.linkedUserId)
      .filter((id): id is string => id !== null);
    setSelectedRecipients(new Set(allUserIds));
  };
  
  const deselectAll = () => {
    setSelectedRecipients(new Set());
  };
  
  const handleSend = async () => {
    if (selectedRecipients.size === 0) return;
    
    setSending(true);
    try {
      await onSuggest(Array.from(selectedRecipients));
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
  
  const allSelected = eligibleRecipients.length > 0 && 
    eligibleRecipients.every(r => r.linkedUserId && selectedRecipients.has(r.linkedUserId));
  
  const selectedRecipientNames = eligibleRecipients
    .filter(r => r.linkedUserId && selectedRecipients.has(r.linkedUserId))
    .map(r => r.name);
  
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
              <h3 className="font-semibold text-gray-900 mb-2">Suggestions Sent!</h3>
              <p className="text-sm text-gray-600">
                {selectedRecipients.size === 1 
                  ? `${selectedRecipientNames[0]} will be notified.`
                  : `${selectedRecipients.size} people will be notified.`
                }
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
              </div>
              
              {/* Recipient selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Suggest to:
                    {selectedRecipients.size > 0 && (
                      <span className="ml-2 text-teal-600">
                        ({selectedRecipients.size} selected)
                      </span>
                    )}
                  </label>
                  {eligibleRecipients.length > 1 && (
                    <button
                      type="button"
                      onClick={allSelected ? deselectAll : selectAll}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                    >
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>
                
                {eligibleRecipients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No connections with accounts yet</p>
                    <p className="text-xs mt-1">Invite someone to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {eligibleRecipients.map(recipient => {
                      const isSelected = recipient.linkedUserId && selectedRecipients.has(recipient.linkedUserId);
                      return (
                        <button
                          key={recipient.id}
                          type="button"
                          onClick={() => recipient.linkedUserId && toggleRecipient(recipient.linkedUserId)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                            isSelected
                              ? 'bg-teal-50 border-2 border-teal-500'
                              : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                          }`}
                        >
                          {/* Checkbox */}
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected 
                              ? 'bg-teal-500 border-teal-500' 
                              : 'border-gray-300'
                          }`}>
                            {isSelected && <Check className="w-4 h-4 text-white" />}
                          </div>
                          
                          <Avatar 
                            src={recipient.profilePicture} 
                            name={recipient.name} 
                            size="md" 
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {recipient.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Has an account
                            </p>
                          </div>
                        </button>
                      );
                    })}
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
                  disabled={selectedRecipients.size === 0 || sending}
                  loading={sending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send{selectedRecipients.size > 1 ? ` to ${selectedRecipients.size}` : ''}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
