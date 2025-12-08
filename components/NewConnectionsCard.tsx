'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { UserPlus, X, Check, UserMinus } from 'lucide-react';
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
            className="text-xs text-teal-600 hover:text-teal-800 transition-colors"
          >
            Dismiss all
          </button>
        </div>
        <p className="text-sm text-teal-600 mt-1">
          {connections.length === 1 
            ? 'Someone connected with you!' 
            : `${connections.length} people connected with you!`}
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
                      {new Date(conn.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
                
                <div className="flex items-center gap-2 ml-2">
                  {/* Keep connection (dismiss notification) */}
                  <button
                    onClick={() => onDismiss(conn.connectionId)}
                    className="p-2 rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                    title="Keep connection"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  
                  {/* Disconnect option */}
                  <button
                    onClick={() => handleDisconnect(conn.connectionId)}
                    disabled={disconnecting === conn.connectionId}
                    className="p-2 rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                    title="Disconnect"
                  >
                    {disconnecting === conn.connectionId ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <X className="w-4 h-4" />
                      </motion.div>
                    ) : (
                      <UserMinus className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

