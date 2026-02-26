'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';
import { X } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface StripeCheckoutModalProps {
  bundleId: string | null;
  onSuccess: () => void;
  onClose: () => void;
}

export function StripeCheckoutModal({ bundleId, onSuccess, onClose }: StripeCheckoutModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollYRef = useRef(0);

  // Save scroll position when modal opens, restore when it closes
  useEffect(() => {
    if (bundleId) {
      scrollYRef.current = window.scrollY;
    } else {
      window.scrollTo({ top: scrollYRef.current, behavior: 'instant' });
    }
  }, [bundleId]);

  const fetchClientSecret = useCallback(async () => {
    if (!bundleId) return;
    setClientSecret(null);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId }),
      });
      const data = await res.json();
      if (res.ok && data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        setError(data.error || 'Failed to start checkout. Please try again.');
      }
    } catch {
      setError('Failed to start checkout. Please try again.');
    }
  }, [bundleId]);

  useEffect(() => {
    fetchClientSecret();
  }, [fetchClientSecret]);

  if (!bundleId) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {error ? (
          <div className="p-8 text-center">
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button
              onClick={fetchClientSecret}
              className="text-sm text-teal-600 underline"
            >
              Try again
            </button>
          </div>
        ) : !clientSecret ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="p-4">
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{
                clientSecret,
                onComplete: onSuccess,
              }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </div>
    </div>
  );
}
