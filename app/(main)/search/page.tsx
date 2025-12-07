'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileCard } from '@/components/ProfileCard';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { MergeProfilesModal } from '@/components/MergeProfilesModal';
import { Search, Users, Merge } from 'lucide-react';
import { debounce } from '@/lib/debounce';
import { areNamesSimilar } from '@/lib/utils';

interface SearchResult {
  id: string;
  name: string;
  profilePicture: string | null;
  hopDistance: number;
  mutualConnections: number;
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [selectedProfiles, setSelectedProfiles] = useState<{ profileA: any; profileB: any } | null>(null);
  
  const search = useCallback(
    debounce(async (q: string) => {
      if (q.length < 2) {
        setResults([]);
        setHasSearched(false);
        return;
      }
      
      setLoading(true);
      try {
        const res = await fetch(`/api/profiles/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.results || []);
        setHasSearched(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );
  
  useEffect(() => {
    search(query);
  }, [query, search]);
  
  // Check if user is admin
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        setIsAdmin(data.user?.isPlatformAdmin || false);
      });
  }, []);
  
  const handleMergeClick = async (profileId: string) => {
    // Find the other profile with same name
    const profile = results.find(r => r.id === profileId);
    if (!profile) return;
    
    // Find other profiles with similar names (handles married names, different formats)
    const similarProfiles = results.filter(r => 
      r.id !== profileId && 
      areNamesSimilar(r.name, profile.name)
    );
    
    if (similarProfiles.length === 0) {
      alert('No other profiles with the same name found. Select two profiles to merge.');
      return;
    }
    
    // For now, merge with the first similar one
    // In the future, could show a picker
    const profileA = profile;
    const profileB = similarProfiles[0];
    
    // Fetch full profile data
    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/profiles/${profileA.id}`),
        fetch(`/api/profiles/${profileB.id}`),
      ]);
      
      const dataA = await resA.json();
      const dataB = await resB.json();
      
      setSelectedProfiles({
        profileA: {
          id: profileA.id,
          name: profileA.name,
          profilePicture: profileA.profilePicture,
          linkedUserId: dataA.profile?.linkedUserId || null,
          eventCount: dataA.events?.length || 0,
          connectionCount: dataA.connections?.length || 0,
        },
        profileB: {
          id: profileB.id,
          name: profileB.name,
          profilePicture: profileB.profilePicture,
          linkedUserId: dataB.profile?.linkedUserId || null,
          eventCount: dataB.events?.length || 0,
          connectionCount: dataB.connections?.length || 0,
        },
      });
      setMergeModalOpen(true);
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
      alert('Failed to load profile data');
    }
  };
  
  const handleMerge = async (keepProfileId: string, mergeOptions: any) => {
    if (!selectedProfiles) return;
    
    const mergeProfileId = keepProfileId === selectedProfiles.profileA.id 
      ? selectedProfiles.profileB.id 
      : selectedProfiles.profileA.id;
    
    const res = await fetch('/api/profiles/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keepProfileId,
        mergeProfileId,
        mergeOptions,
      }),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to merge');
    }
    
    // Refresh search results
    search(query);
    setMergeModalOpen(false);
    setSelectedProfiles(null);
  };
  
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900">
          Search
        </h1>
        <p className="text-gray-600 mt-1">
          Find people in your network
        </p>
      </div>
      
      {/* Search input */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          autoFocus
        />
      </div>
      
      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : hasSearched && results.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No results found"
          description={`No one matches "${query}". Try a different search term.`}
        />
      ) : results.length > 0 ? (
        <div className="space-y-3">
          {results.map((result, index) => {
            // Check if there are other results with similar names (for merge)
            const duplicateCount = results.filter(r => 
              r.id !== result.id && 
              areNamesSimilar(r.name, result.name)
            ).length;
            
            return (
              <div
                key={result.id}
                className={`stagger-${Math.min(index + 1, 5)}`}
                style={{ animationFillMode: 'backwards' }}
              >
                <div className="relative group">
                  <ProfileCard
                    {...result}
                    onClick={() => router.push(`/profile/${result.id}`)}
                  />
                  {isAdmin && duplicateCount > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-2 right-2 z-10 shadow-md"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleMergeClick(result.id);
                      }}
                    >
                      <Merge className="w-4 h-4 mr-1" />
                      Merge
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p>Start typing to search for people</p>
        </div>
      )}
      
      {/* Merge Modal */}
      {selectedProfiles && (
        <MergeProfilesModal
          isOpen={mergeModalOpen}
          onClose={() => {
            setMergeModalOpen(false);
            setSelectedProfiles(null);
          }}
          profileA={selectedProfiles.profileA}
          profileB={selectedProfiles.profileB}
          onMerge={handleMerge}
        />
      )}
    </div>
  );
}


