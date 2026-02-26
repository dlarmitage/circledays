'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Users } from 'lucide-react';
import { STRINGS } from '@/lib/constants';

interface ConnectionDiscoveriesCardProps {
  count: number;
  onShowMe: () => void;
  onDismiss: () => void;
}

export function ConnectionDiscoveriesCard({
  count,
  onShowMe,
  onDismiss,
}: ConnectionDiscoveriesCardProps) {
  if (count === 0) return null;

  return (
    <Card className="mb-6 border-emerald-200 bg-emerald-50/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-emerald-700">
            <Users className="w-5 h-5" />
            {STRINGS.discoveries.bannerTitle}
          </CardTitle>
          <button
            onClick={onDismiss}
            className="text-xs text-emerald-600 hover:text-emerald-800 transition-colors font-medium"
          >
            {STRINGS.discoveries.dismiss}
          </button>
        </div>
        <p className="text-sm text-emerald-600 mt-1">
          {STRINGS.discoveries.bannerSubtitle}
        </p>
      </CardHeader>

      <CardContent className="pt-2">
        <Button onClick={onShowMe} size="sm">
          <Users className="w-4 h-4 mr-2" />
          {STRINGS.discoveries.showMe}
          <span className="ml-2 bg-white/20 text-white text-xs rounded-full px-2 py-0.5">
            {count}
          </span>
        </Button>
      </CardContent>
    </Card>
  );
}
