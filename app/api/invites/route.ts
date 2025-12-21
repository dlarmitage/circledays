import { NextRequest, NextResponse } from 'next/server';
import { db, invites, profiles, connections } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { sendSms, generateInviteSms } from '@/lib/sms';
import { eq, or, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

// Helper to detect if input is a phone number
function isPhoneNumber(input: string): boolean {
  // Remove common phone formatting characters
  const cleaned = input.replace(/[\s\-\(\)\+\.]/g, '');
  // Check if it's all digits and reasonable length for a phone number
  return /^\d{7,15}$/.test(cleaned);
}

// Helper to normalize phone number to E.164 format
function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  // If no country code, assume US (+1)
  if (!cleaned.startsWith('+')) {
    return '+1' + cleaned.replace(/^\+/, '');
  }
  return cleaned;
}

const createInviteSchema = z.object({
  profileId: z.string().uuid(),
  contact: z.string().min(1, "Email or mobile number is required"),
  seedConnectionIds: z.array(z.string().uuid()).optional(),
  linkOnly: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const data = createInviteSchema.parse(body);

    // Detect if contact is email or phone
    const isPhone = isPhoneNumber(data.contact);
    const contactValue = isPhone ? normalizePhoneNumber(data.contact) : data.contact.toLowerCase();

    // Validate email format if it's an email
    if (!isPhone && !z.string().email().safeParse(contactValue).success) {
      return NextResponse.json(
        { error: 'Please enter a valid email address or mobile number' },
        { status: 400 }
      );
    }

    // Get the profile to invite
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, data.profileId))
      .limit(1);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check permission - must be creator of an unlinked profile
    if (profile.createdByUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (profile.linkedUserId) {
      return NextResponse.json(
        { error: 'This profile is already linked to a user' },
        { status: 400 }
      );
    }

    // Check for existing pending invite
    const [existingInvite] = await db
      .select()
      .from(invites)
      .where(
        sql`${invites.profileId} = ${data.profileId} AND ${invites.status} = 'pending'`
      )
      .limit(1);

    if (existingInvite) {
      return NextResponse.json(
        { error: 'An invite is already pending for this profile' },
        { status: 400 }
      );
    }

    // Create invite token
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invite (store contact in email field regardless of type)
    const [invite] = await db
      .insert(invites)
      .values({
        email: contactValue,
        profileId: data.profileId,
        invitedByUserId: user.id,
        seedConnectionIds: data.seedConnectionIds || [],
        token,
        status: 'pending',
        expiresAt,
      })
      .returning();

    // Generate invite URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${appUrl}/invite/${token}`;

    // If linkOnly mode, skip sending and just return the URL
    if (data.linkOnly) {
      return NextResponse.json({
        invite,
        inviteUrl,
        sent: false,
        method: 'link_only'
      });
    }

    // Send via appropriate channel
    if (isPhone) {
      // Send SMS
      const smsBody = generateInviteSms(user.name, profile.name, inviteUrl);
      await sendSms({ to: contactValue, body: smsBody });

      return NextResponse.json({
        invite,
        inviteUrl,
        sent: true,
        method: 'sms'
      });
    } else {
      // Send email
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #faf9f7; padding: 40px 20px; margin: 0;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #0d5c5c; font-size: 28px; margin: 0;">CircleDays</h1>
    </div>
    
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      Hi there!
    </p>
    
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      <strong>${user.name}</strong> has invited you to join CircleDays - an app to never miss birthdays and special dates for the people you care about.
    </p>
    
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
      They've already created a profile for you as <strong>${profile.name}</strong>. Click below to claim it and start receiving reminders!
    </p>
    
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #0d5c5c 0%, #0a4a4a 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Accept Invitation
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
      Or copy and paste this link into your browser:
    </p>
    
    <p style="color: #0d5c5c; font-size: 14px; word-break: break-all; background: #f5f5f5; padding: 12px; border-radius: 8px; margin-bottom: 32px;">
      ${inviteUrl}
    </p>
    
    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
      This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
    </p>
  </div>
</body>
</html>
      `.trim();

      await sendEmail({
        to: contactValue,
        subject: `${user.name} invited you to CircleDays`,
        html: emailHtml,
        text: `${user.name} has invited you to join CircleDays! Accept your invitation here: ${inviteUrl}`,
      });

      return NextResponse.json({
        invite,
        inviteUrl,
        sent: true,
        method: 'email'
      });
    }
  } catch (error) {
    console.error('Create invite error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    );
  }
}
