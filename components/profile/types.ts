export interface ProfileEvent {
  id: string;
  type: 'birthday' | 'anniversary' | 'custom';
  customLabel: string | null;
  date: string;
  recurring?: boolean;
  isPrivate?: boolean;
  createdByUserId?: string | null;
}

export interface ProfileConnection {
  id: string;
  name: string;
  profilePicture: string | null;
}

export interface ProfileData {
  profile: {
    id: string;
    name: string;
    profilePicture: string | null;
    linkedUserId: string | null;
    createdByUserId: string;
    isPrivate?: boolean;
  };
  events: ProfileEvent[];
  note: { content: string } | null;
  connections: ProfileConnection[];
  userConnections?: ProfileConnection[];
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
  isPlatformAdmin?: boolean;
}
