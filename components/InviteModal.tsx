'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { X, Mail, Users, Check, Copy, ExternalLink } from 'lucide-react';

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
}

export function InviteModal({ isOpen, onClose, profileId, profileName, connections }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ inviteUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setEmail('');
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
          seedConnectionIds: selectedConnections,
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
            <div className="space-y-4">
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
              
              {connections.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Start them off with connections (optional)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Select people to automatically connect with {profileName} when they join
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {connections.map(conn => (
                      <label
                        key={conn.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedConnections.includes(conn.profileId)
                            ? 'bg-teal-50 border border-teal-200'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedConnections.includes(conn.profileId)}
                          onChange={() => toggleConnection(conn.profileId)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          selectedConnections.includes(conn.profileId)
                            ? 'bg-teal-600 border-teal-600'
                            : 'border-gray-300'
                        }`}>
                          {selectedConnections.includes(conn.profileId) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="text-sm text-gray-900">{conn.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
              {error && (
                <p className="text-sm text-coral-600">{error}</p>
              )}
              
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

