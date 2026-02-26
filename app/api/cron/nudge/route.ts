import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { sendEmail, generateNudgeEmail } from '@/lib/email';
import { sendSms, generateNudgeSms } from '@/lib/sms';
import { eq, and, or } from 'drizzle-orm';
import { generateOptOutToken } from '@/lib/nudge-token';

// How long after account creation before the first nudge
const FIRST_NUDGE_DAYS = 7;
// How often to nudge after the first one
const RECURRING_NUDGE_DAYS = 180; // ~6 months

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// Resend free tier: 2 req/s. Add a small delay between sends.
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Called by GitHub Actions (hourly, but nudge logic is idempotent)
// Sends nudge emails to users who haven't enabled both email + SMS
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://circledays.ambient.technology';
    const settingsUrl = `${appUrl}/settings`;

    // Get all users who haven't opted out and don't already have 'both' channels
    const eligibleUsers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.nudgeOptedOut, false),
          or(
            eq(users.notificationChannel, 'email'),
            eq(users.notificationChannel, 'sms')
          )
        )
      );

    const results = {
      eligible: eligibleUsers.length,
      nudged: 0,
      skipped: 0,
      errors: 0,
    };

    for (const user of eligibleUsers) {
      try {
        const accountAgeDays = daysSince(new Date(user.createdAt));

        // Determine if it's time to send a nudge
        let shouldNudge = false;

        if (!user.lastNudgeSentAt) {
          // Never nudged — send if account is older than FIRST_NUDGE_DAYS
          shouldNudge = accountAgeDays >= FIRST_NUDGE_DAYS;
        } else {
          // Previously nudged — send if it's been RECURRING_NUDGE_DAYS since last
          const daysSinceLastNudge = daysSince(new Date(user.lastNudgeSentAt));
          shouldNudge = daysSinceLastNudge >= RECURRING_NUDGE_DAYS;
        }

        if (!shouldNudge) {
          results.skipped++;
          continue;
        }

        // Generate one-click opt-out URL
        const optOutToken = generateOptOutToken(user.id);
        const optOutUrl = `${appUrl}/api/nudge/opt-out?token=${encodeURIComponent(optOutToken)}`;

        let sendResult: { success: boolean; error?: unknown };

        if (user.notificationChannel === 'sms' && user.mobile) {
          // SMS-only user — nudge them via text
          const smsBody = generateNudgeSms(settingsUrl, optOutUrl);
          sendResult = await sendSms({ to: user.mobile, body: smsBody });
        } else {
          // Email-only user (or SMS user without mobile) — nudge via email
          const { html, text } = generateNudgeEmail(
            user.name,
            user.notificationChannel,
            !!user.mobile,
            settingsUrl,
            optOutUrl,
          );

          sendResult = await sendEmail({
            to: user.email,
            subject: '📱 Get CircleDays reminders by text too',
            html,
            text,
          });
        }

        if (sendResult.success) {
          // Update lastNudgeSentAt
          await db
            .update(users)
            .set({ lastNudgeSentAt: new Date() })
            .where(eq(users.id, user.id));

          results.nudged++;

          // Throttle to stay within Resend/Twilio rate limits
          await sleep(600);
        } else {
          console.error(`Failed to send nudge to ${user.email}:`, sendResult.error);
          results.errors++;
        }
      } catch (error) {
        console.error(`Error processing nudge for user ${user.id}:`, error);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Nudge cron error:', error);
    return NextResponse.json(
      { error: 'Failed to process nudges' },
      { status: 500 }
    );
  }
}
