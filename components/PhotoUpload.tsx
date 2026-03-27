'use client';

import { useState, useRef, useEffect } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ImageCropper } from '@/components/ImageCropper';
import { Camera, X, Clipboard } from 'lucide-react';
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
  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Handle paste from clipboard via keyboard shortcut
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            processImageFile(file);
          }
          return;
        }
      }
    };
    const container = containerRef.current;
    if (container) {
      container.addEventListener('paste', handler);
      return () => container.removeEventListener('paste', handler);
    }
  }, []);

  // Handle click on "paste from clipboard" using Clipboard API
  const handleClipboardClick = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find(t => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], 'clipboard.png', { type: imageType });
          processImageFile(file);
          return;
        }
      }
      setError('No image found in clipboard');
    } catch {
      setError('Could not access clipboard. Try Cmd+V instead.');
    }
  };
  
  const processImageFile = (file: File) => {
    // Validate on client side
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Please use JPEG, PNG, WebP, or GIF images');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB');
      return;
    }
    
    setError(null);
    
    // Read file and show cropper
    const reader = new FileReader();
    reader.onload = () => {
      setCropperImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    processImageFile(file);
    
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };
  
  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropperImage(null);
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', croppedBlob, 'photo.jpg');
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
    }
  };
  
  const handleCropCancel = () => {
    setCropperImage(null);
  };
  
  const handleRemove = () => {
    setPhoto(null);
    onPhotoChange?.(null);
  };
  
  return (
    <>
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
        
        <button
          type="button"
          onClick={handleClipboardClick}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
        >
          <Clipboard className="w-3 h-3" />
          or paste from clipboard
        </button>
        
        {error && (
          <p className="text-xs text-coral-600">{error}</p>
        )}
      </div>
      
      {/* Image Cropper Modal */}
      {cropperImage && (
        <ImageCropper
          image={cropperImage}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
}
