import { NextRequest, NextResponse } from 'next/server';
import { db, profiles, notes, connections } from '@/lib/db';
import { withAuthParams } from '@/lib/api-handler';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Get user's notes for a profile
export const GET = withAuthParams(async (req, user, params: { id: string }) => {
  const profileId = params.id;

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
}, 'get notes');

const upsertNoteSchema = z.object({
  content: z.string(),
});

// Create or update note
export const PUT = withAuthParams(async (req, user, params: { id: string }) => {
  const profileId = params.id;
  const body = await req.json();
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
}, 'upsert note');

// Delete note
export const DELETE = withAuthParams(async (req, user, params: { id: string }) => {
  const profileId = params.id;

  await db
    .delete(notes)
    .where(
      and(
        eq(notes.profileId, profileId),
        eq(notes.userId, user.id)
      )
    );

  return NextResponse.json({ success: true });
}, 'delete note');
