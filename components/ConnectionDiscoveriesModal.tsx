'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Users, X, UserPlus, Check, Loader2 } from 'lucide-react';
import { STRINGS } from '@/lib/constants';

export interface Discovery {
  profileId: string;
  name: string;
  profilePicture: string | null;
  createdAt: string;
  addedBy: {
    name: string;
    profilePicture: string | null;
  };
}

interface ConnectionDiscoveriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  discoveries: Discovery[];
  onAdd: (profileId: string) => Promise<void>;
  onDismiss: (profileId: string) => void;
}

export function ConnectionDiscoveriesModal({
  isOpen,
  onClose,
  discoveries,
  onAdd,
  onDismiss,
}: ConnectionDiscoveriesModalProps) {
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleAdd = async (profileId: string) => {
    setAddingId(profileId);
    try {
      await onAdd(profileId);
      setAddedIds(prev => new Set([...prev, profileId]));
      // Brief success state, then remove from list
      setTimeout(() => {
        onDismiss(profileId);
      }, 1200);
    } finally {
      setAddingId(null);
    }
  };

  // Group discoveries by who added them
  const grouped = discoveries.reduce((acc, d) => {
    const key = d.addedBy.name;
    if (!acc[key]) acc[key] = { addedBy: d.addedBy, profiles: [] };
    acc[key].profiles.push(d);
    return acc;
  }, {} as Record<string, { addedBy: Discovery['addedBy']; profiles: Discovery[] }>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-semibold">
                {STRINGS.discoveries.modalTitle}
              </h2>
              <p className="text-sm text-white/80 mt-0.5">
                {discoveries.length} {discoveries.length === 1 ? 'person' : 'people'} your connections have added
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <CardContent className="flex-1 overflow-auto p-4 space-y-6">
          {discoveries.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500">No new people to discover right now.</p>
            </div>
          ) : (
            Object.entries(grouped).map(([groupName, group]) => (
              <div key={groupName}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  {STRINGS.discoveries.addedBy} {groupName}
                </p>
                <AnimatePresence mode="popLayout">
                  <div className="space-y-2">
                    {group.profiles.map(discovery => {
                      const isAdded = addedIds.has(discovery.profileId);
                      const isAdding = addingId === discovery.profileId;

                      return (
                        <motion.div
                          key={discovery.profileId}
                          layout
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 100, transition: { duration: 0.2 } }}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar
                              src={discovery.profilePicture}
                              name={discovery.name}
                              size="md"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 truncate">
                                {discovery.name}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-2">
                            {isAdded ? (
                              <span className="flex items-center gap-1 text-sm text-emerald-600 font-medium">
                                <Check className="w-4 h-4" />
                                {STRINGS.discoveries.added}
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => onDismiss(discovery.profileId)}
                                  disabled={isAdding}
                                  className="p-2 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors disabled:opacity-50"
                                  title="Dismiss"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                                <Button
                                  size="sm"
                                  onClick={() => handleAdd(discovery.profileId)}
                                  loading={isAdding}
                                >
                                  <UserPlus className="w-4 h-4 mr-1" />
                                  {STRINGS.discoveries.addToMyCircle}
                                </Button>
                              </>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </AnimatePresence>
              </div>
            ))
          )}
        </CardContent>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            Adding a person connects them to your circle so you can see and celebrate their events.
          </p>
        </div>
      </Card>
    </div>
  );
}
