'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Mail, Send, Palette, Sparkles, Stamp } from 'lucide-react';

interface CardOrder {
  id: string;
  recipientName: string;
  recipientCity: string;
  recipientState: string;
  message: string;
  status: 'pending' | 'processing' | 'written' | 'complete' | 'problem' | 'cancelled';
  createdAt: string;
}

type FilterTab = 'all' | 'scheduled' | 'active' | 'delivered' | 'cancelled';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'Queued', bg: 'bg-amber-100', text: 'text-amber-700' },
  processing: { label: 'Printing', bg: 'bg-blue-100', text: 'text-blue-700' },
  written: { label: 'Written', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  complete: { label: 'Delivered', bg: 'bg-teal-100', text: 'text-teal-700' },
  problem: { label: 'Problem', bg: 'bg-red-100', text: 'text-red-700' },
  cancelled: { label: 'Cancelled', bg: 'bg-gray-100', text: 'text-gray-500' },
};

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function CardsPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<CardOrder[]>([]);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');

  useEffect(() => {
    Promise.all([
      fetch('/api/handwritten-cards').then(r => r.json()),
      fetch('/api/card-credits').then(r => r.json()),
    ])
      .then(([ordersData, creditsData]) => {
        setOrders(ordersData.orders ?? []);
        setCreditBalance(creditsData.balance ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Fire-and-forget status sync
    fetch('/api/handwritten-cards/sync', { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        if (data.synced > 0) {
          // Re-fetch orders to get updated statuses
          fetch('/api/handwritten-cards')
            .then(r => r.json())
            .then(d => setOrders(d.orders ?? []));
        }
      })
      .catch(() => {});
  }, []);

  const filteredOrders = orders.filter(o => {
    switch (filter) {
      case 'scheduled': return o.status === 'pending';
      case 'active': return o.status === 'processing' || o.status === 'written';
      case 'delivered': return o.status === 'complete';
      case 'cancelled': return o.status === 'cancelled' || o.status === 'problem';
      default: return true;
    }
  });

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'active', label: 'In Progress' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  // Empty state — marketing
  if (orders.length === 0) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <div className="flex flex-col items-center text-center py-12 space-y-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-200/50">
            <Mail className="w-10 h-10 text-white" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Send handwritten cards to the people who matter
            </h1>
            <p className="text-gray-500 max-w-md">
              Real pen-and-ink cards, written by robots with soul. Pick a card, craft your message, and we mail it for you.
            </p>
          </div>

          <div className="w-full max-w-sm space-y-3 text-left">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-teal-50/60">
              <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                <Palette className="w-5 h-5 text-teal-600" />
              </div>
              <p className="text-sm text-gray-700">Pick from 100+ beautiful card designs</p>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-teal-50/60">
              <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-teal-600" />
              </div>
              <p className="text-sm text-gray-700">AI helps you write the perfect message</p>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-teal-50/60">
              <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                <Stamp className="w-5 h-5 text-teal-600" />
              </div>
              <p className="text-sm text-gray-700">Mailed with a real stamp — arrives in days</p>
            </div>
          </div>

          {creditBalance !== null && creditBalance > 0 && (
            <p className="text-sm text-teal-600 font-medium">
              You have {creditBalance} card credit{creditBalance !== 1 ? 's' : ''} ready to use
            </p>
          )}

          <Button
            className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 px-8"
            onClick={() => router.push('/mycircle')}
          >
            <Send className="w-4 h-4 mr-2" />
            Send Your First Card
          </Button>
        </div>
      </div>
    );
  }

  // Orders state
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Cards</h1>
        {creditBalance !== null && (
          <span className="text-sm font-medium text-teal-600 bg-teal-50 px-3 py-1 rounded-full">
            {creditBalance} credit{creditBalance !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === tab.key
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Order list */}
      {filteredOrders.length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-12">
          No cards match this filter
        </div>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map(order => {
            const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
            return (
              <Card key={order.id} padding="none">
                <div className="flex items-start gap-3 p-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Mail className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{order.recipientName}</p>
                        <p className="text-xs text-gray-500">{order.recipientCity}, {order.recipientState}</p>
                      </div>
                      <span className={`flex-shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>
                        {config.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">{order.message}</p>
                    <p className="text-[11px] text-gray-400 mt-1.5">{relativeDate(order.createdAt)}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

    </div>
  );
}
