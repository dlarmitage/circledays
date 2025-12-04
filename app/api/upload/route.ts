import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { requireAuth } from '@/lib/auth';
import { db, profiles } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const profileId = formData.get('profileId') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Use JPEG, PNG, or WebP.' },
        { status: 400 }
      );
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }
    
    // If profileId provided, verify permission
    if (profileId) {
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, profileId))
        .limit(1);
      
      if (!profile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }
      
      // Check permission
      const isOwn = profile.linkedUserId === user.id;
      const isCreator = profile.createdByUserId === user.id;
      
      if (!isOwn && !isCreator && !user.isPlatformAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      
      // Delete old photo if exists
      if (profile.profilePicture) {
        try {
          await del(profile.profilePicture);
        } catch (e) {
          // Ignore deletion errors
        }
      }
    }
    
    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `profiles/${profileId || user.id}/${Date.now()}.${ext}`;
    
    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
    });
    
    // Update profile with new photo URL if profileId provided
    if (profileId) {
      await db
        .update(profiles)
        .set({ profilePicture: blob.url })
        .where(eq(profiles.id, profileId));
    }
    
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Upload error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

