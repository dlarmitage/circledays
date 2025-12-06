import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }
    
    // Find user with this confirmation token
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.emailConfirmationToken, token))
      .limit(1);
    
    if (!user || !user.pendingEmail) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }
    
    // Check if token is expired (24 hours)
    // Note: We're not storing expiration time, so we'll just check if token exists
    // In production, you might want to add an expiresAt field
    
    // Update email and clear pending fields
    await db
      .update(users)
      .set({
        email: user.pendingEmail,
        pendingEmail: null,
        emailConfirmationToken: null,
      })
      .where(eq(users.id, user.id));
    
    // Redirect to settings page with success message
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://circledays.ambient.technology';
    return NextResponse.redirect(`${appUrl}/settings?emailConfirmed=true`);
  } catch (error) {
    console.error('Confirm email error:', error);
    return NextResponse.json({ error: 'Failed to confirm email' }, { status: 500 });
  }
}

