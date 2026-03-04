// Handwritten cards
export const CARD_CHAR_LIMIT = 320; // fallback default when no card-specific limit is available
export const DEFAULT_HANDWRYTTEN_CHAR_LIMIT = 500;

// Credit bundle pricing — single source of truth
export const CREDIT_BUNDLES = [
  { id: 'bundle_1', quantity: 1, label: '1 card', priceUsd: 5.00 },
  { id: 'bundle_5', quantity: 5, label: '5 cards', priceUsd: 25.00 },
  { id: 'bundle_10', quantity: 10, label: '10 cards', priceUsd: 50.00 },
] as const;

// User-facing strings - centralized for future i18n
export const STRINGS = {
  app: {
    name: 'CircleDays',
    tagline: 'Never miss a special day',
    description: 'Track birthdays and special dates for the people you care about.',
  },
  auth: {
    signIn: 'Sign In',
    signOut: 'Sign Out',
    enterEmail: 'Enter your email',
    sendMagicLink: 'Send Magic Link',
    checkEmail: 'Check your email',
    magicLinkSent: 'We sent you a magic link to sign in.',
    linkExpired: 'This link has expired. Please request a new one.',
  },
  onboarding: {
    welcome: 'Welcome to CircleDays',
    setupProfile: 'Let\'s set up your profile',
    enterName: 'What should we call you?',
    selectTimezone: 'What\'s your timezone?',
    addMobile: 'Add your mobile (optional)',
    notificationPref: 'How would you like to be notified?',
    addBirthday: 'When\'s your birthday?',
  },
  dashboard: {
    title: 'Dashboard',
    upcoming: 'Upcoming',
    nothingUpcoming: 'No upcoming occasions',
    addPeople: 'Add people you care about to get started.',
    today: 'Today',
    tomorrow: 'Tomorrow',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    later: 'Later',
  },
  network: {
    title: 'Network',
    myNetwork: 'My Network',
    connections: 'connections',
    noConnections: 'Your network is empty',
    startBuilding: 'Add your first connection to start building your network.',
  },
  profile: {
    addPerson: 'Add Person',
    editProfile: 'Edit Profile',
    events: 'Occasions',
    notes: 'My Notes',
    notesPlaceholder: 'Add private notes about this person...',
    addEvent: 'Add Occasion',
    invite: 'Invite to Join',
    connect: 'Connect',
    requestConnection: 'Request Connection',
    disconnect: 'Disconnect',
    pendingInvite: 'Invite Pending',
  },
  events: {
    birthday: 'Birthday',
    anniversary: 'Anniversary',
    custom: 'Custom Occasion',
    turningAge: 'turning',
  },
  settings: {
    title: 'Settings',
    myProfile: 'My Profile',
    account: 'Account',
    notifications: 'Notifications',
    import: 'Import',
    deleteAccount: 'Delete Account',
    reminderDays: 'Remind me',
    daysBeforePlural: 'days before',
    daysBefore: 'day before',
    onTheDay: 'on the day',
  },
  discoveries: {
    bannerTitle: 'People You May Want to Celebrate',
    bannerSubtitle: 'Your connections have added some new people you might be interested in celebrating.',
    modalTitle: 'People to Celebrate',
    showMe: 'Show Me',
    dismiss: 'Not Now',
    addedBy: 'Added by',
    added: 'Added!',
    addToMyCircle: 'Add',
  },
  privacy: {
    title: 'Privacy',
    shareNewConnections: 'Share new connections',
    shareNewConnectionsDescription: 'When enabled, people you add may be suggested to your connections as people they might want to celebrate too.',
  },
  errors: {
    generic: 'Something went wrong. Please try again.',
    notFound: 'Not found',
    unauthorized: 'Please sign in to continue.',
    rateLimited: 'Too many requests. Please wait a moment.',
  },
} as const;

// Default reminder lead days
export const DEFAULT_LEAD_DAYS = [0, 1, 7];

// Notification channels
export const NOTIFICATION_CHANNELS = [
  { value: 'email', label: 'Email only' },
  { value: 'sms', label: 'SMS only' },
  { value: 'both', label: 'Both email and SMS' },
] as const;

// Event types
export const EVENT_TYPES = [
  { value: 'birthday', label: 'Birthday' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'custom', label: 'Custom Occasion' },
] as const;

// Tone options for card compose (handwritten cards)
export const CARD_TONE_OPTIONS = [
  { value: 'warm and sincere', label: 'Warm' },
  { value: 'funny and lighthearted', label: 'Funny' },
  { value: 'heartfelt and emotional', label: 'Heartfelt' },
  { value: 'casual and friendly', label: 'Casual' },
  { value: 'grateful and appreciative', label: 'Grateful' },
] as const;

// Tone options for message assist (text messages)
export const MESSAGE_TONE_OPTIONS = [
  { value: 'warm', label: 'Warm', emoji: '\u{1F49B}' },
  { value: 'casual', label: 'Casual', emoji: '\u{1F44B}' },
  { value: 'formal', label: 'Formal', emoji: '\u{1F3A9}' },
  { value: 'playful', label: 'Playful', emoji: '\u{1F389}' },
] as const;

// Common timezones for quick selection
export const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
] as const;


