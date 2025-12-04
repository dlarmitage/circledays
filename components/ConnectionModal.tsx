'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { X, UserPlus, Users } from 'lucide-react';

interface MutualConnection {
  id: string;
  name: string;
  profilePicture: string | null;
}

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: {
    id: string;
    name: string;
    profilePicture: string | null;
    isClaimed: boolean; // Has a linked user account
    connectionCount: number;
  } | null;
  mutualConnections: MutualConnection[];
  onConnect: (profileId: string) => Promise<void>;
}

export function ConnectionModal({
  isOpen,
  onClose,
  profile,
  mutualConnections,
  onConnect,
}: ConnectionModalProps) {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  
  if (!isOpen || !profile) return null;
  
  const handleConnect = async () => {
    setConnecting(true);
    try {
      await onConnect(profile.id);
      setConnected(true);
      // Close modal after short delay to show success
      setTimeout(() => {
        onClose();
        setConnected(false);
      }, 1500);
    } catch (error) {
      console.error('Failed to connect:', error);
    } finally {
      setConnecting(false);
    }
  };
  
  const othersCount = profile.connectionCount - mutualConnections.length;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm"
      >
        <Card padding="lg" className="relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
          
          {/* Profile Info */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="grayscale mb-4">
              <Avatar
                src={profile.profilePicture}
                name={profile.name}
                size="xl"
              />
            </div>
            <h2 className="font-display text-xl font-bold text-gray-900">
              {profile.name}
            </h2>
          </div>
          
          {/* Mutual Connections */}
          {mutualConnections.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-medium text-gray-700">
                  Mutual connections
                </span>
              </div>
              <div className="space-y-2">
                {mutualConnections.slice(0, 5).map((mutual) => (
                  <div
                    key={mutual.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-gray-50"
                  >
                    <Avatar
                      src={mutual.profilePicture}
                      name={mutual.name}
                      size="sm"
                    />
                    <span className="text-sm text-gray-900">{mutual.name}</span>
                  </div>
                ))}
                {mutualConnections.length > 5 && (
                  <p className="text-xs text-gray-500 pl-2">
                    +{mutualConnections.length - 5} more mutual connections
                  </p>
                )}
              </div>
              {othersCount > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  Also connected to {othersCount} others
                </p>
              )}
            </div>
          )}
          
          {/* No mutual connections */}
          {mutualConnections.length === 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl text-center">
              <p className="text-sm text-gray-500">
                Connected to {profile.connectionCount} people
              </p>
            </div>
          )}
          
          {/* Connect Button */}
          {connected ? (
            <div className="flex items-center justify-center gap-2 p-3 bg-green-50 rounded-xl text-green-700">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15 }}
              >
                ✓
              </motion.div>
              <span className="font-medium">
                {profile.isClaimed ? 'Request sent!' : 'Connected!'}
              </span>
            </div>
          ) : (
            <Button
              onClick={handleConnect}
              loading={connecting}
              className="w-full"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Connect
            </Button>
          )}
          
          {/* Info text for claimed profiles */}
          {profile.isClaimed && !connected && (
            <p className="text-xs text-gray-400 text-center mt-3">
              {profile.name.split(' ')[0]} will receive a connection request
            </p>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}

