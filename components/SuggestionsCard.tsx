'use client';

import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Users, Check, X, ChevronDown, ChevronUp } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  profilePicture: string | null;
}

interface Suggestion {
  id: string;
  profile: Profile;
  createdAt: string;
}

interface SuggestionGroup {
  fromUser: {
    id: string;
    name: string;
  };
  suggestions: Suggestion[];
}

interface SuggestionsCardProps {
  groups: SuggestionGroup[];
  onAccept: (suggestionId: string) => Promise<void>;
  onDecline: (suggestionId: string) => Promise<void>;
  onAcceptAll: () => Promise<void>;
  onRefresh: () => void;
}

export function SuggestionsCard({
  groups,
  onAccept,
  onDecline,
  onAcceptAll,
  onRefresh,
}: SuggestionsCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [acceptingAll, setAcceptingAll] = useState(false);
  
  const totalCount = groups.reduce((sum, g) => sum + g.suggestions.length, 0);
  
  if (groups.length === 0 || totalCount === 0) {
    return null;
  }
  
  const handleAccept = async (suggestionId: string) => {
    setProcessing(suggestionId);
    try {
      await onAccept(suggestionId);
      onRefresh();
    } catch (err) {
      console.error('Failed to accept:', err);
    } finally {
      setProcessing(null);
    }
  };
  
  const handleDecline = async (suggestionId: string) => {
    setProcessing(suggestionId);
    try {
      await onDecline(suggestionId);
      onRefresh();
    } catch (err) {
      console.error('Failed to decline:', err);
    } finally {
      setProcessing(null);
    }
  };
  
  const handleAcceptAll = async () => {
    setAcceptingAll(true);
    try {
      await onAcceptAll();
      onRefresh();
    } catch (err) {
      console.error('Failed to accept all:', err);
    } finally {
      setAcceptingAll(false);
    }
  };
  
  return (
    <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-teal-700">
            <Users className="w-5 h-5" />
            Suggested Connections
            <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-teal-100 text-teal-700 rounded-full">
              {totalCount}
            </span>
          </CardTitle>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-teal-100 rounded-full transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-teal-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-teal-600" />
            )}
          </button>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-2">
          {/* Accept All button */}
          {totalCount > 1 && (
            <div className="mb-4">
              <Button
                size="sm"
                className="w-full"
                onClick={handleAcceptAll}
                disabled={acceptingAll}
                loading={acceptingAll}
              >
                <Check className="w-4 h-4 mr-2" />
                Accept All ({totalCount})
              </Button>
            </div>
          )}
          
          {/* Grouped suggestions */}
          <div className="space-y-4">
            {groups.map(group => (
              <div key={group.fromUser.id}>
                <p className="text-xs font-medium text-gray-500 mb-2">
                  From {group.fromUser.name}
                </p>
                <div className="space-y-2">
                  {group.suggestions.map(suggestion => (
                    <div
                      key={suggestion.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-white border border-gray-100"
                    >
                      <Avatar
                        src={suggestion.profile.profilePicture}
                        name={suggestion.profile.name}
                        size="sm"
                      />
                      <span className="flex-1 font-medium text-gray-900 text-sm truncate">
                        {suggestion.profile.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDecline(suggestion.id)}
                          disabled={processing === suggestion.id}
                          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                          title="Decline"
                        >
                          <X className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleAccept(suggestion.id)}
                          disabled={processing === suggestion.id}
                          className="p-1.5 hover:bg-teal-100 rounded-full transition-colors disabled:opacity-50"
                          title="Accept"
                        >
                          <Check className="w-4 h-4 text-teal-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

