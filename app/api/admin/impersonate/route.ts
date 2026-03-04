import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { db, users } from '@/lib/db';
import { getSession, startImpersonation } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const impersonateSchema = z.object({
  userId: z.string().uuid(),
});

export const POST = withAuth(async (request, _user) => {
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin status via the original user (in case already impersonating)
  const adminId = session.originalUserId || session.userId;

  const [admin] = await db
    .select()
    .from(users)
    .where(eq(users.id, adminId))
    .limit(1);

  if (!admin || !admin.isPlatformAdmin) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { userId } = impersonateSchema.parse(body);

  // Don't allow impersonating yourself
  if (userId === adminId) {
    return NextResponse.json(
      { error: 'Cannot impersonate yourself' },
      { status: 400 }
    );
  }

  // Verify target user exists
  const [targetUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!targetUser) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  await startImpersonation(userId);

  return NextResponse.json({
    success: true,
    impersonating: {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
    },
  });
}, 'impersonate user');
