'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { X, Sparkles, Copy, Check, RefreshCw } from 'lucide-react';

interface MessageAssistModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  profileName: string;
  profilePicture: string | null;
  eventType: string;
  daysUntil?: number;
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
  daysUntil,
}: MessageAssistModalProps) {
  const [notes, setNotes] = useState<string>('');
  const [originalNotes, setOriginalNotes] = useState<string>('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [tone, setTone] = useState<Tone>('warm');
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'context' | 'message'>('context');

  const notesChanged = notes !== originalNotes;

  // Fetch existing notes when modal opens
  useEffect(() => {
    if (isOpen && profileId) {
      setAdditionalContext('');
      setMessage('');
      setFeedback('');
      setCopied(false);
      setNotesSaved(false);
      setStep('context');
      setLoading(false);

      // Fetch existing notes
      setLoadingNotes(true);
      fetch(`/api/profiles/${profileId}/notes`)
        .then(res => res.json())
        .then(data => {
          const noteContent = data.note?.content || '';
          setNotes(noteContent);
          setOriginalNotes(noteContent);
        })
        .catch(err => console.error('Failed to fetch notes:', err))
        .finally(() => setLoadingNotes(false));
    }
  }, [isOpen, profileId]);

  const saveNotes = async (showConfirmation = true) => {
    if (!notesChanged) return;

    setSavingNotes(true);
    try {
      await fetch(`/api/profiles/${profileId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: notes }),
      });
      setOriginalNotes(notes);
      if (showConfirmation) {
        setNotesSaved(true);
        setTimeout(() => setNotesSaved(false), 2000);
      }
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  // Auto-save notes when closing
  const handleClose = async () => {
    if (notesChanged) {
      await saveNotes(false); // Save silently
    }
    onClose();
  };

  const generateMessage = async (isRegenerate = false) => {
    setLoading(true);
    setCopied(false);
    setError('');

    try {
      const res = await fetch('/api/message-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          profileName,
          eventType,
          daysUntil,
          notes: notes || undefined,
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
      } else {
        setError(data.error || 'Failed to generate message. Please try again.');
      }
    } catch (err) {
      console.error('Failed to generate message:', err);
      setError('Something went wrong. Please try again.');
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
      <Card className="w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col" padding="none">
        <CardHeader className="flex flex-row items-center justify-between flex-shrink-0 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-t-2xl px-4 py-3 mb-0">
          <CardTitle className="flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5" />
            Message Assist
          </CardTitle>
          <button
            onClick={handleClose}
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
              {/* Private notes (editable) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Your Notes About {firstName}
                  </label>
                  {(notesChanged || notesSaved || savingNotes) && (
                    <span className="text-xs text-gray-400">
                      {savingNotes ? (
                        'Saving...'
                      ) : notesSaved ? (
                        <span className="text-teal-600 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Saved
                        </span>
                      ) : (
                        'Unsaved'
                      )}
                    </span>
                  )}
                </div>
                {loadingNotes ? (
                  <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-400 text-center">
                    Loading notes...
                  </div>
                ) : (
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={`Add notes about ${firstName} to personalize messages.\ne.g., "Loves hiking", "Has two kids", "Works at Google"`}
                    rows={3}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm resize-none ${notesChanged ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                      }`}
                  />
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Private notes • Auto-saved when you close
                </p>
              </div>

              {/* Additional context for this message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Context for This Message <span className="text-gray-400 font-normal">(optional, not saved)</span>
                </label>
                <textarea
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder={`Anything specific for this message?\ne.g., "We're meeting for dinner tonight" or "Mention their new puppy"`}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm resize-none"
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
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${tone === t.value
                          ? 'bg-teal-50 border-2 border-teal-500'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                        }`}
                    >
                      <span className="text-lg">{t.emoji}</span>
                      <span className={`text-xs font-medium ${tone === t.value ? 'text-teal-700' : 'text-gray-600'
                        }`}>
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl">
                  {error}
                </div>
              )}

              {/* Generate button */}
              <Button
                className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800"
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
                <div className="p-4 bg-white border-2 border-teal-200 rounded-xl">
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
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm resize-none"
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

