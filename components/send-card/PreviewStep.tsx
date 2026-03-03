'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, Check } from 'lucide-react';
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
  const [showFontPicker, setShowFontPicker] = useState(false);

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft className="w-4 h-4" />
        Edit message
      </button>

      {/* Card preview — constrained to fit viewport */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Card preview</p>
        <div
          className="relative rounded-xl overflow-hidden border-2 border-teal-200 bg-white max-h-[45vh]"
          style={{ aspectRatio: `${selectedCard.orientation === 'P' ? 4.25 : 5.5} / ${selectedCard.orientation === 'P' ? 5.5 : 4.25}` }}
        >
          {selectedCard.inside_image && (
            <img src={selectedCard.inside_image} alt="Card inside" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div
            className="absolute inset-0 p-[12%] overflow-y-auto"
            style={{
              fontFamily: selectedFont && fontLoaded ? `hw-${selectedFont.font_name}, cursive` : 'cursive',
              fontSize: selectedCard.font_size ? `${Math.max(18, selectedCard.font_size * 1.3)}px` : '24px',
              lineHeight: selectedFont?.line_spacing ? `${1 + selectedFont.line_spacing}` : '1.7',
              color: '#1a1a2e',
            }}
          >
            <p className="whitespace-pre-wrap break-words">{message}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-right">{message.length} / {charLimit}</p>
      </div>

      {/* Font picker */}
      {fonts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {selectedFont && (
                <>
                  {selectedFont.image && (
                    <img src={selectedFont.image} alt={selectedFont.label} className="h-6 object-contain rounded border border-gray-200" />
                  )}
                  <span className="text-xs text-gray-600">{selectedFont.label}</span>
                </>
              )}
            </div>
            <button
              onClick={() => setShowFontPicker(v => !v)}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium"
            >
              {showFontPicker ? 'Done' : 'Change font'}
            </button>
          </div>

          {showFontPicker && (
            <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 p-2">
              <div className="grid grid-cols-3 gap-2">
                {fonts.map(f => (
                  <button
                    key={f.id}
                    onClick={() => onSelectFont(f)}
                    className={`relative flex flex-col rounded-lg border-2 overflow-hidden transition-all active:scale-95 ${
                      selectedFont?.id === f.id ? 'border-teal-500' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {f.image ? (
                      <img src={f.image} alt={f.label} className="w-full aspect-[4/3] object-contain bg-white p-1" loading="lazy" />
                    ) : (
                      <div className="w-full aspect-[4/3] bg-gray-100 flex items-center justify-center">
                        <span className="text-lg font-serif italic text-gray-400">Aa</span>
                      </div>
                    )}
                    <div className={`px-1 py-0.5 text-center text-[10px] font-medium truncate ${
                      selectedFont?.id === f.id ? 'bg-teal-500 text-white' : 'bg-white text-gray-700'
                    }`}>{f.label}</div>
                    {selectedFont?.id === f.id && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-teal-500 rounded-full flex items-center justify-center shadow">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Button
        className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
        onClick={() => { setShowFontPicker(false); onContinue(); }}
      >
        Continue
      </Button>
    </div>
  );
}
