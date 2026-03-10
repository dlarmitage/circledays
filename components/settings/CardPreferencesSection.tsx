'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { StripeCheckoutModal } from '@/components/StripeCheckoutModal';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { CREDIT_BUNDLES } from '@/lib/constants';
import { Mail, CreditCard } from 'lucide-react';

interface SenderAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface CardPreferencesSectionProps {
  firstName: string;
  cardCredits: number | null;
  cardSignOff: string;
  cardSignOffCustom: string;
  cardSignOffIsCustom: boolean;
  onSignOffSelect: (signOff: string) => void;
  onSignOffCustomToggle: () => void;
  onSignOffCustomChange: (value: string) => void;
  senderAddress: SenderAddress;
  onSenderAddressChange: (updates: Partial<SenderAddress>) => void;
  onSenderAddressPlaceSelect: (parsed: { street: string; city?: string; state?: string; zip?: string }) => void;
  checkoutBundleId: string | null;
  onCheckoutBundleSelect: (bundleId: string) => void;
  onPurchaseSuccess: () => void;
  onCheckoutClose: () => void;
}

export function CardPreferencesSection({
  firstName,
  cardCredits,
  cardSignOff,
  cardSignOffCustom,
  cardSignOffIsCustom,
  onSignOffSelect,
  onSignOffCustomToggle,
  onSignOffCustomChange,
  senderAddress,
  onSenderAddressChange,
  onSenderAddressPlaceSelect,
  checkoutBundleId,
  onCheckoutBundleSelect,
  onPurchaseSuccess,
  onCheckoutClose,
}: CardPreferencesSectionProps) {
  const signOffPresets = [
    firstName,
    `Warmly, ${firstName}`,
    `Love, ${firstName}`,
    `Cheers, ${firstName}`,
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-teal-600" />
          Handwritten Cards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Credit balance */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-teal-600" />
            <div>
              <p className="font-medium text-gray-900">
                {cardCredits !== null ? `${cardCredits} credit${cardCredits === 1 ? '' : 's'}` : '\u2014'}
              </p>
              <p className="text-xs text-gray-500">Each credit sends one card ($5 value)</p>
            </div>
          </div>
        </div>

        {/* Buy credits */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Buy credits</p>
          <div className="grid grid-cols-3 gap-2">
            {CREDIT_BUNDLES.map(bundle => (
              <button
                key={bundle.id}
                onClick={() => onCheckoutBundleSelect(bundle.id)}
                className="flex flex-col items-center p-3 rounded-xl border-2 border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition-all text-center"
              >
                <span className="font-semibold text-gray-900 text-sm">{bundle.label}</span>
                <span className="text-xs text-gray-500 mt-0.5">${bundle.priceUsd.toFixed(2)}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Secure checkout via Stripe. Credits are added immediately after payment.
          </p>
        </div>

        <StripeCheckoutModal
          bundleId={checkoutBundleId}
          onSuccess={onPurchaseSuccess}
          onClose={onCheckoutClose}
        />

        {/* Sign-off picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Card sign-off
          </label>
          <p className="text-xs text-gray-400 mb-2">Used when AI drafts card messages for you</p>
          <div className="flex gap-2 flex-wrap">
            {signOffPresets.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => onSignOffSelect(opt)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  !cardSignOffIsCustom && cardSignOff === opt
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt}
              </button>
            ))}
            <button
              type="button"
              onClick={onSignOffCustomToggle}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                cardSignOffIsCustom
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Custom...
            </button>
          </div>
          {cardSignOffIsCustom && (
            <Input
              value={cardSignOffCustom}
              onChange={e => onSignOffCustomChange(e.target.value)}
              placeholder={`e.g. Best wishes, ${firstName}`}
              className="mt-2"
            />
          )}
        </div>

        {/* Return address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Return address</label>
          <p className="text-xs text-gray-400 mb-2">Printed on the back of every card</p>
          <div className="space-y-3">
            <Input
              label="Name"
              value={senderAddress.name}
              onChange={e => onSenderAddressChange({ name: e.target.value })}
              placeholder="Full name"
              autoComplete="name"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Street address</label>
              <AddressAutocomplete
                value={senderAddress.street}
                onChange={v => onSenderAddressChange({ street: v })}
                onPlaceSelect={onSenderAddressPlaceSelect}
                placeholder="123 Main St"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="City"
                value={senderAddress.city}
                onChange={e => onSenderAddressChange({ city: e.target.value })}
                placeholder="City"
                autoComplete="address-level2"
              />
              <Input
                label="State"
                value={senderAddress.state}
                onChange={e => onSenderAddressChange({ state: e.target.value })}
                placeholder="CA"
                autoComplete="address-level1"
              />
            </div>
            <Input
              label="ZIP code"
              value={senderAddress.zip}
              onChange={e => onSenderAddressChange({ zip: e.target.value })}
              placeholder="12345"
              maxLength={5}
              autoComplete="postal-code"
              inputMode="numeric"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
