import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, profiles } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ user: null });
    }
    
    // Get user's profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.linkedUserId, user.id))
      .limit(1);
    
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        mobile: user.mobile,
        notificationChannel: user.notificationChannel,
        isPlatformAdmin: user.isPlatformAdmin,
      },
      profile: profile || null,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}


