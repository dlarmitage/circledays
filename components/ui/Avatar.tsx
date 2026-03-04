'use client';

import { useState } from 'react';
import { cn, getInitials } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBorder?: boolean;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
};

export function Avatar({ src, name, size = 'md', className, showBorder }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(name);
  
  const baseClasses = cn(
    'rounded-full flex items-center justify-center font-semibold',
    sizeClasses[size],
    showBorder && 'ring-2 ring-white',
    className
  );
  
  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(baseClasses, 'object-cover')}
        onError={() => setImageError(true)}
      />
    );
  }
  
  return (
    <div
      className={cn(
        baseClasses,
        'bg-gradient-to-br from-teal-500 to-teal-600 text-white'
      )}
    >
      {initials}
    </div>
  );
}


