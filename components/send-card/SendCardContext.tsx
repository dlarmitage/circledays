'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { isContactPickerSupported, pickContact } from '@/lib/hooks/useContactPicker';
import { DEFAULT_HANDWRYTTEN_CHAR_LIMIT } from '@/lib/constants';
import { isValidUSAddress } from '@/lib/validators';

import type { Step, AddressData, SenderAddress, HandwryttenCategory, HandwryttenCard, HandwryttenFont } from './types';

// ---------- Context shape ----------

interface SendCardContextValue {
  // Step
  step: Step;
  setStep: (step: Step) => void;

  // Onboarding
  needsOnboarding: boolean | null;
  handleOnboardingComplete: () => Promise<void>;

  // Address
  address: AddressData;
  setAddress: React.Dispatch<React.SetStateAction<AddressData>>;
  addressSource: 'stored' | 'picked' | 'manual' | null;
  setAddressSource: (source: 'stored' | 'picked' | 'manual' | null) => void;
  saveAddress: boolean;
  setSaveAddress: (val: boolean) => void;
  loadingAddress: boolean;

  // Contact picker
  contactPickerAvailable: boolean;
  pickingContact: boolean;

  // Card selection
  categories: HandwryttenCategory[];
  selectedCategory: number | null;
  setSelectedCategory: (id: number | null) => void;
  cards: HandwryttenCard[];
  loadingCards: boolean;
  selectedCard: HandwryttenCard | null;
  setSelectedCard: (card: HandwryttenCard | null) => void;

  // Font
  fonts: HandwryttenFont[];
  selectedFont: HandwryttenFont | null;
  setSelectedFont: (font: HandwryttenFont | null) => void;
  fontLoaded: boolean;

  // Compose
  notes: string;
  setNotes: (notes: string) => void;
  loadingNotes: boolean;
  additionalContext: string;
  setAdditionalContext: (ctx: string) => void;
  message: string;
  setMessage: (msg: string) => void;
  isLate: boolean;
  setIsLate: (val: boolean) => void;
  tone: string;
  setTone: (tone: string) => void;
  generating: boolean;

  // Sender address
  senderAddress: SenderAddress;
  setSenderAddress: React.Dispatch<React.SetStateAction<SenderAddress>>;
  senderValid: boolean;

  // Credits & sending
  creditBalance: number | null;
  sending: boolean;
  sendError: string | null;
  signOff: string;

  // Derived
  charLimit: number;
  firstName: string;
  daysUntil?: number;

  // Handlers
  handlePickContact: () => Promise<void>;
  handleSaveNotes: (content: string) => Promise<void>;
  handleGenerateMessage: () => Promise<void>;
  handleSaveSenderAddress: () => Promise<void>;
  handleContinueToConfirm: () => Promise<void>;
  handleCreditRefresh: () => Promise<void>;
  handleSend: () => Promise<void>;

  // Modal-level callbacks
  onClose: () => void;
}

const SendCardContext = createContext<SendCardContextValue | null>(null);

export function useSendCard(): SendCardContextValue {
  const ctx = useContext(SendCardContext);
  if (!ctx) {
    throw new Error('useSendCard must be used within a SendCardProvider');
  }
  return ctx;
}

// ---------- Provider ----------

interface SendCardProviderProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  profileName: string;
  eventType: string;
  daysUntil?: number;
  eventId?: string;
}

export function SendCardProvider({
  children,
  isOpen,
  onClose,
  profileId,
  profileName,
  eventType,
  daysUntil,
  eventId,
}: SendCardProviderProps) {
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

  const senderValid = isValidUSAddress({
    name: senderAddress.senderName,
    street: senderAddress.senderAddress1,
    city: senderAddress.senderCity,
    state: senderAddress.senderState,
    zip: senderAddress.senderZip,
  });

  const firstName = profileName.split(' ')[0];

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

  const value: SendCardContextValue = {
    step, setStep,
    needsOnboarding, handleOnboardingComplete,
    address, setAddress,
    addressSource, setAddressSource,
    saveAddress, setSaveAddress,
    loadingAddress,
    contactPickerAvailable, pickingContact,
    categories, selectedCategory, setSelectedCategory,
    cards, loadingCards, selectedCard, setSelectedCard,
    fonts, selectedFont, setSelectedFont, fontLoaded,
    notes, setNotes, loadingNotes,
    additionalContext, setAdditionalContext,
    message, setMessage,
    isLate, setIsLate,
    tone, setTone,
    generating,
    senderAddress, setSenderAddress,
    senderValid,
    creditBalance, sending, sendError, signOff,
    charLimit, firstName, daysUntil,
    handlePickContact, handleSaveNotes, handleGenerateMessage,
    handleSaveSenderAddress, handleContinueToConfirm, handleCreditRefresh, handleSend,
    onClose,
  };

  return (
    <SendCardContext.Provider value={value}>
      {children}
    </SendCardContext.Provider>
  );
}
