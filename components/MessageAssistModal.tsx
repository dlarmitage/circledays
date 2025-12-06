'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { X, Sparkles, Copy, Check, RefreshCw, MessageSquare } from 'lucide-react';

interface MessageAssistModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  profileName: string;
  profilePicture: string | null;
  eventType: string;
}

type Tone = 'warm' | 'casual' | 'formal' | 'playful';

const TONES: { value: Tone; label: string; emoji: string }[] = [
  { value: 'warm', label: 'Warm', emoji: '💛' },
  { value: 'casual', label: 'Casual', emoji: '👋' },
  { value: 'formal', label: 'Formal', emoji: '🎩' },
  { value: 'playful', label: 'Playful', emoji: '🎉' },
];

export function MessageAssistModal({
  isOpen,
  onClose,
  profileId,
  profileName,
  profilePicture,
  eventType,
}: MessageAssistModalProps) {
  const [existingNote, setExistingNote] = useState<string>('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [tone, setTone] = useState<Tone>('warm');
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'context' | 'message'>('context');
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAdditionalContext('');
      setMessage('');
      setFeedback('');
      setCopied(false);
      setStep('context');
      setLoading(false);
      // Fetch existing note will happen on generate
    }
  }, [isOpen]);
  
  const generateMessage = async (isRegenerate = false) => {
    setLoading(true);
    setCopied(false);
    
    try {
      const res = await fetch('/api/message-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          profileName,
          eventType,
          additionalContext: additionalContext || undefined,
          tone,
          feedback: isRegenerate ? feedback : undefined,
          previousMessage: isRegenerate ? message : undefined,
        }),
      });
      
      const data = await res.json();
      
      if (data.message) {
        setMessage(data.message);
        setStep('message');
      }
      
      if (data.note && !existingNote) {
        setExistingNote(data.note);
      }
    } catch (err) {
      console.error('Failed to generate message:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const handleRegenerate = () => {
    generateMessage(true);
    setFeedback('');
  };
  
  if (!isOpen) return null;
  
  const firstName = profileName.split(' ')[0];
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between flex-shrink-0 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-t-xl">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Message Assist
          </CardTitle>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-auto p-4 space-y-4">
          {/* Person info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Avatar src={profilePicture} name={profileName} size="md" />
            <div>
              <p className="font-medium text-gray-900">{profileName}</p>
              <p className="text-sm text-gray-500 capitalize">{eventType}</p>
            </div>
          </div>
          
          {step === 'context' ? (
            <>
              {/* Existing notes (read-only display) */}
              {existingNote && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Notes About {firstName}
                  </label>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-gray-700">
                    {existingNote}
                  </div>
                </div>
              )}
              
              {/* Additional context for this message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Add Context <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder={`Anything specific for this message?\ne.g., "We're meeting for dinner next week" or "They just got promoted"`}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm resize-none"
                />
              </div>
              
              {/* Tone selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tone
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {TONES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTone(t.value)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                        tone === t.value
                          ? 'bg-violet-100 border-2 border-violet-500'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-lg">{t.emoji}</span>
                      <span className={`text-xs font-medium ${
                        tone === t.value ? 'text-violet-700' : 'text-gray-600'
                      }`}>
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Generate button */}
              <Button
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                onClick={() => generateMessage(false)}
                loading={loading}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Message
              </Button>
            </>
          ) : (
            <>
              {/* Generated message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Message
                </label>
                <div className="p-4 bg-white border-2 border-violet-200 rounded-xl">
                  <p className="text-gray-800 whitespace-pre-wrap">{message}</p>
                </div>
              </div>
              
              {/* Copy button */}
              <Button
                className="w-full"
                onClick={copyToClipboard}
                variant={copied ? 'secondary' : 'primary'}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
              
              {/* Regeneration section */}
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Want to adjust it?
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="e.g., 'Make it shorter' or 'Add a joke' or 'More heartfelt'"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm resize-none"
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setStep('context')}
                  >
                    Back
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={handleRegenerate}
                    loading={loading}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Regenerate
                  </Button>
                </div>
              </div>
              
              {/* Tone quick-switch */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Try different tone:</span>
                <div className="flex gap-1">
                  {TONES.filter(t => t.value !== tone).map(t => (
                    <button
                      key={t.value}
                      onClick={() => {
                        setTone(t.value);
                        generateMessage(false);
                      }}
                      className="px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                      title={t.label}
                    >
                      {t.emoji}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

