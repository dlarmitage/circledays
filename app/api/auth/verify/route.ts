import { NextRequest, NextResponse } from 'next/server';
import { db, magicLinks, users, profiles, connections } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { eq, and, gt } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  
  if (!token) {
    return NextResponse.redirect(new URL('/login?error=invalid', request.url));
  }
  
  try {
    // Find and validate magic link
    const [link] = await db
      .select()
      .from(magicLinks)
      .where(
        and(
          eq(magicLinks.token, token),
          eq(magicLinks.used, false),
          gt(magicLinks.expiresAt, new Date())
        )
      )
      .limit(1);
    
    if (!link) {
      return NextResponse.redirect(new URL('/login?error=expired', request.url));
    }
    
    // Mark token as used
    await db
      .update(magicLinks)
      .set({ used: true })
      .where(eq(magicLinks.id, link.id));
    
    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, link.email))
      .limit(1);
    
    if (existingUser) {
      // Existing user - create session and redirect to dashboard
      await createSession(existingUser.id);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    // New user - redirect to onboarding with email
    const onboardingUrl = new URL('/onboarding', request.url);
    onboardingUrl.searchParams.set('email', link.email);
    return NextResponse.redirect(onboardingUrl);
    
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.redirect(new URL('/login?error=failed', request.url));
  }
}


