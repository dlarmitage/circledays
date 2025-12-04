'use client';

import { useState, useRef } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Camera, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoUploadProps {
  currentPhoto?: string | null;
  name: string;
  profileId?: string;
  onPhotoChange?: (url: string | null) => void;
  size?: 'md' | 'lg' | 'xl';
  className?: string;
}

export function PhotoUpload({
  currentPhoto,
  name,
  profileId,
  onPhotoChange,
  size = 'xl',
  className,
}: PhotoUploadProps) {
  const [photo, setPhoto] = useState<string | null>(currentPhoto || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate on client side
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please use JPEG, PNG, or WebP images');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }
    
    setError(null);
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (profileId) {
        formData.append('profileId', profileId);
      }
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }
      
      setPhoto(data.url);
      onPhotoChange?.(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };
  
  const handleRemove = () => {
    setPhoto(null);
    onPhotoChange?.(null);
  };
  
  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className="relative">
        <Avatar src={photo} name={name} size={size} />
        
        {/* Upload overlay */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            'absolute inset-0 rounded-full flex items-center justify-center',
            'bg-black/40 opacity-0 hover:opacity-100 transition-opacity',
            'cursor-pointer disabled:cursor-wait',
            uploading && 'opacity-100'
          )}
        >
          {uploading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </button>
        
        {/* Remove button */}
        {photo && !uploading && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-coral-500 text-white flex items-center justify-center hover:bg-coral-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        loading={uploading}
      >
        {photo ? 'Change Photo' : 'Add Photo'}
      </Button>
      
      {error && (
        <p className="text-xs text-coral-600">{error}</p>
      )}
    </div>
  );
}

