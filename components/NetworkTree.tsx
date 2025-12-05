'use client';

import { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { ArrowLeft, Search, ChevronRight, Users, X, Check } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  profilePicture: string | null;
  connectionCount: number;
  isConnectedToUser: boolean; // Whether current user is connected to this profile
}

interface NetworkTreeProps {
  userProfile: Profile;
  connections: Profile[];
  onProfileClick: (profileId: string, isConnected: boolean) => void;
  onDrillIn: (profileId: string) => Promise<Profile[]>;
  onConnect: (profileId: string) => Promise<void>;
  // Multi-select mode
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (profileId: string) => void;
}

export interface NetworkTreeHandle {
  refreshCurrentView: () => Promise<void>;
}

// Sort by last name, fallback to first name
function sortByLastName(profiles: Profile[]): Profile[] {
  return [...profiles].sort((a, b) => {
    const getLastName = (name: string) => {
      const parts = name.split(' ').filter(p => p.length > 1);
      return parts.length > 1 ? parts[parts.length - 1] : parts[0] || name;
    };
    return getLastName(a.name).localeCompare(getLastName(b.name));
  });
}

// Format name as "Last, First"
function formatNameLastFirst(name: string): string {
  const parts = name.split(' ').filter(p => p.length > 1);
  if (parts.length <= 1) return name;
  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, -1).join(' ');
  return `${lastName}, ${firstName}`;
}

