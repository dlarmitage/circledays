'use client';

import { useState } from 'react';
import { Eye, ArrowLeft, Loader2 } from 'lucide-react';

interface ImpersonationBannerProps {
  userName: string;
  originalUserName: string;
}

export function ImpersonationBanner({ userName, originalUserName }: ImpersonationBannerProps) {
  const [stopping, setStopping] = useState(false);

  const handleStop = async () => {
    setStopping(true);
    try {
      const res = await fetch('/api/admin/stop-impersonating', { method: 'POST' });
      if (res.ok) {
        // Force a full page reload to reset all client state
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Failed to stop impersonating:', error);
      setStopping(false);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Eye className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium truncate">
            Viewing as <strong>{userName}</strong>
          </span>
        </div>
        <button
          onClick={handleStop}
          disabled={stopping}
          className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-full transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {stopping ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ArrowLeft className="w-3.5 h-3.5" />
          )}
          Back to {originalUserName.split(' ')[0]}
        </button>
      </div>
    </div>
  );
}
