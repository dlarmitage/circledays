'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { X, Check, Image as ImageIcon } from 'lucide-react';
import { useSendCard } from './SendCardContext';
import type { HandwryttenCard } from './types';

export function PickCardStep() {
  const {
    categories,
    selectedCategory,
    setSelectedCategory,
    cards,
    loadingCards,
    selectedCard,
    setSelectedCard,
    setStep,
  } = useSendCard();

  const [previewCard, setPreviewCard] = useState<HandwryttenCard | null>(null);
  const pillRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Scroll selected category pill into view
  useEffect(() => {
    if (selectedCategory === null) return;
    const el = pillRefs.current.get(selectedCategory);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedCategory]);

  const handleSelectCategory = (id: number) => {
    setSelectedCategory(id);
    setSelectedCard(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-gray-700">Choose a card</p>

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.id}
              ref={el => { if (el) pillRefs.current.set(cat.id, el); }}
              onClick={() => handleSelectCategory(cat.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Card grid */}
      {loadingCards ? (
        <div className="grid grid-cols-3 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : cards.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto">
          {cards.map(card => (
            <button
              key={card.id}
              onClick={() => setSelectedCard(card)}
              className={`relative rounded-lg border-2 overflow-hidden transition-all active:scale-95 ${
                selectedCard?.id === card.id ? 'border-teal-500 ring-2 ring-teal-200' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {card.cover ? (
                <img src={card.cover} alt={card.name} className="w-full aspect-[3/4] object-cover bg-gray-50" loading="lazy" />
              ) : (
                <div className="w-full aspect-[3/4] bg-gray-100 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-gray-300" />
                </div>
              )}
              {selectedCard?.id === card.id && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center shadow">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <div
                role="button"
                tabIndex={-1}
                onClick={e => { e.stopPropagation(); setPreviewCard(card); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); setPreviewCard(card); } }}
                className="absolute bottom-1 left-1 bg-black/50 text-white text-[9px] rounded px-1.5 py-0.5 hover:bg-black/70 cursor-pointer"
              >
                Preview
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-400 text-center py-8">
          {categories.length === 0 ? 'Loading categories...' : 'No cards in this category'}
        </div>
      )}

      {/* Card preview overlay */}
      {previewCard && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-6 bg-black/60" onClick={() => setPreviewCard(null)}>
          <div className="bg-white rounded-2xl p-4 max-w-sm w-full space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-900 text-sm">{previewCard.name}</p>
              <button onClick={() => setPreviewCard(null)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-gray-500 mb-1">Cover</p>
                <img src={previewCard.cover} alt="Cover" className="w-full rounded-lg border border-gray-200" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 mb-1">Inside</p>
                <img src={previewCard.inside_image} alt="Inside" className="w-full rounded-lg border border-gray-200" />
              </div>
            </div>
            <p className="text-xs text-gray-500">Max {previewCard.characters} characters</p>
            <Button
              className="w-full"
              onClick={() => { setSelectedCard(previewCard); setPreviewCard(null); }}
            >
              Select This Card
            </Button>
          </div>
        </div>
      )}

      {/* Selected card summary */}
      {selectedCard && (
        <div className="flex items-center gap-3 p-2 bg-teal-50 rounded-xl border border-teal-200">
          <img src={selectedCard.cover} alt={selectedCard.name} className="w-10 h-14 object-cover rounded border border-teal-200" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-teal-900 truncate">{selectedCard.name}</p>
            <p className="text-xs text-teal-600">Up to {selectedCard.characters} characters</p>
          </div>
        </div>
      )}

      <Button
        className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
        onClick={() => setStep('compose')}
        disabled={!selectedCard}
      >
        Continue to Message
      </Button>
    </div>
  );
}
