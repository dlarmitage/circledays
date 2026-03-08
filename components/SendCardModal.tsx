'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { X, Mail } from 'lucide-react';

import { SendCardProvider, useSendCard } from './send-card/SendCardContext';
import { CardOnboarding } from './send-card/CardOnboarding';
import { PickCardStep } from './send-card/PickCardStep';
import { ComposeStep } from './send-card/ComposeStep';
import { PreviewStep } from './send-card/PreviewStep';
import { AddressStep } from './send-card/AddressStep';
import { ConfirmStep } from './send-card/ConfirmStep';
import { SuccessStep } from './send-card/SuccessStep';

interface SendCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  profileName: string;
  profilePicture: string | null;
  eventType: string;
  daysUntil?: number;
  eventDate?: string;
  eventId?: string;
  userName?: string;
}

export function SendCardModal({
  isOpen,
  onClose,
  profileId,
  profileName,
  profilePicture,
  eventType,
  daysUntil,
  eventDate,
  eventId,
  userName = '',
}: SendCardModalProps) {
  if (!isOpen) return null;

  return (
    <SendCardProvider
      isOpen={isOpen}
      onClose={onClose}
      profileId={profileId}
      profileName={profileName}
      eventType={eventType}
      daysUntil={daysUntil}
      eventDate={eventDate}
      eventId={eventId}
    >
      <SendCardModalContent
        onClose={onClose}
        profileName={profileName}
        profilePicture={profilePicture}
        eventType={eventType}
        userName={userName}
      />
    </SendCardProvider>
  );
}

function SendCardModalContent({
  onClose,
  profileName,
  profilePicture,
  eventType,
  userName,
}: {
  onClose: () => void;
  profileName: string;
  profilePicture: string | null;
  eventType: string;
  userName: string;
}) {
  const { needsOnboarding, handleOnboardingComplete, step, selectedCard } = useSendCard();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col" padding="none">
        <CardHeader className="flex flex-row items-center justify-between flex-shrink-0 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-t-2xl px-4 py-3 mb-0">
          <CardTitle className="flex items-center gap-2 text-white">
            <Mail className="w-5 h-5" />
            Send a Handwritten Card
          </CardTitle>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-4 space-y-4">
          {/* Onboarding for first-time users */}
          {needsOnboarding === true ? (
            <CardOnboarding
              userName={userName}
              onComplete={handleOnboardingComplete}
              onClose={onClose}
            />
          ) : needsOnboarding === null ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
          <>
          {/* Person info strip */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Avatar src={profilePicture} name={profileName} size="md" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{profileName}</p>
              <p className="text-sm text-gray-500 capitalize">{eventType}</p>
            </div>
          </div>

          {/* Steps */}
          {step === 'pick-card' && <PickCardStep />}
          {step === 'compose' && <ComposeStep />}
          {step === 'preview' && selectedCard && <PreviewStep />}
          {step === 'address' && <AddressStep />}
          {step === 'confirm' && selectedCard && <ConfirmStep />}
          {step === 'success' && <SuccessStep />}
          </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
