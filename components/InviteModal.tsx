'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { X, Mail, Users, Check, Copy, ExternalLink, User, UsersRound, CheckSquare, Square, MessageSquare, Link as LinkIcon, Smartphone } from 'lucide-react';

interface Connection {
  id: string;
  profileId: string;
  name: string;
  profilePicture: string | null;
}

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  profileName: string;
  connections: Connection[];
  userProfileId: string;
}

type ConnectionOption = 'just-me' | 'all' | 'custom';
type SendMethod = 'email' | 'sms' | 'link_only';

// Helper to detect if input looks like a phone number
function isPhoneNumber(input: string): boolean {
  const cleaned = input.replace(/[\s\-\(\)\+\.]/g, '');
  return /^\d{7,15}$/.test(cleaned);
}

export function InviteModal({ isOpen, onClose, profileId, profileName, connections, userProfileId }: InviteModalProps) {
  const [contact, setContact] = useState('');
  const [connectionOption, setConnectionOption] = useState<ConnectionOption>('just-me');
  const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ inviteUrl: string; method: SendMethod } | null>(null);
  const [copied, setCopied] = useState(false);

  // Detect input type
  const inputIsPhone = contact.length > 0 && isPhoneNumber(contact);
  const inputType: 'email' | 'phone' | 'empty' = contact.length === 0 ? 'empty' : inputIsPhone ? 'phone' : 'email';

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setContact('');
      setConnectionOption('just-me');
      setSelectedConnections([]);
      setError(null);
      setSuccess(null);
      setCopied(false);
    }
  }, [isOpen]);

  // When switching to custom, pre-select all connections
  useEffect(() => {
    if (connectionOption === 'custom') {
      setSelectedConnections(connections.map(c => c.profileId));
    }
  }, [connectionOption, connections]);

  const toggleConnection = (id: string) => {
    setSelectedConnections(prev =>
      prev.includes(id)
        ? prev.filter(c => c !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedConnections(connections.map(c => c.profileId));
  };

  const deselectAll = () => {
    setSelectedConnections([]);
  };

  const allSelected = selectedConnections.length === connections.length;
  const noneSelected = selectedConnections.length === 0;

  const getSeedConnectionIds = (): string[] => {
    switch (connectionOption) {
      case 'just-me':
        return userProfileId ? [userProfileId] : [];
      case 'all':
        const allIds = connections.map(c => c.profileId);
        if (userProfileId) allIds.push(userProfileId);
        return allIds;
      case 'custom':
        const customIds = [...selectedConnections];
        if (userProfileId && !customIds.includes(userProfileId)) {
          customIds.push(userProfileId);
        }
        return customIds;
      default:
        return [];
    }
  };

  const handleSend = async (linkOnly: boolean = false) => {
    if (!contact && !linkOnly) {
      setError('Please enter an email address or mobile number');
      return;
    }

    if (linkOnly) {
      setGeneratingLink(true);
    } else {
      setSending(true);
    }
    setError(null);

    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          contact: contact || 'link-only@placeholder.local', // Placeholder for link-only mode
          seedConnectionIds: getSeedConnectionIds(),
          linkOnly,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invite');
      }

      setSuccess({
        inviteUrl: data.inviteUrl,
        method: data.method as SendMethod
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSending(false);
      setGeneratingLink(false);
    }
  };

  const copyLink = async () => {
    if (success?.inviteUrl) {
      await navigator.clipboard.writeText(success.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  const connectionOptions: { value: ConnectionOption; label: string; description: string; icon: typeof User }[] = [
    {
      value: 'just-me',
      label: 'Just me',
      description: `${profileName} will only be connected to you`,
      icon: User,
    },
    {
      value: 'all',
      label: 'All my connections',
      description: `Connected to you + ${connections.length} other${connections.length === 1 ? '' : 's'}`,
      icon: UsersRound,
    },
    {
      value: 'custom',
      label: 'Custom selection',
      description: 'Choose which of your connections to include',
      icon: Users,
    },
  ];

  // Dynamic icon based on input type
  const InputIcon = inputType === 'phone' ? Smartphone : Mail;

  // Success message based on method
  const getSuccessMessage = () => {
    switch (success?.method) {
      case 'sms':
        return `We've sent a text message to invite ${profileName} to join CircleDays.`;
      case 'link_only':
        return `Invite link generated for ${profileName}. Share it however you like!`;
      default:
        return `We've sent an email to invite ${profileName} to join CircleDays.`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            {success ? (
              <>
                <Check className="w-5 h-5 text-green-600" />
                {success.method === 'link_only' ? 'Link Generated!' : 'Invite Sent!'}
              </>
            ) : (
              <>
                <Mail className="w-5 h-5 text-teal-600" />
                {`Invite ${profileName}`}
              </>
            )}
          </CardTitle>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </CardHeader>

        <CardContent className="overflow-y-auto flex-1">
          {success ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-xl">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">
                    {success.method === 'link_only' ? 'Link ready!' : 'Invite sent successfully!'}
                  </span>
                </div>
                <p className="text-sm text-green-700">
                  {getSuccessMessage()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share invite link directly
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={success.inviteUrl}
                    className="flex-1 px-3 py-2 text-sm bg-gray-50 border rounded-lg truncate"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={copyLink}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(success.inviteUrl, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Button className="w-full" onClick={onClose}>
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-sm text-gray-600">
                Send an invitation to {profileName} so they can claim their profile and start managing their own connections.
              </p>

              {/* Contact Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email or Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <InputIcon className="w-5 h-5" />
                  </div>
                  <input
                    type={inputType === 'phone' ? 'tel' : 'email'}
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="email@example.com or (555) 123-4567"
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                </div>
                {inputType !== 'empty' && (
                  <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                    {inputType === 'phone' ? (
                      <>
                        <Smartphone className="w-3 h-3" />
                        Will send via text message
                      </>
                    ) : (
                      <>
                        <Mail className="w-3 h-3" />
                        Will send via email
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* Connection Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Start them off connected to:
                </label>
                <div className="space-y-2">
                  {connectionOptions.map(option => {
                    const Icon = option.icon;
                    const isSelected = connectionOption === option.value;
                    const isDisabled = option.value === 'all' && connections.length === 0;

                    // Hide custom option if no connections
                    if (option.value === 'custom' && connections.length === 0) {
                      return null;
                    }

                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setConnectionOption(option.value)}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${isSelected
                            ? 'bg-teal-50 border-2 border-teal-500'
                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                          } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-teal-100' : 'bg-gray-200'
                          }`}>
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-teal-600' : 'text-gray-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${isSelected ? 'text-teal-900' : 'text-gray-900'}`}>
                              {option.label}
                            </span>
                            {isSelected && (
                              <Check className="w-4 h-4 text-teal-600" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {option.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Selection */}
              {connectionOption === 'custom' && connections.length > 0 && (
                <div className="border rounded-xl overflow-hidden">
                  {/* Sticky header with Select All/Deselect All */}
                  <div className="bg-gray-50 border-b p-3 flex items-center justify-between sticky top-0">
                    <span className="text-sm font-medium text-gray-700">
                      {selectedConnections.length} of {connections.length} selected
                    </span>
                    <button
                      type="button"
                      onClick={allSelected ? deselectAll : selectAll}
                      className="flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors px-2 py-1 rounded-lg hover:bg-teal-50"
                    >
                      {allSelected ? (
                        <>
                          <Square className="w-4 h-4" />
                          <span className="hidden sm:inline">Deselect All</span>
                          <span className="sm:hidden">None</span>
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-4 h-4" />
                          <span className="hidden sm:inline">Select All</span>
                          <span className="sm:hidden">All</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Connection list */}
                  <div className="max-h-56 overflow-y-auto">
                    {connections.map((conn, index) => {
                      const isSelected = selectedConnections.includes(conn.profileId);
                      return (
                        <button
                          key={conn.id}
                          type="button"
                          onClick={() => toggleConnection(conn.profileId)}
                          className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${isSelected
                              ? 'bg-teal-50'
                              : 'bg-white hover:bg-gray-50'
                            } ${index !== connections.length - 1 ? 'border-b' : ''}`}
                        >
                          {/* Custom checkbox - larger for mobile */}
                          <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected
                              ? 'bg-teal-600 border-teal-600'
                              : 'border-gray-300 bg-white'
                            }`}>
                            {isSelected && (
                              <Check className="w-4 h-4 text-white" strokeWidth={3} />
                            )}
                          </div>

                          <Avatar
                            src={conn.profilePicture}
                            name={conn.name}
                            size="sm"
                          />

                          <span className={`text-sm truncate ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                            {conn.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Footer note */}
                  <div className="bg-gray-50 border-t px-3 py-2">
                    <p className="text-xs text-gray-500">
                      ✓ {profileName} will always be connected to you
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-coral-600">{error}</p>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {/* Primary action row */}
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={onClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleSend(false)}
                    loading={sending}
                    disabled={!contact}
                  >
                    {inputType === 'phone' ? (
                      <>
                        <MessageSquare className="w-4 h-4 mr-1.5" />
                        Send Text
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-1.5" />
                        Send Email
                      </>
                    )}
                  </Button>
                </div>

                {/* Get Link Only option */}
                <button
                  type="button"
                  onClick={() => handleSend(true)}
                  disabled={generatingLink}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 hover:text-teal-600 transition-colors"
                >
                  <LinkIcon className="w-4 h-4" />
                  {generatingLink ? 'Generating...' : 'Just get the link (don\'t send)'}
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
