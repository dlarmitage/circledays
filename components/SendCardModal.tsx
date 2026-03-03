'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { X, Mail } from 'lucide-react';
import { isContactPickerSupported, pickContact } from '@/lib/hooks/useContactPicker';
import { DEFAULT_HANDWRYTTEN_CHAR_LIMIT } from '@/lib/constants';

import type { Step, AddressData, SenderAddress, HandwryttenCategory, HandwryttenCard, HandwryttenFont } from './send-card/types';
import { CardOnboarding } from './send-card/CardOnboarding';
import { PickCardStep } from './send-card/PickCardStep';
import { ComposeStep } from './send-card/ComposeStep';
import { PreviewStep } from './send-card/PreviewStep';
import { AddressStep } from './send-card/AddressStep';
import { ConfirmStep } from './send-card/ConfirmStep';
import { SuccessStep } from './send-card/SuccessStep';

interface SendCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  profileName: string;
  profilePicture: string | null;
  eventType: string;
  daysUntil?: number;
  eventId?: string;
  userName?: string;
}

export function SendCardModal({
  isOpen,
  onClose,
  profileId,
  profileName,
  profilePicture,
  eventType,
  daysUntil,
  eventId,
  userName = '',
}: SendCardModalProps) {
  const [step, setStep] = useState<Step>('pick-card');
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [signOff, setSignOff] = useState('');

  // Address
  const [address, setAddress] = useState<AddressData>({ recipientName: profileName, street: '', city: '', state: '', zip: '' });
  const [addressSource, setAddressSource] = useState<'stored' | 'picked' | 'manual' | null>(null);
  const [saveAddress, setSaveAddress] = useState(false);
  const [contactPickerAvailable, setContactPickerAvailable] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [pickingContact, setPickingContact] = useState(false);

  // Card selection
  const [categories, setCategories] = useState<HandwryttenCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [cards, setCards] = useState<HandwryttenCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [selectedCard, setSelectedCard] = useState<HandwryttenCard | null>(null);

  // Font
  const [fonts, setFonts] = useState<HandwryttenFont[]>([]);
  const [selectedFont, setSelectedFont] = useState<HandwryttenFont | null>(null);
  const [fontLoaded, setFontLoaded] = useState(false);

  // Compose
  const [notes, setNotes] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [message, setMessage] = useState('');
  const [isLate, setIsLate] = useState(false);
  const [tone, setTone] = useState('warm and sincere');
  const [generating, setGenerating] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Sender address
  const [senderAddress, setSenderAddress] = useState<SenderAddress>({
    senderName: '', senderAddress1: '', senderCity: '', senderState: '', senderZip: '',
  });

  // Credits & sending
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const charLimit = selectedCard?.characters ?? DEFAULT_HANDWRYTTEN_CHAR_LIMIT;

  const senderValid =
    senderAddress.senderName.trim().length > 0 &&
    senderAddress.senderAddress1.trim().length > 0 &&
    senderAddress.senderCity.trim().length > 0 &&
    senderAddress.senderState.trim().length > 0 &&
    /^\d{5}$/.test(senderAddress.senderZip.trim());

  // ---------- Init on open ----------
  useEffect(() => {
    if (!isOpen) return;

    setStep('pick-card');
    setNeedsOnboarding(null);
    setAddress({ recipientName: profileName, street: '', city: '', state: '', zip: '' });
    setAddressSource(null);
    setSaveAddress(false);
    setMessage('');
    setAdditionalContext('');
    setIsLate(daysUntil !== undefined && daysUntil < 4);
    setSendError(null);
    setSelectedCard(null);
    setSelectedCategory(null);
    setCards([]);

    setContactPickerAvailable(isContactPickerSupported());

    // Load stored recipient address
    setLoadingAddress(true);
    fetch(`/api/profile-addresses?profileId=${profileId}`)
      .then(r => r.json())
      .then(data => {
        if (data.address) {
          setAddress({ recipientName: profileName, street: data.address.street, city: data.address.city, state: data.address.state, zip: data.address.zip });
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

    // Load prefs + categories + fonts
    fetch('/api/card-preferences')
      .then(r => r.json())
      .then(data => {
        setNeedsOnboarding(data.preferences === null);
        if (data.categories?.length) setCategories(data.categories);
        if (data.fonts?.length) {
          setFonts(data.fonts);
          const savedFontId = data.preferences?.fontId;
          const savedFont = savedFontId ? data.fonts.find((f: HandwryttenFont) => f.label === savedFontId) : null;
          setSelectedFont(savedFont || data.fonts[0]);
        }
        if (data.preferences?.signOff) {
          setSignOff(data.preferences.signOff);
        }
        if (data.preferences?.senderName) {
          setSenderAddress({
            senderName: data.preferences.senderName,
            senderAddress1: data.preferences.senderAddress1 || '',
            senderCity: data.preferences.senderCity || '',
            senderState: data.preferences.senderState || '',
            senderZip: data.preferences.senderZip || '',
          });
        }
      })
      .catch(console.error);

    // Load credit balance
    fetch('/api/card-credits')
      .then(r => r.json())
      .then(data => setCreditBalance(data.balance ?? 0))
      .catch(console.error);
  }, [isOpen, profileId, profileName, daysUntil]);

  // Load cards when category changes
  useEffect(() => {
    if (selectedCategory === null) return;
    setLoadingCards(true);
    setCards([]);
    fetch(`/api/card-preferences/cards?category_id=${selectedCategory}`)
      .then(r => r.json())
      .then(data => { if (data.cards?.length) setCards(data.cards); })
      .catch(console.error)
      .finally(() => setLoadingCards(false));
  }, [selectedCategory]);

  // Auto-select category based on eventType
  useEffect(() => {
    if (categories.length === 0 || selectedCategory !== null) return;
    const match = categories.find(c => c.name.toLowerCase() === eventType.toLowerCase());
    const everyday = categories.find(c => c.name.toLowerCase() === 'everyday');
    setSelectedCategory(match?.id ?? everyday?.id ?? categories[0].id);
  }, [categories, selectedCategory, eventType]);

  // Dynamically load selected font
  useEffect(() => {
    if (!selectedFont?.path || !selectedFont?.font_name) return;
    setFontLoaded(false);
    const fontFace = new FontFace(`hw-${selectedFont.font_name}`, `url(${selectedFont.path})`);
    fontFace.load().then(loaded => { document.fonts.add(loaded); setFontLoaded(true); })
      .catch(err => { console.warn('Font load failed:', err); setFontLoaded(false); });
  }, [selectedFont?.path, selectedFont?.font_name]);

  // ---------- Handlers ----------
  const handlePickContact = async () => {
    setPickingContact(true);
    try {
      const contact = await pickContact();
      if (contact) {
        setAddress({ recipientName: contact.name || profileName, street: contact.street, city: contact.city, state: contact.state, zip: contact.zip });
        setAddressSource('picked');
      }
    } finally {
      setPickingContact(false);
    }
  };

  const handleSaveNotes = useCallback(async (content: string) => {
    try {
      await fetch(`/api/profiles/${profileId}/notes`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
    } catch (err) { console.error('Save notes error:', err); }
  }, [profileId]);

  const handleGenerateMessage = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/card-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileName, eventType, daysUntil,
          notes: notes || undefined,
          additionalContext: additionalContext || undefined,
          isLate, charLimit, tone,
          senderName: senderAddress.senderName || undefined,
          signOff: signOff || undefined,
        }),
      });
      const data = await res.json();
      if (data.message) setMessage(data.message);
    } catch (err) { console.error('Card assist error:', err); }
    finally { setGenerating(false); }
  }, [profileName, eventType, daysUntil, notes, additionalContext, isLate, charLimit, tone, senderAddress.senderName, signOff]);

  const handleSaveSenderAddress = async () => {
    try {
      await fetch('/api/card-preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(senderAddress) });
    } catch (err) { console.error('Save sender address error:', err); }
  };

  const handleContinueToConfirm = async () => {
    // Save recipient address if requested
    if (saveAddress && addressSource !== 'stored') {
      try {
        await fetch('/api/profile-addresses', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId, street: address.street, city: address.city, state: address.state, zip: address.zip }),
        });
        setAddressSource('stored');
      } catch (err) { console.error('Save address error:', err); }
    }
    // Auto-save sender address if it was just entered
    if (senderValid) {
      handleSaveSenderAddress();
    }
    setStep('confirm');
  };

  const handleCreditRefresh = async () => {
    const res = await fetch('/api/card-credits');
    const data = await res.json();
    if (typeof data.balance === 'number') setCreditBalance(data.balance);
  };

  const handleSend = async () => {
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch('/api/handwritten-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId, eventId: eventId ?? undefined,
          recipientName: address.recipientName, recipientStreet: address.street,
          recipientCity: address.city, recipientState: address.state, recipientZip: address.zip,
          message,
          fontId: selectedFont?.label ?? '',
          cardId: selectedCard ? String(selectedCard.id) : '',
          senderName: senderAddress.senderName, senderAddress1: senderAddress.senderAddress1,
          senderCity: senderAddress.senderCity, senderState: senderAddress.senderState, senderZip: senderAddress.senderZip,
          daysUntil,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.code === 'NO_CREDITS' ? 'You have no card credits remaining. Add more credits in Settings.' : data.detail || data.error || 'Something went wrong sending the card.');
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

  const handleOnboardingComplete = async () => {
    setNeedsOnboarding(false);
    // Re-fetch preferences + credits now that onboarding saved them
    try {
      const [prefsRes, creditsRes] = await Promise.all([
        fetch('/api/card-preferences'),
        fetch('/api/card-credits'),
      ]);
      const prefsData = await prefsRes.json();
      const creditsData = await creditsRes.json();
      if (prefsData.preferences?.signOff) setSignOff(prefsData.preferences.signOff);
      if (prefsData.preferences?.senderName) {
        setSenderAddress({
          senderName: prefsData.preferences.senderName,
          senderAddress1: prefsData.preferences.senderAddress1 || '',
          senderCity: prefsData.preferences.senderCity || '',
          senderState: prefsData.preferences.senderState || '',
          senderZip: prefsData.preferences.senderZip || '',
        });
      }
      if (typeof creditsData.balance === 'number') setCreditBalance(creditsData.balance);
    } catch (err) { console.error('Post-onboarding refresh error:', err); }
  };

  if (!isOpen) return null;

  const firstName = profileName.split(' ')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col" padding="none">
        <CardHeader className="flex flex-row items-center justify-between flex-shrink-0 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-t-2xl px-4 py-3 mb-0">
          <CardTitle className="flex items-center gap-2 text-white">
            <Mail className="w-5 h-5" />
            Send a Handwritten Card
          </CardTitle>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-4 space-y-4">
          {/* Onboarding for first-time users */}
          {needsOnboarding === true ? (
            <CardOnboarding
              userName={userName}
              onComplete={handleOnboardingComplete}
              onClose={onClose}
            />
          ) : needsOnboarding === null ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
          <>
          {/* Person info strip */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Avatar src={profilePicture} name={profileName} size="md" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{profileName}</p>
              <p className="text-sm text-gray-500 capitalize">{eventType}</p>
            </div>
          </div>

          {/* Steps */}
          {step === 'pick-card' && (
            <PickCardStep
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={id => { setSelectedCategory(id); setSelectedCard(null); }}
              cards={cards}
              loadingCards={loadingCards}
              selectedCard={selectedCard}
              onSelectCard={setSelectedCard}
              onContinue={() => setStep('compose')}
            />
          )}

          {step === 'compose' && (
            <ComposeStep
              firstName={firstName}
              notes={notes}
              onNotesChange={setNotes}
              onNotesSave={handleSaveNotes}
              loadingNotes={loadingNotes}
              additionalContext={additionalContext}
              onAdditionalContextChange={setAdditionalContext}
              daysUntil={daysUntil}
              isLate={isLate}
              onIsLateChange={setIsLate}
              tone={tone}
              onToneChange={setTone}
              message={message}
              onMessageChange={setMessage}
              charLimit={charLimit}
              generating={generating}
              onGenerate={handleGenerateMessage}
              onBack={() => setStep('pick-card')}
              onContinue={() => setStep('preview')}
            />
          )}

          {step === 'preview' && selectedCard && (
            <PreviewStep
              selectedCard={selectedCard}
              message={message}
              charLimit={charLimit}
              fonts={fonts}
              selectedFont={selectedFont}
              onSelectFont={setSelectedFont}
              fontLoaded={fontLoaded}
              onBack={() => setStep('compose')}
              onContinue={() => setStep('address')}
            />
          )}

          {step === 'address' && (
            <AddressStep
              firstName={firstName}
              address={address}
              onAddressChange={update => setAddress(a => ({ ...a, ...update }))}
              addressSource={addressSource}
              loadingAddress={loadingAddress}
              contactPickerAvailable={contactPickerAvailable}
              pickingContact={pickingContact}
              onPickContact={handlePickContact}
              saveAddress={saveAddress}
              onSaveAddressChange={setSaveAddress}
              senderAddress={senderAddress}
              onSenderChange={update => setSenderAddress(a => ({ ...a, ...update }))}
              senderValid={senderValid}
              daysUntil={daysUntil}
              onBack={() => setStep('preview')}
              onContinue={handleContinueToConfirm}
            />
          )}

          {step === 'confirm' && selectedCard && (
            <ConfirmStep
              selectedCard={selectedCard}
              selectedFont={selectedFont}
              address={address}
              senderAddress={senderAddress}
              onSenderChange={update => setSenderAddress(a => ({ ...a, ...update }))}
              senderValid={senderValid}
              onSaveSender={handleSaveSenderAddress}
              creditBalance={creditBalance}
              onCreditRefresh={handleCreditRefresh}
              sending={sending}
              sendError={sendError}
              onSend={handleSend}
              onBack={() => setStep('address')}
              daysUntil={daysUntil}
            />
          )}

          {step === 'success' && (
            <SuccessStep
              firstName={firstName}
              creditBalance={creditBalance}
              onClose={onClose}
            />
          )}
          </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
