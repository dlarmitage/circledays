'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { NetworkTree, NetworkTreeHandle } from '@/components/NetworkTree';
import { ConnectionModal } from '@/components/ConnectionModal';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Plus, Users } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  profilePicture: string | null;
  connectionCount: number;
  isConnectedToUser: boolean;
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
      {/* Header with Add Person button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h1 className="font-display text-lg font-bold text-gray-900">
          Connections
        </h1>
        <Button size="sm" onClick={() => router.push('/add-person')}>
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
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
    </div>
  );
}
