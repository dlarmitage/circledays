'use client';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Pencil,
  Mail,
  UserPlus,
  UserMinus,
  Trash2,
  Lock,
} from 'lucide-react';

interface ProfileHeaderProps {
  profile: {
    id: string;
    name: string;
    profilePicture: string | null;
    linkedUserId: string | null;
    isPrivate?: boolean;
  };
  isOwnProfile: boolean;
  isCreator: boolean;
  isDirectConnection: boolean;
  isPlatformAdmin: boolean;
  hopDistance?: number;
  canEdit: boolean;
  canDelete: boolean;
  canDisconnect: boolean;
  onEdit: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onDelete: () => void;
  onInvite: () => void;
  // Card nudge
  showCardNudge: boolean;
  nudgeText: string | null;
  onSendCard: () => void;
}

export function ProfileHeader({
  profile,
  isCreator,
  isDirectConnection,
  hopDistance,
  canEdit,
  canDelete,
  canDisconnect,
  onEdit,
  onConnect,
  onDisconnect,
  onDelete,
  onInvite,
  showCardNudge,
  nudgeText,
  onSendCard,
}: ProfileHeaderProps) {
  return (
    <>
      {/* Profile Header Card */}
      <Card className="mb-6">
        <CardContent className="flex flex-col items-center text-center py-8">
          <Avatar
            src={profile.profilePicture}
            name={profile.name}
            size="xl"
            className="mb-4"
          />
          <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">
            {profile.name}
          </h1>

          {!isDirectConnection && hopDistance && (
            <Badge variant="info" className="mb-4">
              {hopDistance} hops away
            </Badge>
          )}

          {!profile.linkedUserId && isCreator && (
            <Badge variant="default" className="mb-4">
              Not on CircleDays yet
            </Badge>
          )}

          {profile.isPrivate && (
            <Badge variant="warning" className="mb-4">
              <Lock className="w-3 h-3 mr-1" />
              Private
            </Badge>
          )}

          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {canEdit ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={onEdit}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            ) : !isDirectConnection ? (
              <Button onClick={onConnect}>
                <UserPlus className="w-4 h-4 mr-2" />
                {hopDistance && hopDistance <= 2 ? 'Connect' : 'Request Connection'}
              </Button>
            ) : null}

            {isCreator && !profile.linkedUserId && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onInvite}
              >
                <Mail className="w-4 h-4 mr-2" />
                Invite
              </Button>
            )}

            {canDisconnect && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onDisconnect}
              >
                <UserMinus className="w-4 h-4 mr-2" />
                Remove from My Circle
              </Button>
            )}

            {canDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card Sending Nudge */}
      {showCardNudge && nudgeText && (
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border border-teal-100 p-5 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <p className="text-gray-700 font-medium text-sm leading-relaxed">
              {nudgeText}
            </p>
            <button
              onClick={onSendCard}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-sm font-semibold hover:from-teal-600 hover:to-emerald-700 transition-all shadow-sm hover:shadow-md"
            >
              <Mail className="w-4 h-4" />
              Send a Card
            </button>
          </div>
        </div>
      )}
    </>
  );
}
