import { NextResponse } from 'next/server';
import { db, magicLinks, profiles, users } from '@/lib/db';
import { withAuth } from '@/lib/api-handler';
import { sendEmail } from '@/lib/email';
import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';

export const POST = withAuth(async (req, user, { params }: { params: Promise<{ id: string }> }) => {
  if (!user.isPlatformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1);

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  if (!profile.linkedUserId) {
    return NextResponse.json({ error: 'Profile is not linked to a user account' }, { status: 400 });
  }

  const [linkedUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, profile.linkedUserId))
    .limit(1);

  if (!linkedUser?.email) {
    return NextResponse.json({ error: 'Linked user has no email address' }, { status: 400 });
  }

  const email = linkedUser.email;
  const token = nanoid(32);
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Invalidate any existing unused tokens for this email
  await db
    .update(magicLinks)
    .set({ used: true })
    .where(and(eq(magicLinks.email, email), eq(magicLinks.used, false)));

  await db.insert(magicLinks).values({ email, token, code, expiresAt });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://circledays.ambient.technology';
  const magicLinkUrl = `${appUrl}/api/auth/verify?token=${token}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #faf9f7; padding: 40px 20px; margin: 0;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #0d5c5c; font-size: 28px; margin: 0;">CircleDays</h1>
    </div>
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      Hi ${linkedUser.name || 'there'}!
    </p>
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      <strong>${user.name}</strong> wanted to remind you that you have a CircleDays account — the app that helps you never miss a birthday or special occasion.
    </p>
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
      Click below to sign in and pick up where you left off.
    </p>
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="${magicLinkUrl}" style="display: inline-block; background: linear-gradient(135deg, #0d5c5c 0%, #0a4a4a 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Sign In to CircleDays
      </a>
    </div>
    <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 8px;">
      Or use this code: <strong style="font-size: 20px; letter-spacing: 2px;">${code}</strong>
    </p>
    <p style="color: #999; font-size: 12px; text-align: center; margin: 24px 0 0;">
      This link expires in 15 minutes. If you weren't expecting this, you can safely ignore it.
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `Hi ${linkedUser.name || 'there'}! ${user.name} wanted to remind you about CircleDays. Sign in here: ${magicLinkUrl} (code: ${code})`;

  await sendEmail({
    to: email,
    subject: `${user.name} is thinking of you — come back to CircleDays`,
    html,
    text,
  });

  return NextResponse.json({ success: true });
}, 'send reminder');
