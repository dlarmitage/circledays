'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Users, Mail, Search, ArrowRight, ArrowLeft } from 'lucide-react';

const steps = [
  {
    icon: Users,
    title: 'Your circle, set up once',
    body: "Every one of us has a network of family and friends whose birthdays, anniversaries, and special days we don't want to miss. The problem? We each maintain our own separate lists — duplicating work that overlaps heavily with the people closest to us.",
    highlight: 'With CircleDays, each person is set up just once. When your brother adds your mom, she\'s already there for you too.',
  },
  {
    icon: Mail,
    title: 'Cards that actually get sent',
    body: "We all have the best intentions about sending birthday cards. But finding a card, writing it, getting a stamp, addressing the envelope — it just never seems to happen.",
    highlight: 'CircleDays lets you send real, handwritten cards in under a minute. Personal messages, penned in ink, delivered to their door.',
  },
  {
    icon: Search,
    title: 'Grow your circle fast',
    body: "The fastest way to get started? Go to My Circle, find someone you know, and explore their connections. If your brother and sister are in your circle, many of their connections are probably people you want in yours too.",
    highlight: 'Of course, you can also search by name or add someone new — it\'s quick and simple.',
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  async function handleGetStarted() {
    setLoading(true);
    await fetch('/api/users/me/welcome', { method: 'POST' });
    router.push('/dashboard');
  }

  function handleNext() {
    if (isLast) {
      handleGetStarted();
    } else {
      setCurrentStep(currentStep + 1);
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  const Icon = step.icon;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <img
            src="/icons/touch-icon-96x96.png"
            alt="CircleDays"
            className="w-12 h-12 rounded-xl"
          />
          <span className="font-display text-2xl font-bold text-teal-600">CircleDays</span>
        </div>

        {/* Step indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep ? 'w-8 bg-teal-500' : 'w-2 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-50 mb-6">
          <Icon className="w-8 h-8 text-teal-600" />
        </div>

        {/* Content */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          {step.title}
        </h1>

        <p className="text-lg text-gray-600 mb-6 leading-relaxed">
          {step.body}
        </p>

        <p className="text-lg font-medium text-teal-700 mb-10 leading-relaxed">
          {step.highlight}
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-3">
          {currentStep > 0 && (
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          <Button size="lg" onClick={handleNext} loading={loading}>
            {isLast ? 'Get Started' : 'Next'}
            {!isLast && <ArrowRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>

        {/* Skip link */}
        {!isLast && (
          <button
            onClick={handleGetStarted}
            className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip intro
          </button>
        )}
      </div>
    </div>
  );
}
