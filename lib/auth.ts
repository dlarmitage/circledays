import { getIronSession, IronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { db, users, loginEvents } from './db';
import { eq } from 'drizzle-orm';

export interface SessionData {
  userId?: string;
  isLoggedIn: boolean;
  originalUserId?: string; // Set when an admin is impersonating another user
}

interface TrustedDevice {
  email?: string;
}

function requireSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set and at least 32 characters');
  }
  return secret;
}

function getSessionOptions(): SessionOptions {
  return {
    password: requireSessionSecret(),
    cookieName: 'circledays-session',
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    },
  };
}

function getTrustedDeviceOptions(): SessionOptions {
  return {
    password: requireSessionSecret(),
    cookieName: 'circledays-trusted',
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 90, // 90 days
    },
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getSessionOptions());
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

/** Trusted device — survives logout; skips OTP when same email re-entered on this browser. */
export async function setTrustedDevice(email: string) {
  const cookieStore = await cookies();
  const trusted = await getIronSession<TrustedDevice>(cookieStore, getTrustedDeviceOptions());
  trusted.email = email.toLowerCase().trim();
  await trusted.save();
}

export async function getTrustedDevice(): Promise<string | null> {
  const cookieStore = await cookies();
  const trusted = await getIronSession<TrustedDevice>(cookieStore, getTrustedDeviceOptions());
  return trusted.email || null;
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