export const NetworkTree = forwardRef<NetworkTreeHandle, NetworkTreeProps>(function NetworkTree({
  userProfile,
  connections,
  onProfileClick,
  onDrillIn,
  onConnect,
  selectMode = false,
  selectedIds = new Set(),
  onToggleSelect,
}, ref) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [focusStack, setFocusStack] = useState<{ profile: Profile; connections: Profile[] }[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Current view state
  const currentFocus = focusStack.length > 0 ? focusStack[focusStack.length - 1] : null;
  const isSearchMode = searchQuery.trim().length >= 2;
  
  // Debounced global search
  useEffect(() => {
    if (!isSearchMode) {
      setSearchResults(null);
      return;
    }
    
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/network/search?q=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, isSearchMode]);
  
  // Determine what to display
  const displayedProfiles = isSearchMode
    ? searchResults || []
    : currentFocus
      ? currentFocus.connections
      : connections;
  
  // Sort connections (search results come pre-sorted)
  const sortedProfiles = isSearchMode
    ? displayedProfiles
    : sortByLastName(displayedProfiles);
  
  // Refresh current drilled-in view (called after connection changes)
  const refreshCurrentView = useCallback(async () => {
    if (currentFocus) {
      const freshConnections = await onDrillIn(currentFocus.profile.id);
      setFocusStack(prev => {
        const newStack = [...prev];
        newStack[newStack.length - 1] = {
          ...newStack[newStack.length - 1],
          connections: freshConnections,
        };
        return newStack;
      });
    }
    
    // If in search mode, refresh search results
    if (isSearchMode && searchQuery.trim()) {
      const res = await fetch(`/api/network/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    }
  }, [currentFocus, onDrillIn, isSearchMode, searchQuery]);
  
  // Expose refresh function to parent
  useImperativeHandle(ref, () => ({
    refreshCurrentView,
  }));
  
  const handleDrillIn = async (profile: Profile) => {
    // If it's a connected profile, drill into their connections
    if (profile.isConnectedToUser) {
      setLoading(true);
      try {
        const theirConnections = await onDrillIn(profile.id);
        setFocusStack([...focusStack, { profile, connections: theirConnections }]);
        setSearchQuery('');
        setSearchResults(null);
      } finally {
        setLoading(false);
      }
    } else {
      // Not connected - show their profile (modal will appear)
      onProfileClick(profile.id, false);
    }
  };
  
  const handleBack = () => {
    setFocusStack(focusStack.slice(0, -1));
    setSearchQuery('');
    setSearchResults(null);
  };
  
  const handleProfileTap = (profile: Profile) => {
    // Pass connection status so parent knows whether to show full profile or modal
    onProfileClick(profile.id, profile.isConnectedToUser);
  };
  
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search everyone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>
      
      {/* Header / Breadcrumb */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <AnimatePresence mode="wait">
          {isSearchMode ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-3"
            >
              <Search className="w-5 h-5 text-teal-600" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  Search Results
                </p>
                <p className="text-xs text-gray-500">
                  {searchLoading ? 'Searching...' : `${sortedProfiles.length} found`}
                </p>
              </div>
            </motion.div>
          ) : currentFocus ? (
            <motion.div
              key={currentFocus.profile.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-3"
            >
              <button
                onClick={handleBack}
                className="p-2 -ml-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <Avatar
                src={currentFocus.profile.profilePicture}
                name={currentFocus.profile.name}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {currentFocus.profile.name}
                </p>
                <p className="text-xs text-gray-500">
                  Connections
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="root"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-3"
            >
              <Avatar
                src={userProfile.profilePicture}
                name={userProfile.name}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  Your Connections
                </p>
                <p className="text-xs text-gray-500">
                  {connections.length} connections
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Connection List */}
      <div className="flex-1 overflow-y-auto">
        {loading || searchLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : sortedProfiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Users className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">
              {isSearchMode ? 'No results found' : 'No connections yet'}
            </p>
            {isSearchMode && (
              <p className="text-xs text-gray-400 mt-1">
                Try a different search term
              </p>
            )}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={isSearchMode ? 'search' : (currentFocus?.profile.id || 'root')}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {sortedProfiles.map((profile, index) => (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.02, 0.5), duration: 0.2 }}
                >
                  <ConnectionRow
                    profile={profile}
                    onTap={() => handleProfileTap(profile)}
                    onDrillIn={() => handleDrillIn(profile)}
                    selectMode={selectMode && !currentFocus}
                    isSelected={selectedIds.has(profile.id)}
                    onToggleSelect={onToggleSelect}
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
});

interface ConnectionRowProps {
  profile: Profile;
  onTap: () => void;
  onDrillIn: () => void;
  selectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (profileId: string) => void;
}

function ConnectionRow({ 
  profile, 
  onTap, 
  onDrillIn,
  selectMode = false,
  isSelected = false,
  onToggleSelect,
}: ConnectionRowProps) {
  const handleClick = () => {
    if (selectMode && profile.isConnectedToUser && onToggleSelect) {
      onToggleSelect(profile.id);
    } else {
      onTap();
    }
  };
  
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
        !profile.isConnectedToUser ? 'opacity-60' : ''
      } ${isSelected ? 'bg-teal-50' : ''}`}
    >
      {/* Checkbox in select mode */}
      {selectMode && profile.isConnectedToUser && (
        <button
          onClick={() => onToggleSelect?.(profile.id)}
          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
            isSelected 
              ? 'bg-teal-500 border-teal-500' 
              : 'border-gray-300 hover:border-teal-500'
          }`}
        >
          {isSelected && <Check className="w-4 h-4 text-white" />}
        </button>
      )}
      
      {/* Avatar - tap to view profile (or toggle select in select mode) */}
      <button
        onClick={handleClick}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        <div className={!profile.isConnectedToUser ? 'grayscale' : ''}>
          <Avatar
            src={profile.profilePicture}
            name={profile.name}
            size="md"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-medium truncate ${
            profile.isConnectedToUser ? 'text-gray-900' : 'text-gray-500'
          }`}>
            {formatNameLastFirst(profile.name)}
          </p>
          {!profile.isConnectedToUser && (
            <p className="text-xs text-gray-400">
              Not connected
            </p>
          )}
        </div>
      </button>
      
      {/* Connection count + drill-in button (hidden in select mode) */}
      {!selectMode && profile.isConnectedToUser && profile.connectionCount > 0 && (
        <button
          onClick={onDrillIn}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <span className="text-sm font-medium text-gray-600">
            {profile.connectionCount}
          </span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      )}
    </div>
  );
}
