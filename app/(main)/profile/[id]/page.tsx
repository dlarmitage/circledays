'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { InviteModal } from '@/components/InviteModal';
import { AddEventModal } from '@/components/AddEventModal';
import { EditEventModal } from '@/components/EditEventModal';
import { formatDate, calculateAge, getDaysUntilText, daysUntil } from '@/lib/utils';
import {
  ArrowLeft,
  Cake,
  Heart,
  Calendar,
  StickyNote,
  Users,
  UserPlus,
  UserMinus,
  Mail,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  Phone,
  Check,
  User,
} from 'lucide-react';

interface Event {
  id: string;
  type: 'birthday' | 'anniversary' | 'custom';
  customLabel: string | null;
  date: string;
  recurring?: boolean;
}

interface Connection {
  id: string;
  name: string;
  profilePicture: string | null;
}

interface ProfileData {
  profile: {
    id: string;
    name: string;
    profilePicture: string | null;
    linkedUserId: string | null;
    createdByUserId: string;
  };
  events: Event[];
  note: { content: string } | null;
  connections: Connection[];
  userConnections?: Connection[];
  connectionId?: string;
  isDirectConnection: boolean;
  isOwnProfile: boolean;
  isCreator: boolean;
  hopDistance?: number;
  userProfileId?: string;
  userData?: {
    email: string;
    mobile: string | null;
    timezone: string;
    notificationChannel: 'email' | 'sms' | 'both';
  };
}

