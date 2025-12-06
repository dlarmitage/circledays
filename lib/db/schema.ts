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

// Enums
export const notificationChannelEnum = pgEnum('notification_channel', ['email', 'sms', 'both']);
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
  timezone: text('timezone').notNull().default('America/New_York'),
  mobile: text('mobile'),
  notificationChannel: notificationChannelEnum('notification_channel').notNull().default('email'),
  isPlatformAdmin: boolean('is_platform_admin').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Profiles - represents a person being tracked
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  profilePicture: text('profile_picture'),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  linkedUserId: uuid('linked_user_id').references(() => users.id, { onDelete: 'set null' }),
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
export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
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
  defaultLeadDays: integer('default_lead_days').array().notNull().default([0, 1, 7]),
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
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
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
export type ConnectionSuggestion = typeof connectionSuggestions.$inferSelect;


