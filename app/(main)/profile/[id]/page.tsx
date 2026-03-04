'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ConfirmModal } from '@/components/ConfirmModal';
import { InviteModal } from '@/components/InviteModal';
import { AddEventModal } from '@/components/AddEventModal';
import { EditEventModal } from '@/components/EditEventModal';
import { SendCardModal } from '@/components/SendCardModal';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { AccountDetails } from '@/components/profile/AccountDetails';
import { ProfileEvents } from '@/components/profile/ProfileEvents';
import { ProfileNotes } from '@/components/profile/ProfileNotes';
import { ProfileConnections } from '@/components/profile/ProfileConnections';
import { useCardNudge } from '@/components/profile/useCardNudge';
import type { ProfileData, ProfileEvent } from '@/components/profile/types';
import { ArrowLeft, UserPlus } from 'lucide-react';

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ProfileEvent | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [disconnectingConnection, setDisconnectingConnection] = useState<{ profileId: string; name: string } | null>(null);
  const [showAllConnections, setShowAllConnections] = useState(false);
  const [showSendCardModal, setShowSendCardModal] = useState(false);
  const nudgeText = useCardNudge(data);

  useEffect(() => { fetchProfileData(); }, [id]);

  const fetchProfileData = async () => {
    try {
      const res = await fetch(`/api/profiles/${id}`);
      setData(await res.json());
      setLoading(false);
    } catch { router.push('/dashboard'); }
  };

  const handleConnect = async () => {
    const res = await fetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: id }),
    });
    if (res.ok) window.location.reload();
  };

  const handleDisconnect = async () => {
    if (!data?.connectionId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/connections/${data.connectionId}`, { method: 'DELETE' });
      if (res.ok) { setShowDisconnectModal(false); router.push('/dashboard'); }
    } finally { setActionLoading(false); }
  };

  const handleAdminDisconnect = async (otherProfileId: string) => {
    if (!data?.profile?.id || !data?.isPlatformAdmin) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/connections/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileIdA: data.profile.id, profileIdB: otherProfileId }),
      });
      if (res.ok) { setDisconnectingConnection(null); fetchProfileData(); }
      else { const error = await res.json(); alert(error.error || 'Failed to disconnect'); }
    } finally { setActionLoading(false); }
  };

  const handleDeleteProfile = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
      if (res.ok) { setShowDeleteModal(false); router.push('/dashboard'); }
    } finally { setActionLoading(false); }
  };

  const handleSaveAccountField = async (field: 'email' | 'mobile', value: string) => {
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value || null }),
    });
    if (res.ok) fetchProfileData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!data?.profile) return null;

  const { profile, events, connections, isDirectConnection, isOwnProfile, isCreator } = data;
  const canEdit = isOwnProfile || (isCreator && !profile.linkedUserId) || !!data.isPlatformAdmin;
  const canDelete = (isCreator && !profile.linkedUserId) || isOwnProfile;
  const canDisconnect = isDirectConnection && !isOwnProfile;
  const showCardNudge = isDirectConnection && !isOwnProfile && !!data.isPlatformAdmin;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <Button size="sm" onClick={() => router.push('/add-person')}>
          <UserPlus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      <ProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        isCreator={isCreator}
        isDirectConnection={isDirectConnection}
        isPlatformAdmin={!!data.isPlatformAdmin}
        hopDistance={data.hopDistance}
        canEdit={canEdit}
        canDelete={canDelete}
        canDisconnect={canDisconnect}
        onEdit={() => router.push(`/profile/${id}/edit`)}
        onConnect={handleConnect}
        onDisconnect={() => setShowDisconnectModal(true)}
        onDelete={() => setShowDeleteModal(true)}
        onInvite={() => setShowInviteModal(true)}
        showCardNudge={showCardNudge}
        nudgeText={nudgeText}
        onSendCard={() => setShowSendCardModal(true)}
      />

      {isOwnProfile && data.userData && (
        <AccountDetails userData={data.userData} onSaveField={handleSaveAccountField} />
      )}

      {isDirectConnection && (
        <ProfileEvents events={events} onEditEvent={setEditingEvent} onAddEvent={() => setShowAddEventModal(true)} />
      )}

      {isDirectConnection && !isOwnProfile && (
        <ProfileNotes profileId={id} initialContent={data.note?.content || ''} />
      )}

      {isDirectConnection && (
        <ProfileConnections
          profileName={profile.name}
          connections={connections}
          showAll={showAllConnections}
          onToggleShowAll={() => setShowAllConnections(!showAllConnections)}
          onDisconnect={(profileId, name) => setDisconnectingConnection({ profileId, name })}
          isAdmin={!!data.isPlatformAdmin}
        />
      )}

      {/* Modals */}
      <ConfirmModal
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        onConfirm={handleDisconnect}
        title="Disconnect"
        message={`Are you sure you want to disconnect from ${profile.name}? You'll no longer receive reminders about their occasions.`}
        confirmLabel="Disconnect"
        loading={actionLoading}
      />
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteProfile}
        title="Delete Profile"
        message={`Are you sure you want to delete ${profile.name}'s profile? This will remove all their occasions and cannot be undone.`}
        confirmLabel="Delete"
        loading={actionLoading}
      />
      {disconnectingConnection && (
        <ConfirmModal
          isOpen={!!disconnectingConnection}
          onClose={() => setDisconnectingConnection(null)}
          onConfirm={() => handleAdminDisconnect(disconnectingConnection.profileId)}
          title="Disconnect (Admin)"
          message={`Are you sure you want to disconnect ${profile.name} and ${disconnectingConnection.name}? This action cannot be undone.`}
          confirmLabel="Disconnect"
          loading={actionLoading}
        />
      )}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        profileId={profile.id}
        profileName={profile.name}
        connections={(data.userConnections || []).map(c => ({
          id: c.id, profileId: c.id, name: c.name, profilePicture: c.profilePicture,
        }))}
        userProfileId={data.userProfileId || ''}
      />
      <AddEventModal
        isOpen={showAddEventModal}
        onClose={() => setShowAddEventModal(false)}
        profileId={profile.id}
        profileName={profile.name}
        onEventAdded={fetchProfileData}
      />
      <EditEventModal
        isOpen={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        event={editingEvent}
        profileName={profile.name}
        onEventUpdated={fetchProfileData}
      />
      <SendCardModal
        isOpen={showSendCardModal}
        onClose={() => setShowSendCardModal(false)}
        profileId={profile.id}
        profileName={profile.name}
        profilePicture={profile.profilePicture}
        eventType="thinking of you"
      />
    </div>
  );
}
