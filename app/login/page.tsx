'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Mail, ArrowLeft, CheckCircle, KeyRound, MessageSquare } from 'lucide-react';
import { isNativeApp } from '@/lib/capacitor';

const LAST_EMAIL_KEY = 'circledays_last_email';

type Step = 'email' | 'channel' | 'code';

const primaryButtonClass =
  'w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 transition-colors disabled:opacity-50';
const secondaryButtonClass =
  'w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors disabled:opacity-50';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [channel, setChannel] = useState<'email' | 'sms' | null>(null);
  const [phoneMasked, setPhoneMasked] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    error === 'expired' ? 'This link has expired. Please request a new one.' :
      error === 'invalid' ? 'Invalid link. Please request a new one.' :
        error === 'failed' ? 'Something went wrong. Please try again.' :
          null
  );

  const codeInputRef = useRef<HTMLInputElement>(null);
  const verifyingRef = useRef(false);

  useEffect(() => {
    const lastEmail = localStorage.getItem(LAST_EMAIL_KEY);
    if (lastEmail) setEmail(lastEmail);
  }, []);

  useEffect(() => {
    if (step === 'code' && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [step]);

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (step === 'code' && code.length === 6 && !verifyingRef.current) {
      void submitCode(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);

  const buildPayload = (extra: Record<string, string> = {}) => {
    const payload: Record<string, string> = { email, ...extra };
    if (isNativeApp()) payload.platform = 'ios';
    return payload;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send login code');

      localStorage.setItem(LAST_EMAIL_KEY, email);

      if (data.trusted && data.redirect) {
        window.location.href = data.redirect;
        return;
      }
      if (data.needsChannel) {
        setPhoneMasked(data.phoneMasked || null);
        setStep('channel');
        return;
      }
      if (data.sent) {
        setChannel(data.channel || 'email');
        if (data.phoneMasked) setPhoneMasked(data.phoneMasked);
        setStep('code');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send login code');
    } finally {
      setLoading(false);
    }
  };

  const handleChannelSelect = async (selected: 'email' | 'sms') => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload({ channel: selected })),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send login code');

      setChannel(selected);
      if (data.phoneMasked) setPhoneMasked(data.phoneMasked);
      setStep('code');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send login code');
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async (value: string) => {
    if (value.length !== 6 || verifyingRef.current) return;
    verifyingRef.current = true;
    setVerifying(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');

      window.location.href = data.redirect;
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Verification failed');
      setCode('');
      verifyingRef.current = false;
      setVerifying(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setErrorMessage('Please enter the 6-digit code');
      return;
    }
    await submitCode(code);
  };

  const handleResend = async () => {
    setCode('');
    setErrorMessage(null);
    setLoading(true);
    try {
      const extra: Record<string, string> = {};
      if (channel) extra.channel = channel;
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(extra)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend');
      if (data.needsChannel) {
        setPhoneMasked(data.phoneMasked || null);
        setStep('channel');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to resend');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    setErrorMessage(null);
  };

  const resetToEmail = () => {
    setStep('email');
    setCode('');
    setChannel(null);
    setPhoneMasked(null);
    setErrorMessage(null);
    verifyingRef.current = false;
  };

  const title =
    step === 'email' ? 'Welcome back' :
      step === 'channel' ? 'Choose how to receive your code' :
        channel === 'sms' ? 'Check your texts' : 'Check your email';

  const subtitle =
    step === 'email' ? 'Sign in with your email to continue' :
      step === 'channel' ? `How would you like to receive your login code for ${email}?` :
        channel === 'sms'
          ? `We texted a code to ${phoneMasked || 'your phone'}`
          : `We sent a code to ${email}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-cream to-teal-50 flex flex-col">
      <header className="container mx-auto px-4 py-6">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">C</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-gray-600 mt-2 text-sm leading-relaxed">{subtitle}</p>
          </div>

          <Card padding="lg">
            {step === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <Input
                  type="email"
                  label="Email address"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  error={errorMessage || undefined}
                />
                <Button type="submit" className="w-full" loading={loading} disabled={!email}>
                  <Mail className="w-4 h-4 mr-2" />
                  Continue
                </Button>
              </form>
            )}

            {step === 'channel' && (
              <div className="space-y-3">
                {errorMessage && (
                  <p className="text-sm text-coral-600 text-center">{errorMessage}</p>
                )}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleChannelSelect('email')}
                  className={primaryButtonClass}
                >
                  <Mail className="w-4 h-4" />
                  Email me the code
                </button>
                <button
                  type="button"
                  disabled={loading || !phoneMasked}
                  onClick={() => handleChannelSelect('sms')}
                  className={secondaryButtonClass}
                >
                  <MessageSquare className="w-4 h-4" />
                  Text me at {phoneMasked}
                </button>
                <button
                  type="button"
                  onClick={resetToEmail}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 pt-2"
                >
                  Use a different email
                </button>
                <p className="text-center text-xs text-gray-400 pt-2">
                  By continuing, you agree to our terms of service and privacy policy.
                </p>
              </div>
            )}

            {step === 'code' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-teal-600" />
                  </div>
                  <p className="text-sm text-gray-600">
                    Enter the 6-digit code{channel === 'sms' ? ' from your text message' : ' from your email'} below.
                  </p>
                </div>

                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                      Verification Code
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <KeyRound className="w-5 h-5" />
                      </div>
                      <input
                        ref={codeInputRef}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="one-time-code"
                        data-1p-ignore
                        data-lpignore="true"
                        value={code}
                        onChange={handleCodeChange}
                        placeholder="000000"
                        className="w-full pl-11 pr-4 py-4 text-center text-2xl font-mono tracking-[0.5em] border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                        maxLength={6}
                      />
                    </div>
                    {errorMessage && (
                      <p className="text-sm text-coral-600 mt-2 text-center">{errorMessage}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    loading={verifying}
                    disabled={code.length !== 6}
                  >
                    Verify Code
                  </Button>
                </form>

                <div className="flex flex-col items-center gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="text-sm text-teal-600 hover:text-teal-700 font-medium disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Resend code'}
                  </button>
                  <button
                    type="button"
                    onClick={resetToEmail}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Use a different email
                  </button>
                </div>
              </div>
            )}
          </Card>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/login" className="text-teal-600 hover:underline font-medium">
              Sign up for free
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-cream to-teal-50 flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginContent />
    </Suspense>
  );
}
