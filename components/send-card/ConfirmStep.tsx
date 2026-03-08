'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ChevronLeft, Send, Clock, Zap, Calendar } from 'lucide-react';
import { CREDIT_BUNDLES } from '@/lib/constants';
import { StripeCheckoutModal } from '@/components/StripeCheckoutModal';
import { useSendCard } from './SendCardContext';

function formatDateNice(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function minSendDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function ConfirmStep() {
  const {
    selectedCard,
    selectedFont,
    address,
    senderAddress,
    setSenderAddress,
    senderValid,
    handleSaveSenderAddress,
    creditBalance,
    handleCreditRefresh,
    sending,
    sendError,
    handleSend,
    setStep,
    daysUntil,
    deliveryOption,
    setDeliveryOption,
    customSendDate,
    setCustomSendDate,
    timedSendDate,
    eventDate,
  } = useSendCard();

  const [editingSender, setEditingSender] = useState(false);
  const [checkoutBundleId, setCheckoutBundleId] = useState<string | null>(null);

  const onSenderChange = (update: Partial<typeof senderAddress>) => {
    setSenderAddress(a => ({ ...a, ...update }));
  };

  const handlePurchaseSuccess = async () => {
    setCheckoutBundleId(null);
    handleCreditRefresh();
  };

  if (!selectedCard) return null;

  return (
    <div className="space-y-4">
      <button onClick={() => setStep('address')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft className="w-4 h-4" />
        Edit address
      </button>

      {/* Card + font summary */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
        <Image src={selectedCard.cover} alt={selectedCard.name} width={48} height={64} className="w-12 h-16 object-cover rounded border border-gray-200" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{selectedCard.name}</p>
          {selectedFont && <p className="text-xs text-gray-500">Font: {selectedFont.label}</p>}
        </div>
      </div>

      {/* Recipient address */}
      <div className="p-4 bg-gray-50 rounded-xl space-y-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sending to</p>
        <p className="font-medium text-gray-900">{address.recipientName}</p>
        <p className="text-sm text-gray-600">{address.street}</p>
        <p className="text-sm text-gray-600">{address.city}, {address.state} {address.zip}</p>
      </div>

      {/* Return address */}
      <div className="p-4 bg-gray-50 rounded-xl space-y-1">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Return address</p>
          <button
            onClick={() => setEditingSender(v => !v)}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium"
          >
            {editingSender ? 'Done' : 'Edit'}
          </button>
        </div>

        {editingSender ? (
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
            <Button variant="secondary" className="w-full" onClick={() => { handleSaveSenderAddress(); setEditingSender(false); }}>
              Save Return Address
            </Button>
          </div>
        ) : (
          <>
            <p className="font-medium text-gray-900">{senderAddress.senderName}</p>
            <p className="text-sm text-gray-600">{senderAddress.senderAddress1}</p>
            <p className="text-sm text-gray-600">{senderAddress.senderCity}, {senderAddress.senderState} {senderAddress.senderZip}</p>
          </>
        )}
      </div>

      {/* Delivery timing */}
      <div className="p-4 bg-gray-50 rounded-xl space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivery timing</p>
        <div className="space-y-2">
          {/* Send now */}
          <label
            className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
              deliveryOption === 'send_now'
                ? 'border-teal-500 bg-teal-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="delivery"
              checked={deliveryOption === 'send_now'}
              onChange={() => setDeliveryOption('send_now')}
              className="mt-0.5 accent-teal-600"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-teal-600" />
                <span className="text-sm font-medium text-gray-900">Send now</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Handwrytten writes and mails it right away (arrives in 3–5 business days)</p>
            </div>
          </label>

          {/* Timed delivery — only show if there's a linked event far enough out */}
          {timedSendDate && (
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                deliveryOption === 'timed'
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="delivery"
                checked={deliveryOption === 'timed'}
                onChange={() => setDeliveryOption('timed')}
                className="mt-0.5 accent-teal-600"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-600" />
                  <span className="text-sm font-medium text-gray-900">Timed delivery</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Mails on {formatDateNice(timedSendDate)} — timed to arrive for their special day
                </p>
              </div>
            </label>
          )}

          {/* Custom date */}
          <label
            className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
              deliveryOption === 'custom'
                ? 'border-teal-500 bg-teal-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="delivery"
              checked={deliveryOption === 'custom'}
              onChange={() => setDeliveryOption('custom')}
              className="mt-0.5 accent-teal-600"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                <span className="text-sm font-medium text-gray-900">Pick a send date</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Choose when Handwrytten should mail it</p>
              {deliveryOption === 'custom' && (
                <input
                  type="date"
                  value={customSendDate}
                  onChange={e => setCustomSendDate(e.target.value)}
                  min={minSendDate()}
                  className="mt-2 w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              )}
            </div>
          </label>
        </div>
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
        disabled={
          (creditBalance !== null && creditBalance < 1) ||
          !senderValid ||
          (deliveryOption === 'custom' && !customSendDate)
        }
      >
        <Send className="w-4 h-4 mr-2" />
        {deliveryOption === 'send_now' ? 'Send Card Now' : 'Schedule Card'} — 1 Credit
      </Button>
    </div>
  );
}
