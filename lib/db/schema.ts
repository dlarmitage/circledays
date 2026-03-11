import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  unique,
  date,
} from 'drizzle-orm/pg-core';

// Handwritten cards enums
export const cardOrderStatusEnum = pgEnum('card_order_status', ['pending', 'processing', 'written', 'complete', 'problem', 'cancelled']);
export const cardCreditTransactionTypeEnum = pgEnum('card_credit_transaction_type', ['purchase', 'use', 'refund']);

// Enums
export const notificationChannelEnum = pgEnum('notification_channel', ['email', 'sms', 'both', 'push']);
export const eventTypeEnum = pgEnum('event_type', ['birthday', 'anniversary', 'custom']);
export const connectionRequestStatusEnum = pgEnum('connection_request_status', ['pending', 'accepted', 'declined']);
export const inviteStatusEnum = pgEnum('invite_status', ['pending', 'accepted', 'expired']);
export const notificationStatusEnum = pgEnum('notification_status', ['sent', 'failed']);
export const suggestionStatusEnum = pgEnum('suggestion_status', ['pending', 'accepted', 'declined']);

// Users - represents a login/account
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  pendingEmail: text('pending_email'), // New email awaiting confirmation
  emailConfirmationToken: text('email_confirmation_token'), // Token for email confirmation
  name: text('name').notNull(),
  timezone: text('timezone').notNull().default('America/Denver'),
  mobile: text('mobile'),
  notificationChannel: notificationChannelEnum('notification_channel').notNull().default('email'),
  isPlatformAdmin: boolean('is_platform_admin').notNull().default(false),
  shareNewConnections: boolean('share_new_connections').notNull().default(true),
  nudgeOptedOut: boolean('nudge_opted_out').notNull().default(false),
  hasSeenWelcome: boolean('has_seen_welcome').notNull().default(false),
  pushEnabled: boolean('push_enabled').notNull().default(false),
  lastNudgeSentAt: timestamp('last_nudge_sent_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Profiles - represents a person being tracked
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  profilePicture: text('profile_picture'),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  linkedUserId: uuid('linked_user_id').references(() => users.id, { onDelete: 'set null' }),
  isPrivate: boolean('is_private').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Connections - symmetric edge between two profiles
export const connections = pgTable('connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileAId: uuid('profile_a_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  profileBId: uuid('profile_b_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  unique('unique_connection').on(table.profileAId, table.profileBId),
]);

// Connection Requests - pending requests for >2 hop connections
export const connectionRequests = pgTable('connection_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  fromProfileId: uuid('from_profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  toProfileId: uuid('to_profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  status: connectionRequestStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Events - special dates associated with a profile
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  type: eventTypeEnum('type').notNull(),
  customLabel: text('custom_label'),
  date: date('date').notNull(),
  recurring: boolean('recurring').notNull().default(true), // false for one-time events like graduation
  isPrivate: boolean('is_private').notNull().default(false), // only creator can see/get reminders
  createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Notes - private annotations on a profile
export const notes = pgTable('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Invites - invitations to join the platform
export const inviteContactTypeEnum = pgEnum('invite_contact_type', ['email', 'phone']);

export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(), // Stores email or phone depending on contactType
  contactType: inviteContactTypeEnum('contact_type').notNull().default('email'),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  invitedByUserId: uuid('invited_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  seedConnectionIds: uuid('seed_connection_ids').array(),
  token: text('token').notNull().unique(),
  status: inviteStatusEnum('status').notNull().default('pending'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Reminder Preferences - user's global reminder settings
export const reminderPreferences = pgTable('reminder_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  defaultLeadDays: integer('default_lead_days').array().notNull().default([0, 1, 3, 7, 14]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Reminder Overrides - per-event override of reminder settings
export const reminderOverrides = pgTable('reminder_overrides', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  muted: boolean('muted').notNull().default(false),
  customLeadDays: integer('custom_lead_days').array(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  unique('unique_user_event_override').on(table.userId, table.eventId),
]);

// Notification Log - record of sent notifications
export const notificationLogs = pgTable('notification_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  eventIds: uuid('event_ids').array().notNull(),
  channel: notificationChannelEnum('channel').notNull(),
  status: notificationStatusEnum('status').notNull(),
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at').notNull().defaultNow(),
});

// Magic Links - for passwordless authentication
export const magicLinks = pgTable('magic_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  code: text('code').notNull().default('000000'), // 6-digit verification code for PWA fallback
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Exchange Tokens - short-lived tokens for native app auth (Safari → WKWebView handoff)
export const exchangeTokens = pgTable('exchange_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  isNewUser: boolean('is_new_user').notNull().default(false),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Push Tokens - APNs device tokens for push notifications (multiple devices per user)
export const pushTokens = pgTable('push_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  platform: text('platform').notNull().default('ios'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at').notNull().defaultNow(),
});

// Connection Suggestions - recommend profiles to other users
export const connectionSuggestions = pgTable('connection_suggestions', {
  id: uuid('id').primaryKey().defaultRandom(),
  fromUserId: uuid('from_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  toUserId: uuid('to_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  suggestedProfileId: uuid('suggested_profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  status: suggestionStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  unique('unique_suggestion').on(table.toUserId, table.suggestedProfileId),
]);

// Types for application use
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Connection = typeof connections.$inferSelect;
export type NewConnection = typeof connections.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type Invite = typeof invites.$inferSelect;
export type ReminderPreference = typeof reminderPreferences.$inferSelect;
export type ReminderOverride = typeof reminderOverrides.$inferSelect;
export type NotificationLog = typeof notificationLogs.$inferSelect;
export type MagicLink = typeof magicLinks.$inferSelect;
export type ExchangeToken = typeof exchangeTokens.$inferSelect;
export type PushToken = typeof pushTokens.$inferSelect;
export type ConnectionSuggestion = typeof connectionSuggestions.$inferSelect;

// Login Analytics
export const loginMethodEnum = pgEnum('login_method', [
  'magic_link',
  'verification_code',
  'invite_accept',
  'onboarding',
  'exchange_token'
]);

export const loginEvents = pgTable('login_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  loginMethod: loginMethodEnum('login_method').notNull(),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type LoginEvent = typeof loginEvents.$inferSelect;

// Profile Addresses - stored mailing addresses entered manually by users
export const profileAddresses = pgTable('profile_addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  street: text('street').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  zip: text('zip').notNull(),
  country: text('country').notNull().default('US'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  unique('unique_profile_user_address').on(table.profileId, table.userId),
]);

// Card Preferences - per-user font, card, and sender address settings
export const cardPreferences = pgTable('card_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  fontId: text('font_id').notNull().default(''),
  cardId: text('card_id').notNull().default(''),
  signOff: text('sign_off'),
  senderName: text('sender_name'),
  senderAddress1: text('sender_address1'),
  senderCity: text('sender_city'),
  senderState: text('sender_state'),
  senderZip: text('sender_zip'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Card Credits - current balance per user
export const cardCredits = pgTable('card_credits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Card Credit Transactions - purchase/use ledger
export const cardCreditTransactions = pgTable('card_credit_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(), // positive = credit added, negative = card sent
  type: cardCreditTransactionTypeEnum('type').notNull(),
  description: text('description').notNull(),
  stripeSessionId: text('stripe_session_id'), // set on Stripe purchases; used for idempotency
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Card Orders - history of handwritten cards sent
export const cardOrders = pgTable('card_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'set null' }),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'set null' }),
  recipientName: text('recipient_name').notNull(),
  recipientStreet: text('recipient_street').notNull(),
  recipientCity: text('recipient_city').notNull(),
  recipientState: text('recipient_state').notNull(),
  recipientZip: text('recipient_zip').notNull(),
  message: text('message').notNull(),
  fontId: text('font_id').notNull(),
  cardId: text('card_id').notNull(),
  handwriteOrderId: text('handwrite_order_id'), // external order ID (Handwrytten order_id)
  status: cardOrderStatusEnum('status').notNull().default('pending'),
  sendDate: text('send_date'), // YYYY-MM-DD date Handwrytten will mail the card (null = immediate)
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Chat Sessions - persistent AI assistant conversations per user
export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title'), // Auto-generated from first message, for listing sessions
  lastPageContext: text('last_page_context'), // Last page the user was on (pageName)
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Chat Messages - individual messages within a chat session
export const chatMessageRoleEnum = pgEnum('chat_message_role', ['user', 'assistant']);

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => chatSessions.id, { onDelete: 'cascade' }),
  role: chatMessageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  pageContext: text('page_context'), // Which page the user was on when this message was sent
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Branded Cards - mapping from original Handwrytten card IDs to our branded variants
export const brandedCards = pgTable('branded_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  originalCardId: text('original_card_id').notNull().unique(), // Handwrytten preset card ID
  brandedCardId: text('branded_card_id').notNull(),            // Our custom card ID with branding
  backLogoImageId: text('back_logo_image_id').notNull(),       // Handwrytten uploaded logo image ID
  cardName: text('card_name').notNull(),                       // For admin reference
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Types
export type ProfileAddress = typeof profileAddresses.$inferSelect;
export type NewProfileAddress = typeof profileAddresses.$inferInsert;
export type CardPreference = typeof cardPreferences.$inferSelect;
export type CardCredit = typeof cardCredits.$inferSelect;
export type CardCreditTransaction = typeof cardCreditTransactions.$inferSelect;
export type CardOrder = typeof cardOrders.$inferSelect;
export type NewCardOrder = typeof cardOrders.$inferInsert;
export type BrandedCard = typeof brandedCards.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
