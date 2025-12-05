'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PhotoUpload } from '@/components/PhotoUpload';
import { ArrowLeft, UserPlus, Cake } from 'lucide-react';

export default function AddPersonPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    birthdate: '',
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          profilePicture: photoUrl,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create profile');
      }
      
      router.push(`/profile/${data.profile.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };
  
  const isValid = formData.name.trim().length > 0 && formData.birthdate.length > 0;
  
  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Back</span>
      </button>
      
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
          <UserPlus className="w-8 h-8 text-white" />
        </div>
        <h1 className="font-display text-2xl font-bold text-gray-900">
          Add a Person
        </h1>
        <p className="text-gray-600 mt-2">
          Add someone to your network and never miss their special days
        </p>
      </div>
      
      <Card padding="lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload */}
          <div className="flex justify-center">
            <PhotoUpload
              currentPhoto={photoUrl}
              name={formData.name || 'New Person'}
              onPhotoChange={setPhotoUrl}
              size="xl"
            />
          </div>
          
          <Input
            label="Name"
            placeholder="e.g., Mom, John Smith"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            autoFocus
            required
          />
          
          <Input
            label="Birthday"
            type="date"
            value={formData.birthdate}
            onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
            required
            hint="We'll remind you when their birthday is coming up"
          />
          
          {error && (
            <p className="text-sm text-coral-600">{error}</p>
          )}
          
          <Button
            type="submit"
            className="w-full"
            disabled={!isValid}
            loading={loading}
          >
            <Cake className="w-4 h-4 mr-2" />
            Add to My Connections
          </Button>
        </form>
      </Card>
      
      <p className="text-center text-sm text-gray-500 mt-6">
        You can add more events and details after creating the profile
      </p>
    </div>
  );
}
