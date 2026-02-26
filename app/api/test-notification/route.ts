import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sendEmail, generateReminderEmail } from '@/lib/email';
import { sendSms, generateReminderSms } from '@/lib/sms';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';

// Test endpoint to verify notification delivery
// Only available in development or for the specific test user
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    
    // Get full user data
    const [userData] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const body = await request.json();
    const channel = body.channel || 'email'; // 'email', 'sms', or 'both'
    
    // Sample test data - use a date 3 days from now
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const formattedDate = futureDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    
    const testEvents = [
      {
        profileName: 'Test Person',
        profilePhoto: null,
        eventType: 'Birthday',
        eventDate: formattedDate,
        daysUntil: 3,
        age: 35,
      },
    ];
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://circledays.ambient.technology';
    const results: { email?: any; sms?: any } = {};
    
    // Test email
    if (channel === 'email' || channel === 'both') {
      const { html, text } = generateReminderEmail(userData.name, testEvents, appUrl);
      const emailResult = await sendEmail({
        to: userData.email,
        subject: '🧪 Test: Upcoming birthdays and events',
        html,
        text,
      });
      results.email = emailResult;
    }
    
    // Test SMS
    if ((channel === 'sms' || channel === 'both') && userData.mobile) {
      const messages = generateReminderSms(testEvents, appUrl);
      const smsResults = [];
      
      for (const messageBody of messages) {
        const smsResult = await sendSms({
          to: userData.mobile,
          body: `🧪 TEST: ${messageBody}`,
        });
        smsResults.push(smsResult);
      }
      results.sms = smsResults;
    } else if ((channel === 'sms' || channel === 'both') && !userData.mobile) {
      results.sms = { error: 'No mobile number configured' };
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test notification sent',
      results,
      sentTo: {
        email: channel !== 'sms' ? userData.email : null,
        mobile: channel !== 'email' ? userData.mobile : null,
      },
    });
  } catch (error) {
    console.error('Test notification error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to send test notification', details: String(error) },
      { status: 500 }
    );
  }
}

