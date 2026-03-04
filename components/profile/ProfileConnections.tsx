'use client';

import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Users, UserMinus } from 'lucide-react';

interface Connection {
  id: string;
  name: string;
  profilePicture: string | null;
}

interface ProfileConnectionsProps {
  profileName: string;
  connections: Connection[];
  showAll: boolean;
  onToggleShowAll: () => void;
  onDisconnect: (profileId: string, name: string) => void;
  isAdmin: boolean;
}

export function ProfileConnections({
  profileName,
  connections,
  showAll,
  onToggleShowAll,
  onDisconnect,
  isAdmin,
}: ProfileConnectionsProps) {
  const router = useRouter();

  if (connections.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-teal-600" />
          {profileName}&apos;s Circle
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(showAll ? connections : connections.slice(0, 9)).map(connection => (
            <div
              key={connection.id}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <button
                onClick={() => router.push(`/profile/${connection.id}`)}
                className="flex items-center gap-2 flex-1 text-left min-w-0"
              >
                <Avatar
                  src={connection.profilePicture}
                  name={connection.name}
                  size="sm"
                />
                <span className="text-sm font-medium text-gray-900 truncate">
                  {connection.name}
                </span>
              </button>
              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDisconnect(connection.id, connection.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-red-600 transition-opacity"
                  title="Disconnect (Admin)"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {connections.length > 9 && (
          <button
            onClick={onToggleShowAll}
            className="text-sm text-teal-600 hover:text-teal-700 font-medium mt-3 transition-colors"
          >
            {showAll
              ? `Show less (hide ${connections.length - 9})`
              : `+${connections.length - 9} more connections`
            }
          </button>
        )}
      </CardContent>
    </Card>
  );
}
