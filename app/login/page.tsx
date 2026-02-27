'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Mail, ArrowLeft, CheckCircle, KeyRound } from 'lucide-react';

const LAST_EMAIL_KEY = 'circledays_last_email';

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    error === 'expired' ? 'This link has expired. Please request a new one.' :
      error === 'invalid' ? 'Invalid link. Please request a new one.' :
        error === 'failed' ? 'Something went wrong. Please try again.' :
          null
  );

  const codeInputRef = useRef<HTMLInputElement>(null);

  // Load last used email from localStorage on mount
  useEffect(() => {
    const lastEmail = localStorage.getItem(LAST_EMAIL_KEY);
    if (lastEmail) {
      setEmail(lastEmail);
    }
  }, []);

  // Focus code input when sent
  useEffect(() => {
    if (sent && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [sent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send magic link');
      }

      // Remember this email for next time
      localStorage.setItem(LAST_EMAIL_KEY, email);
      setSent(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setErrorMessage('Please enter the 6-digit code');
      return;
    }

    setVerifying(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid code');
      }

      // Redirect to appropriate page
      router.push(data.redirect);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Verification failed');
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setCode('');
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend');
      }

      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to resend');
    } finally {
      setLoading(false);
    }
  };

  // Format code input - only allow digits
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-cream to-teal-50 flex flex-col">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">C</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-900">
              {sent ? 'Check your email' : 'Welcome back'}
            </h1>
            <p className="text-gray-600 mt-2">
              {sent
                ? `We sent a magic link to ${email}`
                : 'Sign in with your email to continue'
              }
            </p>
          </div>

          <Card padding="lg">
            {sent ? (
              <div className="space-y-6">
                {/* Success indicator */}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-teal-600" />
                  </div>
                  <p className="text-sm text-gray-600">
                    Click the link in your email, or enter the 6-digit code below.
                  </p>
                </div>

                {/* Code Entry */}
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

                {/* Actions */}
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
                    onClick={() => {
                      setSent(false);
                      setCode('');
                      setErrorMessage(null);
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Use a different email
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
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

                <Button
                  type="submit"
                  className="w-full"
                  loading={loading}
                  disabled={!email}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Magic Link
                </Button>
              </form>
            )}
          </Card>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
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

