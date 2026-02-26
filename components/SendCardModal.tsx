'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { X, Mail, Sparkles, Send, BookUser, MapPin, CreditCard, Check, ChevronLeft } from 'lucide-react';
import { isContactPickerSupported, pickContact } from '@/lib/hooks/useContactPicker';
import { CARD_CHAR_LIMIT, CREDIT_BUNDLES } from '@/lib/constants';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { StripeCheckoutModal } from '@/components/StripeCheckoutModal';

interface SendCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  profileName: string;
  profilePicture: string | null;
  eventType: string;
  daysUntil?: number;
  eventId?: string;
}

interface AddressData {
  recipientName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface CardPrefs {
  handwritingId: string;
  stationeryId: string;
}

interface StyleOption {
  id: string;
  name: string;
  preview?: string;
}

type Step = 'address' | 'compose' | 'confirm' | 'success';

const CHAR_LIMIT = CARD_CHAR_LIMIT;

export function SendCardModal({
  isOpen,
  onClose,
  profileId,
  profileName,
  profilePicture,
  eventType,
  daysUntil,
  eventId,
}: SendCardModalProps) {
  const [step, setStep] = useState<Step>('address');

  // Address state
  const [address, setAddress] = useState<AddressData>({
    recipientName: profileName,
    street: '',
    city: '',
    state: '',
    zip: '',
  });
  const [addressSource, setAddressSource] = useState<'stored' | 'picked' | 'manual' | null>(null);
  const [saveAddress, setSaveAddress] = useState(false);
  const [contactPickerAvailable, setContactPickerAvailable] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [pickingContact, setPickingContact] = useState(false);

  // Compose state
  const [notes, setNotes] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [message, setMessage] = useState('');
  const [isLate, setIsLate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Preferences
  const [prefs, setPrefs] = useState<CardPrefs>({ handwritingId: '', stationeryId: '' });
  const [handwritingStyles, setHandwritingStyles] = useState<StyleOption[]>([]);
  const [stationeryOptions, setStationeryOptions] = useState<StyleOption[]>([]);
  const [showStylePicker, setShowStylePicker] = useState(false);

  // Credits
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [checkoutBundleId, setCheckoutBundleId] = useState<string | null>(null);

  // Sending
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const addressValid =
    address.recipientName.trim().length > 0 &&
    address.street.trim().length > 0 &&
    address.city.trim().length > 0 &&
    address.state.trim().length > 0 &&
    /^\d{5}$/.test(address.zip.trim());

  const messageValid = message.trim().length > 0 && message.length <= CHAR_LIMIT;

  const charsRemaining = CHAR_LIMIT - message.length;

  // On open: check contact picker, load stored address, notes, prefs, credits
  useEffect(() => {
    if (!isOpen) return;

    setStep('address');
    setAddress({ recipientName: profileName, street: '', city: '', state: '', zip: '' });
    setAddressSource(null);
    setSaveAddress(false);
    setMessage('');
    setAdditionalContext('');
    setIsLate(false);
    setSendError(null);
    setShowStylePicker(false);

    setContactPickerAvailable(isContactPickerSupported());

    // Load stored address for this profile
    setLoadingAddress(true);
    fetch(`/api/profile-addresses?profileId=${profileId}`)
      .then(r => r.json())
      .then(data => {
        if (data.address) {
          setAddress({
            recipientName: profileName,
            street: data.address.street,
            city: data.address.city,
            state: data.address.state,
            zip: data.address.zip,
          });
          setAddressSource('stored');
        }
      })
      .catch(console.error)
      .finally(() => setLoadingAddress(false));

    // Load notes
    setLoadingNotes(true);
    fetch(`/api/profiles/${profileId}/notes`)
      .then(r => r.json())
      .then(data => setNotes(data.note?.content || ''))
      .catch(console.error)
      .finally(() => setLoadingNotes(false));

    // Load prefs + styles
    fetch('/api/card-preferences')
      .then(r => r.json())
      .then(data => {
        if (data.preferences) setPrefs(data.preferences);
        if (data.handwritingStyles?.length) setHandwritingStyles(data.handwritingStyles);
        if (data.stationeryOptions?.length) setStationeryOptions(data.stationeryOptions);

        // Set defaults if user hasn't chosen yet
        if (!data.preferences?.handwritingId && data.handwritingStyles?.length) {
          setPrefs(p => ({ ...p, handwritingId: data.handwritingStyles[0].id }));
        }
        if (!data.preferences?.stationeryId && data.stationeryOptions?.length) {
          setPrefs(p => ({ ...p, stationeryId: data.stationeryOptions[0].id }));
        }
      })
      .catch(console.error);

    // Load credit balance
    fetch('/api/card-credits')
      .then(r => r.json())
      .then(data => setCreditBalance(data.balance ?? 0))
      .catch(console.error);
  }, [isOpen, profileId, profileName]);

  const handlePickContact = async () => {
    setPickingContact(true);
    try {
      const contact = await pickContact();
      if (contact) {
        setAddress({
          recipientName: contact.name || profileName,
          street: contact.street,
          city: contact.city,
          state: contact.state,
          zip: contact.zip,
        });
        setAddressSource('picked');
      }
    } finally {
      setPickingContact(false);
    }
  };

  const handleSaveNotes = useCallback(async (content: string) => {
    try {
      await fetch(`/api/profiles/${profileId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
    } catch (err) {
      console.error('Save notes error:', err);
    }
  }, [profileId]);

  const handlePurchaseSuccess = async () => {
    setCheckoutBundleId(null);
    const res = await fetch('/api/card-credits');
    const data = await res.json();
    if (typeof data.balance === 'number') setCreditBalance(data.balance);
  };

  const handleContinueToCompose = async () => {
    if (saveAddress && addressSource !== 'stored') {
      try {
        await fetch('/api/profile-addresses', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profileId,
            street: address.street,
            city: address.city,
            state: address.state,
            zip: address.zip,
          }),
        });
        setAddressSource('stored');
      } catch (err) {
        console.error('Save address error:', err);
      }
    }
    setStep('compose');
  };

  const handleGenerateMessage = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/card-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileName,
          eventType,
          daysUntil,
          notes: notes || undefined,
          additionalContext: additionalContext || undefined,
          isLate,
        }),
      });
      const data = await res.json();
      if (data.message) setMessage(data.message);
    } catch (err) {
      console.error('Card assist error:', err);
    } finally {
      setGenerating(false);
    }
  }, [profileName, eventType, daysUntil, notes, additionalContext, isLate]);

  const handleSend = async () => {
    setSending(true);
    setSendError(null);

    try {
      const res = await fetch('/api/handwritten-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          eventId: eventId ?? undefined,
          recipientName: address.recipientName,
          recipientStreet: address.street,
          recipientCity: address.city,
          recipientState: address.state,
          recipientZip: address.zip,
          message,
          handwritingId: prefs.handwritingId,
          stationeryId: prefs.stationeryId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'NO_CREDITS') {
          setSendError('You have no card credits remaining. Add more credits in Settings.');
        } else {
          setSendError(data.error || 'Something went wrong sending the card.');
        }
        return;
      }

      setStep('success');
      setCreditBalance(b => (b !== null ? b - 1 : null));
    } catch (err) {
      console.error('Send card error:', err);
      setSendError('Failed to send card. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const firstName = profileName.split(' ')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between flex-shrink-0 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-t-xl">
          <CardTitle className="flex items-center gap-2 text-white">
            <Mail className="w-5 h-5" />
            Send a Handwritten Card
          </CardTitle>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-4 space-y-4">
          {/* Person info strip */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Avatar src={profilePicture} name={profileName} size="md" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{profileName}</p>
              <p className="text-sm text-gray-500 capitalize">{eventType}</p>
            </div>
            {creditBalance !== null && (
              <div className="flex items-center gap-1 text-xs text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-1">
                <CreditCard className="w-3 h-3" />
                <span>{creditBalance} {creditBalance === 1 ? 'credit' : 'credits'}</span>
              </div>
            )}
          </div>

          {/* Step: Address */}
          {step === 'address' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Where should we send the card?
                </p>

                {loadingAddress ? (
                  <div className="text-sm text-gray-400 text-center py-4">Loading saved address...</div>
                ) : (
                  <>
                    {/* Contact picker button — mobile only */}
                    {contactPickerAvailable && (
                      <button
                        onClick={handlePickContact}
                        disabled={pickingContact}
                        className="w-full flex items-center gap-2 px-4 py-3 mb-3 rounded-xl border-2 border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-700 font-medium text-sm transition-colors"
                      >
                        <BookUser className="w-4 h-4" />
                        {pickingContact ? 'Opening contacts...' : 'Choose from Contacts'}
                      </button>
                    )}

                    {addressSource === 'stored' && (
                      <div className="flex items-center gap-2 mb-3 text-xs text-teal-700 bg-teal-50 rounded-lg px-3 py-2">
                        <MapPin className="w-3.5 h-3.5" />
                        Using saved address for {firstName}
                      </div>
                    )}
                    {addressSource === 'picked' && (
                      <div className="flex items-center gap-2 mb-3 text-xs text-teal-700 bg-teal-50 rounded-lg px-3 py-2">
                        <BookUser className="w-3.5 h-3.5" />
                        Address imported from contacts
                      </div>
                    )}

                    {/* Address fields */}
                    <div className="space-y-3">
                      <Input
                        label="Recipient name"
                        value={address.recipientName}
                        onChange={e => setAddress(a => ({ ...a, recipientName: e.target.value }))}
                        placeholder="Full name"
                        autoComplete="name"
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Street address</label>
                        <AddressAutocomplete
                          value={address.street}
                          onChange={v => setAddress(a => ({ ...a, street: v }))}
                          onPlaceSelect={parsed => setAddress(a => ({
                            ...a,
                            street: parsed.street,
                            city: parsed.city || a.city,
                            state: parsed.state || a.state,
                            zip: parsed.zip || a.zip,
                          }))}
                          placeholder="123 Main St"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="City"
                          value={address.city}
                          onChange={e => setAddress(a => ({ ...a, city: e.target.value }))}
                          placeholder="City"
                          autoComplete="address-level2"
                        />
                        <Input
                          label="State"
                          value={address.state}
                          onChange={e => setAddress(a => ({ ...a, state: e.target.value }))}
                          placeholder="CA"
                          autoComplete="address-level1"
                        />
                      </div>
                      <Input
                        label="ZIP code"
                        value={address.zip}
                        onChange={e => setAddress(a => ({ ...a, zip: e.target.value }))}
                        placeholder="12345"
                        maxLength={5}
                        autoComplete="postal-code"
                        inputMode="numeric"
                      />
                    </div>

                    {/* Save address checkbox (only when not already stored) */}
                    {addressSource !== 'stored' && (
                      <label className="flex items-center gap-2 mt-3 text-sm text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveAddress}
                          onChange={e => setSaveAddress(e.target.checked)}
                          className="rounded"
                        />
                        Save this address for {firstName}
                        <span className="text-xs text-gray-400">(stored privately)</span>
                      </label>
                    )}
                  </>
                )}
              </div>

              {/* Late card toggle */}
              {daysUntil !== undefined && daysUntil < 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                  This occasion has already passed. We'll acknowledge that in the message.
                </div>
              )}

              <Button
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
                onClick={handleContinueToCompose}
                disabled={!addressValid}
              >
                Continue to Message
              </Button>
            </div>
          )}

          {/* Step: Compose */}
          {step === 'compose' && (
            <div className="space-y-4">
              <button
                onClick={() => setStep('address')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="w-4 h-4" />
                Edit address
              </button>

              {/* Notes (pre-loaded, editable) */}
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
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none"
                  />
                )}
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
                  rows={2}
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

              {/* AI generate button */}
              <Button
                type="button"
                className="w-full"
                variant="secondary"
                onClick={handleGenerateMessage}
                loading={generating}
              >
                <Sparkles className="w-4 h-4 mr-2 text-teal-600" />
                {message ? 'Regenerate with AI' : 'Draft with AI'}
              </Button>

              {/* Message textarea with character counter */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Card message
                  </label>
                  <span className={`text-xs font-mono ${charsRemaining < 0 ? 'text-red-500 font-bold' : charsRemaining < 40 ? 'text-amber-500' : 'text-gray-400'}`}>
                    {charsRemaining} left
                  </span>
                </div>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={`Write your message here (max ${CHAR_LIMIT} characters)...`}
                  rows={5}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 text-sm resize-none ${
                    charsRemaining < 0
                      ? 'border-red-400 focus:ring-red-400'
                      : 'border-gray-200 focus:ring-teal-500'
                  }`}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Physical cards are limited to {CHAR_LIMIT} characters.
                </p>
              </div>

              {/* Style summary + optional picker */}
              {(handwritingStyles.length > 0 || stationeryOptions.length > 0) && (() => {
                const selectedHandwriting = handwritingStyles.find(s => s.id === prefs.handwritingId);
                const selectedStationery = stationeryOptions.find(s => s.id === prefs.stationeryId);
                return (
                  <div>
                    {/* Compact summary row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {selectedHandwriting && (
                          <div className="flex items-center gap-1.5">
                            {selectedHandwriting.preview ? (
                              <img src={selectedHandwriting.preview} alt={selectedHandwriting.name} className="w-8 h-6 object-cover rounded border border-gray-200" />
                            ) : null}
                            <span className="text-xs text-gray-600">{selectedHandwriting.name}</span>
                          </div>
                        )}
                        {selectedHandwriting && selectedStationery && (
                          <span className="text-gray-300 text-xs">·</span>
                        )}
                        {selectedStationery && (
                          <div className="flex items-center gap-1.5">
                            {selectedStationery.preview ? (
                              <img src={selectedStationery.preview} alt={selectedStationery.name} className="w-5 h-7 object-cover rounded border border-gray-200" />
                            ) : null}
                            <span className="text-xs text-gray-600">{selectedStationery.name}</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setShowStylePicker(v => !v)}
                        className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                      >
                        {showStylePicker ? 'Done' : 'Change'}
                      </button>
                    </div>

                    {/* Expanded picker — only shown when user clicks Change */}
                    {showStylePicker && (
                      <div className="space-y-3 pt-1">
                        {handwritingStyles.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1.5">Handwriting style</p>
                            <div className="grid grid-cols-4 gap-2">
                              {handwritingStyles.map(s => (
                                <button
                                  key={s.id}
                                  onClick={() => setPrefs(p => ({ ...p, handwritingId: s.id }))}
                                  className={`relative flex flex-col rounded-lg border-2 overflow-hidden transition-all active:scale-95 ${
                                    prefs.handwritingId === s.id ? 'border-teal-500' : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  {s.preview ? (
                                    <img src={s.preview} alt={s.name} className="w-full aspect-[4/3] object-cover bg-gray-50" />
                                  ) : (
                                    <div className="w-full aspect-[4/3] bg-gray-100 flex items-center justify-center">
                                      <span className="text-lg font-serif italic text-gray-400">Aa</span>
                                    </div>
                                  )}
                                  <div className={`px-1 py-0.5 text-center text-[10px] font-medium truncate ${
                                    prefs.handwritingId === s.id ? 'bg-teal-500 text-white' : 'bg-white text-gray-700'
                                  }`}>{s.name}</div>
                                  {prefs.handwritingId === s.id && (
                                    <div className="absolute top-1 right-1 w-4 h-4 bg-teal-500 rounded-full flex items-center justify-center shadow">
                                      <Check className="w-2.5 h-2.5 text-white" />
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {stationeryOptions.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1.5">Stationery</p>
                            <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 p-2">
                              <div className="grid grid-cols-4 gap-2">
                                {stationeryOptions.map(s => (
                                  <button
                                    key={s.id}
                                    onClick={() => setPrefs(p => ({ ...p, stationeryId: s.id }))}
                                    className={`relative flex flex-col rounded-lg border-2 overflow-hidden transition-all active:scale-95 ${
                                      prefs.stationeryId === s.id ? 'border-teal-500' : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                  >
                                    {s.preview ? (
                                      <img src={s.preview} alt={s.name} className="w-full aspect-[3/4] object-cover bg-gray-50" />
                                    ) : (
                                      <div className="w-full aspect-[3/4] bg-gray-100 flex items-center justify-center">
                                        <Mail className="w-4 h-4 text-gray-300" />
                                      </div>
                                    )}
                                    <div className={`px-0.5 py-0.5 text-center leading-tight text-[9px] font-medium ${
                                      prefs.stationeryId === s.id ? 'bg-teal-500 text-white' : 'bg-white text-gray-600'
                                    }`}>{s.name}</div>
                                    {prefs.stationeryId === s.id && (
                                      <div className="absolute top-1 right-1 w-4 h-4 bg-teal-500 rounded-full flex items-center justify-center shadow">
                                        <Check className="w-2.5 h-2.5 text-white" />
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              <Button
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
                onClick={() => setStep('confirm')}
                disabled={!messageValid}
              >
                Review & Send
              </Button>
            </div>
          )}

          {/* Step: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <button
                onClick={() => setStep('compose')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="w-4 h-4" />
                Edit message
              </button>

              {/* Address summary */}
              <div className="p-4 bg-gray-50 rounded-xl space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sending to</p>
                <p className="font-medium text-gray-900">{address.recipientName}</p>
                <p className="text-sm text-gray-600">{address.street}</p>
                <p className="text-sm text-gray-600">{address.city}, {address.state} {address.zip}</p>
              </div>

              {/* Message preview */}
              <div className="p-4 bg-white border-2 border-teal-200 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your message</p>
                <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">{message}</p>
                <p className="text-xs text-gray-400 mt-2 text-right">{message.length} / {CHAR_LIMIT}</p>
              </div>

              {/* Credit cost */}
              <div className="flex items-center justify-between p-3 bg-teal-50 rounded-xl text-sm">
                <span className="text-teal-800">Cost</span>
                <span className="font-semibold text-teal-800">1 credit</span>
              </div>

              {creditBalance !== null && creditBalance < 1 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                  <p className="text-sm font-medium text-amber-800">You&apos;re out of credits — add some to send this card.</p>
                  <div className="grid grid-cols-3 gap-2">
                    {CREDIT_BUNDLES.map(bundle => (
                      <button
                        key={bundle.id}
                        type="button"
                        onClick={() => setCheckoutBundleId(bundle.id)}
                        className="flex flex-col items-center p-2.5 rounded-xl border-2 border-amber-200 bg-white hover:border-teal-400 hover:bg-teal-50 transition-all text-center"
                      >
                        <span className="font-semibold text-gray-900 text-sm">{bundle.label}</span>
                        <span className="text-xs text-gray-500">${bundle.priceUsd.toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <StripeCheckoutModal
                bundleId={checkoutBundleId}
                onSuccess={handlePurchaseSuccess}
                onClose={() => setCheckoutBundleId(null)}
              />

              {sendError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {sendError}
                </div>
              )}

              <Button
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
                onClick={handleSend}
                loading={sending}
                disabled={creditBalance !== null && creditBalance < 1}
              >
                <Send className="w-4 h-4 mr-2" />
                Send Card — 1 Credit
              </Button>

              <p className="text-xs text-center text-gray-400">
                Cards are typically delivered within 3&ndash;4 days.
              </p>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="flex flex-col items-center text-center space-y-4 py-6">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-teal-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Card on its way!</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Your handwritten card for {firstName} is being written and will arrive within a few days.
                </p>
              </div>
              {creditBalance !== null && (
                <p className="text-sm text-gray-500">
                  {creditBalance} credit{creditBalance === 1 ? '' : 's'} remaining
                </p>
              )}
              <Button onClick={onClose} className="w-full">
                Done
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
