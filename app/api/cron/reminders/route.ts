import { NextRequest, NextResponse } from 'next/server';
import { db, users, profiles, connections, events, reminderPreferences, reminderOverrides, notificationLogs } from '@/lib/db';
import { sendEmail, generateReminderEmail } from '@/lib/email';
import { sendSms, generateReminderSms } from '@/lib/sms';
import { eq, or, and, sql } from 'drizzle-orm';
import { daysUntil, calculateAge, formatDate } from '@/lib/utils';

// Helper to get current hour in a timezone
function getCurrentHourInTimezone(timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    const hourStr = formatter.format(new Date());
    return parseInt(hourStr, 10);
  } catch {
    // If timezone is invalid, return -1 (will be skipped)
    return -1;
  }
}

// This endpoint is called hourly by GitHub Actions
// It sends reminders to users who are currently at 7 AM in their timezone
// Add ?test=true&email=user@example.com to test for a specific user (bypasses timezone)
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const { searchParams } = new URL(request.url);
    const testMode = searchParams.get('test') === 'true';
    const testEmail = searchParams.get('email');
    const targetHour = 7; // 7 AM local time
    
    // Get all users
    const allUsers = await db.select().from(users);
    
    let usersToNotify;
    
    if (testMode && testEmail) {
      // Test mode: send to specific user regardless of timezone
      usersToNotify = allUsers.filter(user => user.email === testEmail);
      console.log(`[Reminders] TEST MODE - Targeting user: ${testEmail}`);
    } else if (testMode) {
      // Test mode without email: send to all users (for debugging)
      usersToNotify = allUsers;
      console.log(`[Reminders] TEST MODE - Targeting all ${allUsers.length} users`);
    } else {
      // Production mode: filter by timezone
      usersToNotify = allUsers.filter(user => {
        const userHour = getCurrentHourInTimezone(user.timezone);
        return userHour === targetHour;
      });
    }
    
    console.log(`[Reminders] ${now.toISOString()} - Found ${usersToNotify.length} users to notify`);
    
    const results = {
      totalUsers: allUsers.length,
      usersAtTargetHour: usersToNotify.length,
      processed: 0,
      notified: 0,
      errors: 0,
    };
    
    for (const user of usersToNotify) {
      try {
        results.processed++;
        
        // Get user's profile
        const [userProfile] = await db
          .select()
          .from(profiles)
          .where(eq(profiles.linkedUserId, user.id))
          .limit(1);
        
        if (!userProfile) continue;
        
        // Get user's direct connections
        const connectedProfiles = await db
          .select({
            profileId: sql<string>`
              CASE 
                WHEN ${connections.profileAId} = ${userProfile.id} THEN ${connections.profileBId}
                ELSE ${connections.profileAId}
              END
            `.as('profile_id'),
          })
          .from(connections)
          .where(
            or(
              eq(connections.profileAId, userProfile.id),
              eq(connections.profileBId, userProfile.id)
            )
          );
        
        const connectedIds = connectedProfiles.map(c => c.profileId);
        
        if (connectedIds.length === 0) continue;
        
        // Get all events for connected profiles (excluding own)
        const allEventsRaw = await db
          .select({
            event: events,
            profile: profiles,
          })
          .from(events)
          .innerJoin(profiles, eq(events.profileId, profiles.id))
          .where(
            and(
              sql`${events.profileId} IN (${sql.join(connectedIds.map(id => sql`${id}`), sql`, `)})`,
              sql`${profiles.id} != ${userProfile.id}`
            )
          );
        
        // Filter out private events unless current user created them
        const allEvents = allEventsRaw.filter(({ event }) => 
          !event.isPrivate || event.createdByUserId === user.id
        );
        
        // Get user's reminder preferences
        const [prefs] = await db
          .select()
          .from(reminderPreferences)
          .where(eq(reminderPreferences.userId, user.id))
          .limit(1);
        
        const defaultLeadDays = prefs?.defaultLeadDays || [0, 1, 7];
        
        // Get overrides
        const overrides = await db
          .select()
          .from(reminderOverrides)
          .where(eq(reminderOverrides.userId, user.id));
        
        const overrideMap = new Map(overrides.map(o => [o.eventId, o]));
        
        // Filter events that should trigger today
        const eventsToNotify = allEvents.filter(({ event }) => {
          const override = overrideMap.get(event.id);
          
          // Skip if muted
          if (override?.muted) return false;
          
          const leadDays = override?.customLeadDays || defaultLeadDays;
          const days = daysUntil(event.date);
          
          return leadDays.includes(days);
        });
        
        if (eventsToNotify.length === 0) continue;
        
        // Check idempotency - have we already sent for these events today?
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const existingLogs = await db
          .select()
          .from(notificationLogs)
          .where(
            and(
              eq(notificationLogs.userId, user.id),
              sql`${notificationLogs.sentAt} >= ${today}`,
              sql`${notificationLogs.sentAt} < ${tomorrow}`
            )
          );
        
        // Filter out events already notified
        const alreadyNotifiedEventIds = new Set(
          existingLogs.flatMap(log => log.eventIds)
        );
        
        const newEventsToNotify = eventsToNotify.filter(
          e => !alreadyNotifiedEventIds.has(e.event.id)
        );
        
        if (newEventsToNotify.length === 0) continue;
        
        // Prepare event data
        const eventData = newEventsToNotify.map(({ event, profile }) => ({
          profileName: profile.name,
          profilePhoto: profile.profilePicture,
          eventType: event.type === 'custom' ? (event.customLabel || 'Event') : event.type,
          eventDate: formatDate(event.date, { month: 'long', day: 'numeric' }),
          daysUntil: daysUntil(event.date),
          age: event.type === 'birthday' && calculateAge(event.date) !== null 
            ? calculateAge(event.date)! + 1 
            : undefined,
        }));
        
        const newEventIds = newEventsToNotify.map(e => e.event.id);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        
        // Send notifications based on preference
        if (user.notificationChannel === 'email' || user.notificationChannel === 'both') {
          const { html, text } = generateReminderEmail(user.name, eventData, appUrl);
          const result = await sendEmail({
            to: user.email,
            subject: '🎂 Upcoming birthdays and events',
            html,
            text,
          });
          
          await db.insert(notificationLogs).values({
            userId: user.id,
            eventIds: newEventIds,
            channel: 'email',
            status: result.success ? 'sent' : 'failed',
            errorMessage: result.success ? null : String(result.error),
          });
          
          if (result.success) results.notified++;
        }
        
        if ((user.notificationChannel === 'sms' || user.notificationChannel === 'both') && user.mobile) {
          const messages = generateReminderSms(eventData);
          
          for (const body of messages) {
            const result = await sendSms({
              to: user.mobile,
              body,
            });
            
            await db.insert(notificationLogs).values({
              userId: user.id,
              eventIds: newEventIds,
              channel: 'sms',
              status: result.success ? 'sent' : 'failed',
              errorMessage: result.success ? null : String(result.error),
            });
            
            if (result.success && user.notificationChannel === 'sms') {
              results.notified++;
            }
          }
        }
        
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error);
        results.errors++;
      }
    }
    
    return NextResponse.json({
      success: true,
      ...results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Failed to process reminders' },
      { status: 500 }
    );
  }
}