// Confirmation Modal Component
function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  loading: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-large max-w-md w-full p-6 animate-slide-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-coral-50 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-coral-600" />
          </div>
          <h2 className="font-display text-lg font-semibold text-gray-900">
            {title}
          </h2>
        </div>
        
        <p className="text-gray-600 mb-6">
          {message}
        </p>
        
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading} className="flex-1">
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Account editing state (for own profile)
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingMobile, setEditingMobile] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  const [mobileValue, setMobileValue] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  
  useEffect(() => {
    fetchProfileData();
  }, [id]);
  
  const fetchProfileData = async () => {
    try {
      const res = await fetch(`/api/profiles/${id}`);
      const profileData = await res.json();
      setData(profileData);
      setNoteContent(profileData.note?.content || '');
      setLoading(false);
    } catch {
      router.push('/dashboard');
    }
  };
  
  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      await fetch(`/api/profiles/${id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteContent }),
      });
    } finally {
      setSavingNote(false);
    }
  };
  
  const handleConnect = async () => {
    const res = await fetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: id }),
    });
    
    if (res.ok) {
      window.location.reload();
    }
  };
  
  const handleDisconnect = async () => {
    if (!data?.connectionId) return;
    
    setActionLoading(true);
    try {
      const res = await fetch(`/api/connections/${data.connectionId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setShowDisconnectModal(false);
        router.push('/dashboard');
      }
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleDeleteProfile = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/profiles/${id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setShowDeleteModal(false);
        router.push('/dashboard');
      }
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleSaveAccountField = async (field: 'email' | 'mobile') => {
    setSavingAccount(true);
    try {
      const value = field === 'email' ? emailValue : mobileValue;
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [field]: value || null,
        }),
      });
      
      if (res.ok) {
        // Refresh data
        fetchProfileData();
        if (field === 'email') {
          setEditingEmail(false);
        } else {
          setEditingMobile(false);
        }
      }
    } finally {
      setSavingAccount(false);
    }
  };
  
  const startEditingEmail = () => {
    setEmailValue(data?.userData?.email || '');
    setEditingEmail(true);
  };
  
  const startEditingMobile = () => {
    setMobileValue(data?.userData?.mobile || '');
    setEditingMobile(true);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (!data?.profile) {
    return null;
  }
  
  const { profile, events, connections, isDirectConnection, isOwnProfile, isCreator } = data;
  
  // Can delete if: creator of an unlinked profile, or own profile
  const canDelete = (isCreator && !profile.linkedUserId) || isOwnProfile;
  
  // Can disconnect if: directly connected and not own profile
  const canDisconnect = isDirectConnection && !isOwnProfile;
  
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'birthday': return Cake;
      case 'anniversary': return Heart;
      default: return Calendar;
    }
  };
  
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header with Back and Add buttons */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
        
        <Button size="sm" onClick={() => router.push('/add-person')}>
          <UserPlus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>
      
      {/* Profile Header */}
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
          
          {!isDirectConnection && data.hopDistance && (
            <Badge variant="info" className="mb-4">
              {data.hopDistance} hops away
            </Badge>
          )}
          
          {!profile.linkedUserId && isCreator && (
            <Badge variant="default" className="mb-4">
              Not on CircleDays yet
            </Badge>
          )}
          
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {/* Can edit if: own profile, OR creator of unlinked profile */}
            {isOwnProfile || (isCreator && !profile.linkedUserId) ? (
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => router.push(`/profile/${id}/edit`)}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            ) : !isDirectConnection ? (
              <Button onClick={handleConnect}>
                <UserPlus className="w-4 h-4 mr-2" />
                {data.hopDistance && data.hopDistance <= 2 ? 'Connect' : 'Request Connection'}
              </Button>
            ) : null}
            
            {isCreator && !profile.linkedUserId && (
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setShowInviteModal(true)}
              >
                <Mail className="w-4 h-4 mr-2" />
                Invite
              </Button>
            )}
            
            {canDisconnect && (
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setShowDisconnectModal(true)}
              >
                <UserMinus className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            )}
            
            {canDelete && (
              <Button 
                variant="danger" 
                size="sm"
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Account Details - only for own profile */}
      {isOwnProfile && data.userData && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-teal-600" />
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Email
              </label>
              {editingEmail ? (
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={emailValue}
                    onChange={(e) => setEmailValue(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSaveAccountField('email')}
                    loading={savingAccount}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingEmail(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{data.userData.email}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={startEditingEmail}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            
            {/* Mobile */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Mobile Number
              </label>
              {editingMobile ? (
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    value={mobileValue}
                    onChange={(e) => setMobileValue(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSaveAccountField('mobile')}
                    loading={savingAccount}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingMobile(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className={data.userData.mobile ? 'text-gray-900' : 'text-gray-400 italic'}>
                      {data.userData.mobile || 'Not set'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={startEditingMobile}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Used for SMS reminders
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Events - only show for direct connections */}
      {isDirectConnection && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-gray-500 text-sm">No events yet</p>
            ) : (
              <div className="space-y-3">
                {events.map(event => {
                  const Icon = getEventIcon(event.type);
                  const eventDaysUntil = daysUntil(event.date, event.recurring ?? true);
                  const age = event.type === 'birthday' ? calculateAge(event.date) + 1 : null;
                  const isPastOneTime = !event.recurring && eventDaysUntil < 0;
                  
                  return (
                    <button
                      key={event.id}
                      onClick={() => setEditingEvent(event)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {event.type === 'custom' ? event.customLabel : event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(event.date, { month: 'long', day: 'numeric', year: 'numeric' })}
                            {age && ` · Turning ${age}`}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={isPastOneTime ? 'default' : eventDaysUntil === 0 ? 'danger' : eventDaysUntil <= 7 ? 'warning' : 'success'}
                      >
                        {getDaysUntilText(eventDaysUntil)}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
            
            {isDirectConnection && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-4"
                onClick={() => setShowAddEventModal(true)}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Notes - only for direct connections */}
      {isDirectConnection && !isOwnProfile && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-teal-600" />
              My Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Add private notes about this person..."
              className="w-full h-32 p-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSaveNote}
              loading={savingNote}
              className="mt-2"
            >
              Save Note
            </Button>
            <p className="text-xs text-gray-400 mt-2">
              Only you can see these notes
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Connections */}
      {isDirectConnection && connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              {profile.name}'s Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {connections.slice(0, 9).map(connection => (
                <button
                  key={connection.id}
                  onClick={() => router.push(`/profile/${connection.id}`)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
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
              ))}
            </div>
            {connections.length > 9 && (
              <p className="text-sm text-gray-500 mt-3">
                +{connections.length - 9} more connections
              </p>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Disconnect Confirmation Modal */}
      <ConfirmModal
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        onConfirm={handleDisconnect}
        title="Disconnect"
        message={`Are you sure you want to disconnect from ${profile.name}? You'll no longer receive reminders about their events.`}
        confirmText="Disconnect"
        loading={actionLoading}
      />
      
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteProfile}
        title="Delete Profile"
        message={`Are you sure you want to delete ${profile.name}'s profile? This will remove all their events and cannot be undone.`}
        confirmText="Delete"
        loading={actionLoading}
      />
      
      {/* Invite Modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        profileId={profile.id}
        profileName={profile.name}
        connections={(data.userConnections || []).map(c => ({
          id: c.id,
          profileId: c.id,
          name: c.name,
          profilePicture: c.profilePicture,
        }))}
        userProfileId={data.userProfileId || ''}
      />
      
      {/* Add Event Modal */}
      <AddEventModal
        isOpen={showAddEventModal}
        onClose={() => setShowAddEventModal(false)}
        profileId={profile.id}
        profileName={profile.name}
        onEventAdded={fetchProfileData}
      />
      
      {/* Edit Event Modal */}
      <EditEventModal
        isOpen={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        event={editingEvent}
        profileName={profile.name}
        onEventUpdated={fetchProfileData}
      />
    </div>
  );
}
