'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileCard } from '@/components/ProfileCard';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Search, Users } from 'lucide-react';
import { debounce } from '@/lib/debounce';

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
          {results.map((result, index) => (
            <div
              key={result.id}
              className={`stagger-${Math.min(index + 1, 5)}`}
              style={{ animationFillMode: 'backwards' }}
            >
              <ProfileCard
                {...result}
                onClick={() => router.push(`/profile/${result.id}`)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p>Start typing to search for people</p>
        </div>
      )}
    </div>
  );
}


