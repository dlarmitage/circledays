import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { db, users } from './db';
import { eq } from 'drizzle-orm';

export interface SessionData {
  userId?: string;
  isLoggedIn: boolean;
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


