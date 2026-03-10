import { NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { withAuth } from '@/lib/api-handler';
import { eq } from 'drizzle-orm';

export const POST = withAuth(async (_req, user) => {
  await db
    .update(users)
    .set({ hasSeenWelcome: true })
    .where(eq(users.id, user.id));

  return NextResponse.json({ success: true });
}, 'mark welcome seen');
