import { NextRequest, NextResponse } from 'next/server';
import { db, profiles, notes, connections } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Get user's notes for a profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: profileId } = await params;
    
    const [note] = await db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.profileId, profileId),
          eq(notes.userId, user.id)
        )
      )
      .limit(1);
    
    return NextResponse.json({ note: note || null });
  } catch (error) {
    console.error('Get notes error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to get notes' },
      { status: 500 }
    );
  }
}

const upsertNoteSchema = z.object({
  content: z.string(),
});

// Create or update note
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: profileId } = await params;
    const body = await request.json();
    const { content } = upsertNoteSchema.parse(body);
    
    // Check if note exists
    const [existingNote] = await db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.profileId, profileId),
          eq(notes.userId, user.id)
        )
      )
      .limit(1);
    
    let note;
    
    if (existingNote) {
      // Update existing note
      [note] = await db
        .update(notes)
        .set({ content, updatedAt: new Date() })
        .where(eq(notes.id, existingNote.id))
        .returning();
    } else {
      // Create new note
      [note] = await db
        .insert(notes)
        .values({
          profileId,
          userId: user.id,
          content,
        })
        .returning();
    }
    
    return NextResponse.json({ note });
  } catch (error) {
    console.error('Upsert note error:', error);
    
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
      { error: 'Failed to save note' },
      { status: 500 }
    );
  }
}

// Delete note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: profileId } = await params;
    
    await db
      .delete(notes)
      .where(
        and(
          eq(notes.profileId, profileId),
          eq(notes.userId, user.id)
        )
      );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete note error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}


