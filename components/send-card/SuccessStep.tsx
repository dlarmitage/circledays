'use client';

import { Button } from '@/components/ui/Button';
import { Check } from 'lucide-react';

interface SuccessStepProps {
  firstName: string;
  creditBalance: number | null;
  onClose: () => void;
}

export function SuccessStep({ firstName, creditBalance, onClose }: SuccessStepProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-4 py-6">
      <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
        <Check className="w-8 h-8 text-teal-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Card on its way!</h3>
        <p className="text-sm text-gray-500 mt-1">
          Your handwritten card for {firstName} is being written and will arrive within a few days.
        </p>
      </div>
      {creditBalance !== null && (
        <p className="text-sm text-gray-500">
          {creditBalance} credit{creditBalance === 1 ? '' : 's'} remaining
        </p>
      )}
      <Button onClick={onClose} className="w-full">
        Done
      </Button>
    </div>
  );
}
