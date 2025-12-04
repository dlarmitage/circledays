'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    error === 'expired' ? 'This link has expired. Please request a new one.' :
    error === 'invalid' ? 'Invalid link. Please request a new one.' :
    error === 'failed' ? 'Something went wrong. Please try again.' :
    null
  );
  
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
      
      setSent(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
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
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-teal-600" />
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  Click the link in your email to sign in. The link expires in 15 minutes.
                </p>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSent(false);
                    setEmail('');
                  }}
                >
                  Use a different email
                </Button>
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
