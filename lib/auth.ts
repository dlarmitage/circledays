import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { db, users, loginEvents } from './db';
import { eq } from 'drizzle-orm';

export interface SessionData {
  userId?: string;
  isLoggedIn: boolean;
  originalUserId?: string; // Set when an admin is impersonating another user
}

const sessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'circledays-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function getCurrentUser() {
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId) {
    return null;
  }

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return user[0] || null;
}

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

export async function createSession(userId: string) {
  const session = await getSession();
  session.userId = userId;
  session.isLoggedIn = true;
  await session.save();
}

export async function destroySession() {
  const session = await getSession();
  session.destroy();
}

export async function startImpersonation(targetUserId: string) {
  const session = await getSession();
  if (!session.userId) throw new Error('Not logged in');
  // If already impersonating, keep the original admin ID; otherwise save current
  if (!session.originalUserId) {
    session.originalUserId = session.userId;
  }
  session.userId = targetUserId;
  await session.save();
}

export async function stopImpersonation() {
  const session = await getSession();
  if (!session.originalUserId) throw new Error('Not impersonating');
  session.userId = session.originalUserId;
  session.originalUserId = undefined;
  await session.save();
}

export async function isImpersonating(): Promise<boolean> {
  const session = await getSession();
  return !!session.originalUserId;
}

export type LoginMethod = 'magic_link' | 'verification_code' | 'invite_accept' | 'onboarding' | 'exchange_token';

export async function logLoginEvent(
  userId: string,
  method: LoginMethod,
  userAgent?: string
) {
  try {
    await db.insert(loginEvents).values({
      userId,
      loginMethod: method,
      userAgent: userAgent || null,
    });
  } catch (error) {
    // Don't fail login if analytics logging fails
    console.error('Failed to log login event:', error);
  }
}
