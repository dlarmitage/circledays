'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { NetworkTree, NetworkTreeHandle } from '@/components/NetworkTree';
import { ConnectionModal } from '@/components/ConnectionModal';
import { SuggestModal } from '@/components/SuggestModal';
import { MergeProfilesModal } from '@/components/MergeProfilesModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Avatar } from '@/components/ui/Avatar';
import { Plus, Users, CheckSquare, X, Send, UserMinus } from 'lucide-react';
import { areNamesSimilar } from '@/lib/utils';

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
  
  // Admin merge state
  const [isAdmin, setIsAdmin] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeProfiles, setMergeProfiles] = useState<{ profileA: any; profileB: any } | null>(null);
  
  // Admin "Show All" state
  const [showAll, setShowAll] = useState(false);
  
  // Bulk disconnect state
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  
  useEffect(() => {
    fetchNetwork();
    
    // Check if user is admin
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        setIsAdmin(data.user?.isPlatformAdmin || false);
      });
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
  
  const fetchAllProfiles = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/profiles/all');
      if (!res.ok) {
        throw new Error('Failed to fetch all profiles');
      }
      const data = await res.json();
      setUserProfile(data.userProfile);
      setConnections(data.connections);
    } catch (error) {
      console.error('Failed to fetch all profiles:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleShowAllToggle = () => {
    if (showAll) {
      // Switch back to connections
      setShowAll(false);
      fetchNetwork();
    } else {
      // Switch to all profiles
      setShowAll(true);
      fetchAllProfiles();
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
  
  const handleSuggest = useCallback(async (connectTogether: boolean) => {
    const profileIds = Array.from(selectedIds);
    
    // Call the suggestions API which handles everything automatically
    const res = await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        profileIds,
        connectTogether,
      }),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create suggestions');
    }
    
    const result = await res.json();
    console.log('Suggestions result:', result);
    
    // Refresh connections to show new auto-connections
    await fetchNetwork();
    
    // Clear selection
    setSelectedIds(new Set());
    setSelectMode(false);
  }, [selectedIds]);
  
  const selectedProfiles = connections.filter(c => selectedIds.has(c.id));
  
  // Bulk disconnect handler
  const handleBulkDisconnect = async () => {
    setDisconnecting(true);
    try {
      // Get the connection IDs for selected profiles
      const res = await fetch('/api/connections');
      const data = await res.json();
      
      // Find connections that match our selected profile IDs
      const connectionsToDelete = data.connections.filter((conn: any) => 
        selectedIds.has(conn.profile.id)
      );
      
      // Delete each connection
      for (const conn of connectionsToDelete) {
        await fetch(`/api/connections/${conn.connectionId}`, {
          method: 'DELETE',
        });
      }
      
      // Refresh network and exit select mode
      await fetchNetwork();
      setSelectedIds(new Set());
      setSelectMode(false);
      setDisconnectConfirmOpen(false);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    } finally {
      setDisconnecting(false);
    }
  };
  
  const handleMergeClick = useCallback(async (profileId: string) => {
    // Get the current search query from NetworkTree - for now, we'll search for the profile name
    try {
      const profileRes = await fetch(`/api/profiles/${profileId}`);
      const profileData = await profileRes.json();
      const profileName = profileData.profile.name;
      
      // Search for duplicates
      const searchRes = await fetch(`/api/profiles/search?q=${encodeURIComponent(profileName)}`);
      const searchData = await searchRes.json();
      
      // Find other profiles with similar names (handles married names, different formats)
      const profile = searchData.results?.find((r: any) => r.id === profileId);
      if (!profile) return;
      
      const similarProfiles = searchData.results?.filter((r: any) => 
        r.id !== profileId && 
        areNamesSimilar(r.name, profile.name)
      ) || [];
      
      if (similarProfiles.length === 0) {
        alert('No other profiles with similar names found in search results.');
        return;
      }
      
      const profileB = similarProfiles[0];
      const resB = await fetch(`/api/profiles/${profileB.id}`);
      const dataB = await resB.json();
      
      setMergeProfiles({
        profileA: {
          id: profileData.profile.id,
          name: profileData.profile.name,
          profilePicture: profileData.profile.profilePicture,
          linkedUserId: profileData.profile.linkedUserId || null,
          eventCount: profileData.events?.length || 0,
          connectionCount: profileData.connections?.length || 0,
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
  }, []);
  
  const handleMerge = async (keepProfileId: string, mergeOptions: any) => {
    if (!mergeProfiles) return;
    
    const mergeProfileId = keepProfileId === mergeProfiles.profileA.id 
      ? mergeProfiles.profileB.id 
      : mergeProfiles.profileA.id;
    
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
    
    // Refresh network
    await fetchNetwork();
    setMergeModalOpen(false);
    setMergeProfiles(null);
    
    // Clear search and return to main connections view
    networkTreeRef.current?.clearSearch();
  };
  
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
            : showAll 
              ? 'All Profiles' 
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
                variant="secondary"
                onClick={() => setDisconnectConfirmOpen(true)}
                disabled={selectedIds.size === 0}
                className="text-red-600 hover:bg-red-50"
              >
                <UserMinus className="w-4 h-4 mr-1" />
                Disconnect
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
              {isAdmin && (
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={handleShowAllToggle}
                >
                  {showAll ? 'Show Connections' : 'Show All'}
                </Button>
              )}
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
          isAdmin={isAdmin}
          onMergeClick={handleMergeClick}
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
        onSuggest={handleSuggest}
      />
      
      {/* Merge Modal */}
      {mergeProfiles && (
        <MergeProfilesModal
          isOpen={mergeModalOpen}
          onClose={() => {
            setMergeModalOpen(false);
            setMergeProfiles(null);
          }}
          profileA={mergeProfiles.profileA}
          profileB={mergeProfiles.profileB}
          onMerge={handleMerge}
        />
      )}
      
      {/* Disconnect Confirmation Modal */}
      {disconnectConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <UserMinus className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="font-display text-lg font-bold text-gray-900">
                  Disconnect {selectedIds.size} {selectedIds.size === 1 ? 'person' : 'people'}?
                </h2>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                You will no longer see their events or get reminders about them. 
                This only affects your connection to them.
              </p>
              
              {/* Show selected profiles */}
              <div className="bg-gray-50 rounded-lg p-3 mb-6 max-h-40 overflow-y-auto">
                <div className="space-y-2">
                  {selectedProfiles.slice(0, 10).map(profile => (
                    <div key={profile.id} className="flex items-center gap-2">
                      <Avatar src={profile.profilePicture} name={profile.name} size="sm" />
                      <span className="text-sm text-gray-700">{profile.name}</span>
                    </div>
                  ))}
                  {selectedProfiles.length > 10 && (
                    <p className="text-xs text-gray-500">
                      +{selectedProfiles.length - 10} more
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setDisconnectConfirmOpen(false)}
                  disabled={disconnecting}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={handleBulkDisconnect}
                  loading={disconnecting}
                >
                  Disconnect
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
