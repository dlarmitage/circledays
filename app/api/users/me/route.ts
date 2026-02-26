import { NextRequest, NextResponse } from 'next/server';
import { db, users, profiles } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { sendEmail, generateEmailConfirmationEmail } from '@/lib/email';
import { capitalizeName } from '@/lib/utils';

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  timezone: z.string().optional(),
  mobile: z.string().nullable().optional(),
  notificationChannel: z.enum(['email', 'sms', 'both']).optional(),
  shareNewConnections: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const data = updateUserSchema.parse(body);
    
    const updateData: any = {};
    
    // Handle email change - set as pending
    if (data.email && data.email.toLowerCase() !== user.email.toLowerCase()) {
      // Check if email is already taken
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email.toLowerCase()))
        .limit(1);
      
      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        );
      }
      
      // Generate confirmation token
      const token = randomBytes(32).toString('hex');
      updateData.pendingEmail = data.email.toLowerCase();
      updateData.emailConfirmationToken = token;
      
      // Send confirmation email
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://circledays.ambient.technology';
      const confirmationLink = `${appUrl}/api/users/confirm-email?token=${token}`;
      const { html, text } = generateEmailConfirmationEmail(user.name, confirmationLink, data.email.toLowerCase());
      
      await sendEmail({
        to: data.email.toLowerCase(),
        subject: 'Confirm your new email address',
        html,
        text,
      });
    } else {
      // For other fields, update directly
      if (data.name) updateData.name = capitalizeName(data.name);
      if (data.timezone) updateData.timezone = data.timezone;
      if (data.mobile !== undefined) updateData.mobile = data.mobile;
      if (data.notificationChannel) updateData.notificationChannel = data.notificationChannel;
      if (data.shareNewConnections !== undefined) updateData.shareNewConnections = data.shareNewConnections;

      // If user upgrades to 'both' channels, clear nudge state — they've done what we asked
      if (data.notificationChannel === 'both') {
        updateData.nudgeOptedOut = true;
      }
    }
    
    // Update user
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, user.id))
      .returning();
    
    // If name changed, update linked profile too
    if (data.name) {
      await db
        .update(profiles)
        .set({ name: capitalizeName(data.name) })
        .where(eq(profiles.linkedUserId, user.id));
    }
    
    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const keepProfile = searchParams.get('keepProfile') === 'true';
    
    if (keepProfile) {
      // Unlink user from profile but keep the profile
      await db
        .update(profiles)
        .set({ linkedUserId: null })
        .where(eq(profiles.linkedUserId, user.id));
    }
    // If not keeping profile, cascade delete will handle it
    
    // Delete user (cascades to most related data)
    await db.delete(users).where(eq(users.id, user.id));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}


