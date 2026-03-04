'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { STRINGS } from '@/lib/constants';
import { Eye } from 'lucide-react';

interface PrivacySectionProps {
  shareNewConnections: boolean;
  onChange: (value: boolean) => void;
}

export function PrivacySection({ shareNewConnections, onChange }: PrivacySectionProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-teal-600" />
          {STRINGS.privacy.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              checked={shareNewConnections}
              onChange={(e) => onChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-teal-500 transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">
              {STRINGS.privacy.shareNewConnections}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {STRINGS.privacy.shareNewConnectionsDescription}
            </p>
          </div>
        </label>
      </CardContent>
    </Card>
  );
}
