'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { StripeCheckoutModal } from '@/components/StripeCheckoutModal';
import { CREDIT_BUNDLES } from '@/lib/constants';
import { PenLine, Mail, Heart, ChevronLeft } from 'lucide-react';

type Page = 'welcome' | 'setup' | 'credits';

interface CardOnboardingProps {
  userName: string;
  onComplete: () => void;
  onClose: () => void;
}

export function CardOnboarding({ userName, onComplete, onClose }: CardOnboardingProps) {
  const firstName = userName.split(' ')[0] || '';

  const [page, setPage] = useState<Page>('welcome');

  // Setup state
  const [signOff, setSignOff] = useState(firstName);
  const [customSignOff, setCustomSignOff] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [senderName, setSenderName] = useState(userName);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [saving, setSaving] = useState(false);

  // Credits state
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  const [checkoutBundleId, setCheckoutBundleId] = useState<string | null>(null);

  const signOffOptions = [
    firstName,
    `Warmly, ${firstName}`,
    `Love, ${firstName}`,
    `Cheers, ${firstName}`,
  ];

  const activeSignOff = isCustom ? customSignOff : signOff;

  const addressValid =
    senderName.trim().length > 0 &&
    street.trim().length > 0 &&
    city.trim().length > 0 &&
    state.trim().length > 0 &&
    /^\d{5}$/.test(zip.trim());

  const setupValid = activeSignOff.trim().length > 0 && addressValid;

  const handleSaveSetup = async () => {
    setSaving(true);
    try {
      await fetch('/api/card-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signOff: activeSignOff,
          senderName,
          senderAddress1: street,
          senderCity: city,
          senderState: state,
          senderZip: zip,
        }),
      });
      setPage('credits');
    } catch (err) {
      console.error('Save preferences error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePurchaseSuccess = () => {
    setCheckoutBundleId(null);
    onComplete();
  };

  // ——— Welcome page ———
  if (page === 'welcome') {
    const features = [
      {
        icon: <PenLine className="w-5 h-5 text-teal-600" />,
        title: 'Written with real pen & ink',
        desc: 'Your message, penned in a handwriting style you choose. Not printed — actually written.',
      },
      {
        icon: <Mail className="w-5 h-5 text-teal-600" />,
        title: 'Timed to arrive on their day',
        desc: 'Send a card weeks ahead — we\u2019ll time delivery so it arrives right on their special day.',
      },
      {
        icon: <Heart className="w-5 h-5 text-teal-600" />,
        title: 'The gesture people remember',
        desc: 'In a world of quick texts, a real card on the doorstep means the world.',
      },
    ];

    return (
      <div className="flex flex-col items-center text-center space-y-6 py-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            The card they&apos;ll keep
          </h3>
          <p className="text-base text-gray-500 mt-2 leading-relaxed">
            You remembered their day. Now send something they&apos;ll treasure — a real handwritten card.
          </p>
        </div>

        <div className="w-full text-left space-y-4">
          {features.map((f) => (
            <div key={f.title} className="flex items-start gap-3 px-2">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                {f.icon}
              </div>
              <div>
                <p className="text-base font-medium text-gray-900">{f.title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-400">$5 per card, purchased as credits</p>

        <div className="w-full space-y-2">
          <Button
            className="w-full text-base bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
            onClick={() => setPage('setup')}
          >
            Get Started
          </Button>
          <button
            onClick={onClose}
            className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    );
  }

  // ——— Setup page ———
  if (page === 'setup') {
    return (
      <div className="space-y-4">
        <button onClick={() => setPage('welcome')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <h3 className="text-base font-semibold text-gray-900">Personalize your cards</h3>

        {/* Sign-off picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            How should we sign your cards?
          </label>
          <p className="text-xs text-gray-400 mb-2">Used when AI drafts messages for you</p>
          <div className="flex gap-2 flex-wrap">
            {signOffOptions.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => { setSignOff(opt); setIsCustom(false); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  !isCustom && signOff === opt
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsCustom(true)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isCustom
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Custom...
            </button>
          </div>
          {isCustom && (
            <Input
              value={customSignOff}
              onChange={e => setCustomSignOff(e.target.value)}
              placeholder={`e.g. Best wishes, ${firstName}`}
              className="mt-2"
            />
          )}
        </div>

        {/* Return address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your return address</label>
          <p className="text-xs text-gray-400 mb-2">Printed on the back of every card</p>
          <div className="space-y-3">
            <Input
              label="Name"
              value={senderName}
              onChange={e => setSenderName(e.target.value)}
              placeholder="Full name"
              autoComplete="name"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Street address</label>
              <AddressAutocomplete
                value={street}
                onChange={v => setStreet(v)}
                onPlaceSelect={parsed => {
                  setStreet(parsed.street);
                  if (parsed.city) setCity(parsed.city);
                  if (parsed.state) setState(parsed.state);
                  if (parsed.zip) setZip(parsed.zip);
                }}
                placeholder="123 Main St"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="City"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="City"
                autoComplete="address-level2"
              />
              <Input
                label="State"
                value={state}
                onChange={e => setState(e.target.value)}
                placeholder="CA"
                autoComplete="address-level1"
              />
            </div>
            <Input
              label="ZIP code"
              value={zip}
              onChange={e => setZip(e.target.value)}
              placeholder="12345"
              maxLength={5}
              autoComplete="postal-code"
              inputMode="numeric"
            />
          </div>
        </div>

        <Button
          className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
          onClick={handleSaveSetup}
          disabled={!setupValid}
          loading={saving}
        >
          Continue
        </Button>
      </div>
    );
  }

  // ——— Credits page ———
  return (
    <div className="space-y-4">
      <button onClick={() => setPage('setup')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      <div className="text-center space-y-1">
        <h3 className="text-base font-semibold text-gray-900">Stock your card drawer</h3>
        <p className="text-sm text-gray-500">
          Each card costs 1 credit. Buy a few now to have them ready.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {CREDIT_BUNDLES.map(bundle => {
          const isSelected = selectedBundle === bundle.id;
          return (
            <button
              key={bundle.id}
              type="button"
              onClick={() => setSelectedBundle(bundle.id)}
              className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center ${
                isSelected
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50/50'
              }`}
            >
              <span className="font-semibold text-gray-900 text-sm">{bundle.label}</span>
              <span className="text-base font-bold text-teal-700 mt-1">${bundle.priceUsd.toFixed(2)}</span>
            </button>
          );
        })}
      </div>

      <Button
        className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
        onClick={() => selectedBundle && setCheckoutBundleId(selectedBundle)}
        disabled={!selectedBundle}
      >
        Buy Credits
      </Button>

      <button
        onClick={onComplete}
        className="w-full text-sm text-gray-400 hover:text-gray-600 py-1 transition-colors"
      >
        Skip for now
      </button>

      <StripeCheckoutModal
        bundleId={checkoutBundleId}
        onSuccess={handlePurchaseSuccess}
        onClose={() => setCheckoutBundleId(null)}
        returnPath="/dashboard?credits=added"
      />
    </div>
  );
}
