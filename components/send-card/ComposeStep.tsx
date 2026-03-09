'use client';

import { Button } from '@/components/ui/Button';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { CARD_TONE_OPTIONS } from '@/lib/constants';
import { useSendCard } from './SendCardContext';

export function ComposeStep() {
  const {
    firstName,
    notes,
    setNotes,
    handleSaveNotes,
    loadingNotes,
    additionalContext,
    setAdditionalContext,
    daysUntil,
    isLate,
    setIsLate,
    tone,
    setTone,
    message,
    setMessage,
    charLimit,
    generating,
    handleGenerateMessage,
    setStep,
  } = useSendCard();

  const charsRemaining = charLimit - message.length;
  const messageValid = message.trim().length > 0 && message.length <= charLimit;

  return (
    <div className="space-y-4">
      <button onClick={() => setStep('pick-card')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft className="w-4 h-4" />
        Change card
      </button>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Your notes about {firstName}
          <span className="text-xs font-normal text-gray-400 ml-2">(private, saved)</span>
        </label>
        {loadingNotes ? (
          <div className="text-sm text-gray-400 py-2">Loading notes...</div>
        ) : (
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={e => handleSaveNotes(e.target.value)}
            placeholder={`e.g. "Loves hiking", "Has two kids", "Big year — just retired"`}
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none"
          />
        )}
        <p className="text-xs text-gray-400 mt-1">The more detail you provide here, the more personal the AI-generated message will be.</p>
      </div>

      {/* Additional context */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Anything specific to mention?
          <span className="text-xs font-normal text-gray-400 ml-2">(optional, not saved)</span>
        </label>
        <textarea
          value={additionalContext}
          onChange={e => setAdditionalContext(e.target.value)}
          placeholder={`e.g. "Mention their new puppy" or "Reference our camping trip"`}
          rows={3}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none"
        />
      </div>

      {/* Late card toggle */}
      {daysUntil !== undefined && daysUntil >= 0 && (
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={isLate}
            onChange={e => setIsLate(e.target.checked)}
            className="rounded"
          />
          Acknowledge the card will arrive after the occasion
        </label>
      )}

      {/* Tone selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Tone</label>
        <div className="flex gap-2 flex-wrap">
          {CARD_TONE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTone(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                tone === opt.value
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI generate button */}
      <Button
        type="button"
        className="w-full border-2 border-teal-500 text-teal-700 bg-teal-50 hover:bg-teal-100 py-3 font-semibold"
        onClick={handleGenerateMessage}
        loading={generating}
      >
        <Sparkles className="w-4 h-4 mr-2 text-teal-600" />
        {message ? 'Regenerate with AI' : 'Draft with AI'}
      </Button>

      {/* Message textarea */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">Card message</label>
          <span className={`text-xs font-mono ${charsRemaining < 0 ? 'text-red-500 font-bold' : charsRemaining < 40 ? 'text-amber-500' : 'text-gray-400'}`}>
            {charsRemaining} left
          </span>
        </div>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={`Write your message here (max ${charLimit} characters)...`}
          rows={5}
          className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 text-sm resize-none ${
            charsRemaining < 0 ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-teal-500'
          }`}
        />
        <p className="text-xs text-gray-400 mt-1">This card supports up to {charLimit} characters.</p>
      </div>

      <Button
        className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
        onClick={() => setStep('preview')}
        disabled={!messageValid}
      >
        Preview Message
      </Button>
    </div>
  );
}
