'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { NetworkTree, NetworkTreeHandle } from '@/components/NetworkTree';
import { ConnectionModal } from '@/components/ConnectionModal';
import { SuggestModal } from '@/components/SuggestModal';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Plus, Users, CheckSquare, X, Send } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  profilePicture: string | null;
  connectionCount: number;
  isConnectedToUser: boolean;
  linkedUserId: string | null;
}

interface MutualConnection {
  id: string;
  name: string;
  profilePicture: string | null;
}

interface ModalProfile {
  id: string;
  name: string;
  profilePicture: string | null;
  isClaimed: boolean;
  connectionCount: number;
}

export default function NetworkPage() {
  const router = useRouter();
  const networkTreeRef = useRef<NetworkTreeHandle>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [connections, setConnections] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [modalProfile, setModalProfile] = useState<ModalProfile | null>(null);
  const [modalMutualConnections, setModalMutualConnections] = useState<MutualConnection[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [suggestModalOpen, setSuggestModalOpen] = useState(false);
  
  useEffect(() => {
    fetchNetwork();
  }, []);
  
  const fetchNetwork = async () => {
    try {
      const res = await fetch('/api/network/tree');
      const data = await res.json();
      setUserProfile(data.userProfile);
      setConnections(data.connections);
    } catch (error) {
      console.error('Failed to fetch network:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDrillIn = useCallback(async (profileId: string): Promise<Profile[]> => {
    const res = await fetch(`/api/network/tree?profileId=${profileId}`);
    const data = await res.json();
    return data.connections;
  }, []);
  
  const handleProfileClick = useCallback(async (profileId: string, isConnected: boolean) => {
    if (isConnected) {
      // Navigate to full profile
      router.push(`/profile/${profileId}`);
    } else {
      // Show connection modal for non-connected profiles
      try {
        const res = await fetch(`/api/network/preview?profileId=${profileId}`);
        const data = await res.json();
        setModalProfile(data.profile);
        setModalMutualConnections(data.mutualConnections);
        setModalOpen(true);
      } catch (error) {
        console.error('Failed to fetch profile preview:', error);
      }
    }
  }, [router]);
  
  const handleConnect = useCallback(async (profileId: string) => {
    const res = await fetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId }),
    });
    
    if (!res.ok) {
      throw new Error('Failed to connect');
    }
    
    // Refresh network data
    await fetchNetwork();
    
    // Also refresh the current drilled-in view if applicable
    await networkTreeRef.current?.refreshCurrentView();
  }, []);
  
  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalProfile(null);
    setModalMutualConnections([]);
  }, []);
  
  // Multi-select handlers
  const toggleSelectMode = useCallback(() => {
    setSelectMode(prev => {
      if (prev) {
        // Exiting select mode - clear selections
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);
  
  const handleToggleSelect = useCallback((profileId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(profileId)) {
        next.delete(profileId);
      } else {
        next.add(profileId);
      }
      return next;
    });
  }, []);
  
  const handleSuggest = useCallback(async (toUserId: string) => {
    const profileIds = Array.from(selectedIds);
    
    const res = await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId, profileIds }),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to send suggestions');
    }
    
    // Clear selection and exit select mode
    setSelectedIds(new Set());
    setSelectMode(false);
  }, [selectedIds]);
  
  const selectedProfiles = connections.filter(c => selectedIds.has(c.id));
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (!userProfile) {
    return (
      <div className="p-4">
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="Connections unavailable"
          description="Unable to load your network"
        />
      </div>
    );
  }
  
  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)] flex flex-col bg-white md:rounded-2xl md:shadow-soft md:m-4 overflow-hidden">
      {/* Header with Add Person button and Select mode */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h1 className="font-display text-lg font-bold text-gray-900">
          {selectMode 
            ? `${selectedIds.size} selected` 
            : 'Connections'}
        </h1>
        <div className="flex items-center gap-2">
          {selectMode ? (
            <>
              <Button 
                size="sm" 
                variant="secondary"
                onClick={toggleSelectMode}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={() => setSuggestModalOpen(true)}
                disabled={selectedIds.size === 0}
              >
                <Send className="w-4 h-4 mr-1" />
                Suggest
              </Button>
            </>
          ) : (
            <>
              {connections.length > 0 && (
                <Button size="sm" variant="secondary" onClick={toggleSelectMode}>
                  <CheckSquare className="w-4 h-4 mr-1" />
                  Select
                </Button>
              )}
              <Button size="sm" onClick={() => router.push('/add-person')}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Tree Navigation */}
      {connections.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title="No connections yet"
            description="Start building your network by adding people you know"
            action={
              <Button onClick={() => router.push('/add-person')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Connection
              </Button>
            }
          />
        </div>
      ) : (
        <NetworkTree
          ref={networkTreeRef}
          userProfile={userProfile}
          connections={connections}
          onProfileClick={handleProfileClick}
          onDrillIn={handleDrillIn}
          onConnect={handleConnect}
          selectMode={selectMode}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
        />
      )}
      
      {/* Connection Modal */}
      <AnimatePresence>
        {modalOpen && (
          <ConnectionModal
            isOpen={modalOpen}
            onClose={closeModal}
            profile={modalProfile}
            mutualConnections={modalMutualConnections}
            onConnect={handleConnect}
          />
        )}
      </AnimatePresence>
      
      {/* Suggest Modal */}
      <SuggestModal
        isOpen={suggestModalOpen}
        onClose={() => setSuggestModalOpen(false)}
        selectedProfiles={selectedProfiles}
        connections={connections}
        onSuggest={handleSuggest}
      />
    </div>
  );
}
