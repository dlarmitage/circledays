'use client';

import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface ProfileCardProps {
  id: string;
  name: string;
  profilePicture?: string | null;
  linkedUserId?: string | null;
  hopDistance?: number;
  mutualConnections?: number;
  onClick?: () => void;
  className?: string;
}

export function ProfileCard({
  name,
  profilePicture,
  linkedUserId,
  hopDistance,
  mutualConnections,
  onClick,
  className,
}: ProfileCardProps) {
  return (
    <Card hover onClick={onClick} className={cn('animate-slide-up', className)}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar src={profilePicture} name={name} size="md" />
          {!linkedUserId && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-300 rounded-full border-2 border-white" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{name}</h3>
          {hopDistance !== undefined && hopDistance > 1 && (
            <p className="text-xs text-gray-500">
              {hopDistance} hops away
              {mutualConnections ? ` · ${mutualConnections} mutual` : ''}
            </p>
          )}
        </div>
        
        {hopDistance !== undefined && (
          <Badge
            variant={hopDistance === 1 ? 'success' : hopDistance === 2 ? 'info' : 'default'}
            size="sm"
          >
            {hopDistance === 1 ? 'Connected' : hopDistance === 2 ? '2nd' : '3rd+'}
          </Badge>
        )}
      </div>
    </Card>
  );
}


