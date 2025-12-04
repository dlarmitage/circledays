'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { X, Mail, Users, Check, Copy, ExternalLink, User, UsersRound } from 'lucide-react';

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

export function InviteModal({ isOpen, onClose, profileId, profileName, connections, userProfileId }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [connectionOption, setConnectionOption] = useState<ConnectionOption>('just-me');
  const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ inviteUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setConnectionOption('just-me');
      setSelectedConnections([]);
      setError(null);
      setSuccess(null);
      setCopied(false);
    }
  }, [isOpen]);
  
  const toggleConnection = (id: string) => {
    setSelectedConnections(prev => 
      prev.includes(id) 
        ? prev.filter(c => c !== id)
        : [...prev, id]
    );
  };
  
  const getSeedConnectionIds = (): string[] => {
    switch (connectionOption) {
      case 'just-me':
        // Just connect with the inviter's profile
        return userProfileId ? [userProfileId] : [];
      case 'all':
        // Connect with all the inviter's connections plus the inviter
        const allIds = connections.map(c => c.profileId);
        if (userProfileId) allIds.push(userProfileId);
        return allIds;
      case 'custom':
        // Connect with selected connections plus the inviter
        const customIds = [...selectedConnections];
        if (userProfileId && !customIds.includes(userProfileId)) {
          customIds.push(userProfileId);
        }
        return customIds;
      default:
        return [];
    }
  };
  
  const handleSend = async () => {
    if (!email) {
      setError('Please enter an email address');
      return;
    }
    
    setSending(true);
    setError(null);
    
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          email,
          seedConnectionIds: getSeedConnectionIds(),
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invite');
      }
      
      setSuccess({ inviteUrl: data.inviteUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSending(false);
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
      description: `${profileName} will be connected to you and all ${connections.length} of your connections`,
      icon: UsersRound,
    },
    {
      value: 'custom',
      label: 'Custom selection',
      description: 'Choose specific people to connect them with',
      icon: Users,
    },
  ];
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-teal-600" />
            {success ? 'Invite Sent!' : `Invite ${profileName}`}
          </CardTitle>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </CardHeader>
        
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-xl">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Invite sent successfully!</span>
                </div>
                <p className="text-sm text-green-700">
                  We've sent an email to invite {profileName} to join CircleDays.
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
                Send an email invitation to {profileName} so they can claim their profile and start managing their own connections.
              </p>
              
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`${profileName.toLowerCase().replace(' ', '.')}@example.com`}
                required
              />
              
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
                    
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setConnectionOption(option.value)}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                          isSelected
                            ? 'bg-teal-50 border-2 border-teal-500'
                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-teal-100' : 'bg-gray-200'
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
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select connections ({selectedConnections.length} selected)
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {connections.map(conn => {
                      const isSelected = selectedConnections.includes(conn.profileId);
                      return (
                        <label
                          key={conn.id}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-teal-50 border border-teal-200'
                              : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleConnection(conn.profileId)}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? 'bg-teal-600 border-teal-600'
                              : 'border-gray-300 bg-white'
                          }`}>
                            {isSelected && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <Avatar
                            src={conn.profilePicture}
                            name={conn.name}
                            size="sm"
                          />
                          <span className="text-sm text-gray-900 truncate">{conn.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Note: {profileName} will always be connected to you
                  </p>
                </div>
              )}
              
              {connectionOption === 'custom' && connections.length === 0 && (
                <p className="text-sm text-gray-500 italic">
                  You don't have any other connections yet. {profileName} will be connected to just you.
                </p>
              )}
              
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
                  onClick={handleSend}
                  loading={sending}
                  disabled={!email}
                >
                  Send Invite
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
