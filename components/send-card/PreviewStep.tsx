'use client';

import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { HandwryttenCard, HandwryttenFont } from './types';

interface PreviewStepProps {
  selectedCard: HandwryttenCard;
  message: string;
  charLimit: number;
  fonts: HandwryttenFont[];
  selectedFont: HandwryttenFont | null;
  onSelectFont: (font: HandwryttenFont) => void;
  fontLoaded: boolean;
  onBack: () => void;
  onContinue: () => void;
}

export function PreviewStep({
  selectedCard,
  message,
  charLimit,
  fonts,
  selectedFont,
  onSelectFont,
  fontLoaded,
  onBack,
  onContinue,
}: PreviewStepProps) {
  const currentIndex = selectedFont ? fonts.findIndex(f => f.id === selectedFont.id) : 0;

  const goToFont = (direction: -1 | 1) => {
    if (fonts.length === 0) return;
    const nextIndex = (currentIndex + direction + fonts.length) % fonts.length;
    onSelectFont(fonts[nextIndex]);
  };

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft className="w-4 h-4" />
        Edit message
      </button>

      {/* Card preview */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Card preview</p>
        <div
          className="relative rounded-xl overflow-hidden border border-gray-200 bg-white"
          style={{ aspectRatio: `${selectedCard.orientation === 'P' ? 4.25 : 5.5} / ${selectedCard.orientation === 'P' ? 5.5 : 4.25}`, containerType: 'inline-size' }}
        >
          {selectedCard.inside_image && (
            <img src={selectedCard.inside_image} alt="Card inside" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div
            className="absolute inset-0 p-[8%] overflow-y-auto"
            style={{
              fontFamily: selectedFont && fontLoaded ? `hw-${selectedFont.font_name}, cursive` : 'cursive',
              fontSize: 'clamp(18px, 12cqi, 48px)',
              lineHeight: '0.65',
              color: '#0040ac',
              fontWeight: 600,
            }}
          >
            <p className="whitespace-pre-wrap break-words">{message}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-right">{message.length} / {charLimit}</p>
      </div>

      {/* Font selector — arrow navigation */}
      {fonts.length > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => goToFont(-1)}
            className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-700 font-medium min-w-0 text-center">
            {selectedFont?.label || 'Default'}
            <span className="text-gray-400 font-normal ml-1.5">
              {currentIndex + 1}/{fonts.length}
            </span>
          </span>
          <button
            onClick={() => goToFont(1)}
            className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors active:scale-95"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <Button
        className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
        onClick={onContinue}
      >
        Continue
      </Button>
    </div>
  );
}
