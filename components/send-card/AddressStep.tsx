'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ChevronLeft, BookUser, MapPin } from 'lucide-react';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import type { AddressData, SenderAddress } from './types';

interface AddressStepProps {
  firstName: string;
  address: AddressData;
  onAddressChange: (update: Partial<AddressData>) => void;
  addressSource: 'stored' | 'picked' | 'manual' | null;
  loadingAddress: boolean;
  contactPickerAvailable: boolean;
  pickingContact: boolean;
  onPickContact: () => void;
  saveAddress: boolean;
  onSaveAddressChange: (val: boolean) => void;
  senderAddress: SenderAddress;
  onSenderChange: (update: Partial<SenderAddress>) => void;
  senderValid: boolean;
  daysUntil?: number;
  onBack: () => void;
  onContinue: () => void;
}

export function AddressStep({
  firstName,
  address,
  onAddressChange,
  addressSource,
  loadingAddress,
  contactPickerAvailable,
  pickingContact,
  onPickContact,
  saveAddress,
  onSaveAddressChange,
  senderAddress,
  onSenderChange,
  senderValid,
  daysUntil,
  onBack,
  onContinue,
}: AddressStepProps) {
  const addressValid =
    address.recipientName.trim().length > 0 &&
    address.street.trim().length > 0 &&
    address.city.trim().length > 0 &&
    address.state.trim().length > 0 &&
    /^\d{5}$/.test(address.zip.trim());

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft className="w-4 h-4" />
        Back to preview
      </button>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Where should we send the card?</p>

        {loadingAddress ? (
          <div className="text-sm text-gray-400 text-center py-4">Loading saved address...</div>
        ) : (
          <>
            {contactPickerAvailable && (
              <button
                onClick={onPickContact}
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

            <div className="space-y-3">
              <Input
                label="Recipient name"
                value={address.recipientName}
                onChange={e => onAddressChange({ recipientName: e.target.value })}
                placeholder="Full name"
                autoComplete="name"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Street address</label>
                <AddressAutocomplete
                  value={address.street}
                  onChange={v => onAddressChange({ street: v })}
                  onPlaceSelect={parsed => {
                    const update: Partial<AddressData> = { street: parsed.street };
                    if (parsed.city) update.city = parsed.city;
                    if (parsed.state) update.state = parsed.state;
                    if (parsed.zip) update.zip = parsed.zip;
                    onAddressChange(update);
                  }}
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="City"
                  value={address.city}
                  onChange={e => onAddressChange({ city: e.target.value })}
                  placeholder="City"
                  autoComplete="address-level2"
                />
                <Input
                  label="State"
                  value={address.state}
                  onChange={e => onAddressChange({ state: e.target.value })}
                  placeholder="CA"
                  autoComplete="address-level1"
                />
              </div>
              <Input
                label="ZIP code"
                value={address.zip}
                onChange={e => onAddressChange({ zip: e.target.value })}
                placeholder="12345"
                maxLength={5}
                autoComplete="postal-code"
                inputMode="numeric"
              />
            </div>

            {addressSource !== 'stored' && (
              <label className="flex items-center gap-2 mt-3 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={e => onSaveAddressChange(e.target.checked)}
                  className="rounded"
                />
                Save this address for {firstName}
                <span className="text-xs text-gray-400">(stored privately)</span>
              </label>
            )}
          </>
        )}
      </div>

      {/* Sender/return address — only shown if user has never saved one */}
      {!senderValid && (
        <div className="p-4 bg-gray-50 rounded-xl space-y-3">
          <p className="text-sm font-medium text-gray-700">We&apos;ll need your return address</p>
          <div className="space-y-2">
            <Input
              label="Your name"
              value={senderAddress.senderName}
              onChange={e => onSenderChange({ senderName: e.target.value })}
              placeholder="Your full name"
            />
            <Input
              label="Street"
              value={senderAddress.senderAddress1}
              onChange={e => onSenderChange({ senderAddress1: e.target.value })}
              placeholder="123 Your St"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="City"
                value={senderAddress.senderCity}
                onChange={e => onSenderChange({ senderCity: e.target.value })}
                placeholder="City"
              />
              <Input
                label="State"
                value={senderAddress.senderState}
                onChange={e => onSenderChange({ senderState: e.target.value })}
                placeholder="CA"
              />
            </div>
            <Input
              label="ZIP"
              value={senderAddress.senderZip}
              onChange={e => onSenderChange({ senderZip: e.target.value })}
              placeholder="12345"
              maxLength={5}
              inputMode="numeric"
            />
          </div>
        </div>
      )}

      {daysUntil !== undefined && daysUntil < 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          This occasion has already passed. We&apos;ll acknowledge that in the message.
        </div>
      )}

      <Button
        className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
        onClick={onContinue}
        disabled={!addressValid}
      >
        Review &amp; Send
      </Button>
    </div>
  );
}
