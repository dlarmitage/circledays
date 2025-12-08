'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface NewConnection {
  connectionId: string;
  profile: {
    id: string;
    name: string;
    profilePicture: string | null;
  };
  createdAt: string;
  createdByUserId: string | null;
}

interface NewConnectionsCardProps {
  connections: NewConnection[];
  onDismiss: (connectionId: string) => void;
  onDisconnect: (connectionId: string) => Promise<void>;
  onDismissAll: () => void;
}

export function NewConnectionsCard({
  connections,
  onDismiss,
  onDisconnect,
  onDismissAll,
}: NewConnectionsCardProps) {
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  
  if (connections.length === 0) return null;
  
  const handleDisconnect = async (connectionId: string) => {
    setDisconnecting(connectionId);
    try {
      await onDisconnect(connectionId);
    } finally {
      setDisconnecting(null);
    }
  };
  
  return (
    <Card className="mb-6 border-teal-200 bg-teal-50/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-teal-700">
            <UserPlus className="w-5 h-5" />
            New Connections
          </CardTitle>
          <button
            onClick={onDismissAll}
            className="text-xs text-teal-600 hover:text-teal-800 transition-colors font-medium"
          >
            Got it
          </button>
        </div>
        <p className="text-sm text-teal-600 mt-1">
          {connections.length === 1 
            ? 'Someone connected with you! You can now see their events.' 
            : `${connections.length} people connected with you! You can now see their events.`}
        </p>
      </CardHeader>
      
      <CardContent className="pt-2">
        <AnimatePresence mode="popLayout">
          <div className="space-y-2">
            {connections.map((conn) => (
              <motion.div
                key={conn.connectionId}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 100, transition: { duration: 0.2 } }}
                className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm"
              >
                <Link
                  href={`/profile/${conn.profile.id}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <Avatar
                    src={conn.profile.profilePicture}
                    name={conn.profile.name}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {conn.profile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Connected {new Date(conn.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
                
                {/* Only show disconnect option - connections are already active */}
                <button
                  onClick={() => handleDisconnect(conn.connectionId)}
                  disabled={disconnecting === conn.connectionId}
                  className="p-2 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50 ml-2"
                  title="Disconnect"
                >
                  {disconnecting === conn.connectionId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserMinus className="w-4 h-4" />
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
        
        <p className="text-xs text-gray-500 mt-3 text-center">
          Tap a name to view their profile, or disconnect if you prefer not to be connected.
        </p>
      </CardContent>
    </Card>
  );
}

