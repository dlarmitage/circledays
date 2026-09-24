import { NextResponse } from 'next/server';
import { db, profiles, users } from '@/lib/db';
import { withAuthParams } from '@/lib/api-handler';
import { sendEmail, generateMagicLinkEmail } from '@/lib/email';
import { invalidateAndCreateMagicLink } from '@/lib/magic-link-token';
import { eq } from 'drizzle-orm';

export const POST = withAuthParams(async (req, user, params: { id: string }) => {
  if (!user.isPlatformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = params;

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
  const created = await invalidateAndCreateMagicLink(email);
  if ('error' in created) {
    return NextResponse.json({ error: created.error }, { status: created.status });
  }

  const { html, text } = generateMagicLinkEmail(linkedUser.name || '', created.code);

  await sendEmail({
    to: email,
    subject: `${user.name} is thinking of you — your CircleDays login code`,
    html,
    text,
  });

  return NextResponse.json({ success: true });
});
