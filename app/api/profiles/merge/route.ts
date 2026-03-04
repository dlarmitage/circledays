import { NextRequest, NextResponse } from 'next/server';
import { db, profiles, events, notes, connections, connectionSuggestions, invites } from '@/lib/db';
import { withAuth } from '@/lib/api-handler';
import { eq, or, and } from 'drizzle-orm';
import { z } from 'zod';
import { UNKNOWN_YEAR, parseLocalDate } from '@/lib/utils';

const mergeSchema = z.object({
  keepProfileId: z.string().uuid(), // Profile to keep
  mergeProfileId: z.string().uuid(), // Profile to merge into keepProfileId and delete
  mergeOptions: z.object({
    name: z.enum(['keep', 'merge']), // Which name to keep
    profilePicture: z.enum(['keep', 'merge']),
    events: z.enum(['keep', 'merge']), // Merge = combine both, keep = only keepProfile's
    connections: z.enum(['keep', 'merge']), // Merge = combine both
    notes: z.enum(['keep', 'merge']), // Merge = combine both
  }),
});

// POST - Merge two profiles (admin only)
export const POST = withAuth(async (req, user) => {
  // Only platform admins can merge profiles
  if (!user.isPlatformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const data = mergeSchema.parse(body);

  // Get both profiles
  const [keepProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, data.keepProfileId))
    .limit(1);

  const [mergeProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, data.mergeProfileId))
    .limit(1);

  if (!keepProfile || !mergeProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  if (keepProfile.id === mergeProfile.id) {
    return NextResponse.json({ error: 'Cannot merge a profile with itself' }, { status: 400 });
  }

  // Update name if needed
  if (data.mergeOptions.name === 'merge') {
    await db
      .update(profiles)
      .set({ name: mergeProfile.name })
      .where(eq(profiles.id, data.keepProfileId));
  }

  // Update profile picture if needed
  if (data.mergeOptions.profilePicture === 'merge' && mergeProfile.profilePicture) {
    await db
      .update(profiles)
      .set({ profilePicture: mergeProfile.profilePicture })
      .where(eq(profiles.id, data.keepProfileId));
  }

  // Merge events if needed
  if (data.mergeOptions.events === 'merge') {
    // Get all events from merge profile
    const mergeEvents = await db
      .select()
      .from(events)
      .where(eq(events.profileId, data.mergeProfileId));

    // Get existing events from keep profile to check for duplicates
    const keepEvents = await db
      .select()
      .from(events)
      .where(eq(events.profileId, data.keepProfileId));

    // For birthdays, we need to check month/day match (ignoring year)
    // For other events, check exact date match
    const isDuplicate = (mergeEvent: typeof mergeEvents[0], keepEvent: typeof keepEvents[0]): boolean => {
      // Must be same type
      if (mergeEvent.type !== keepEvent.type) return false;

      // Custom events must have same label
      if (mergeEvent.type === 'custom' && mergeEvent.customLabel !== keepEvent.customLabel) {
        return false;
      }

      // For birthdays, check if month/day matches (ignore year)
      if (mergeEvent.type === 'birthday') {
        const mergeDate = parseLocalDate(mergeEvent.date);
        const keepDate = parseLocalDate(keepEvent.date);
        return mergeDate.getMonth() === keepDate.getMonth() &&
               mergeDate.getDate() === keepDate.getDate();
      }

      // For other events, exact date match
      return mergeEvent.date === keepEvent.date;
    };

    // Move non-duplicate events, or handle duplicates intelligently
    for (const mergeEvent of mergeEvents) {
      const duplicate = keepEvents.find(ke => isDuplicate(mergeEvent, ke));

      if (!duplicate) {
        // No duplicate, move the event
        await db
          .update(events)
          .set({ profileId: data.keepProfileId })
          .where(eq(events.id, mergeEvent.id));
      } else {
        // Duplicate found - for birthdays, prefer the one with a known year
        if (mergeEvent.type === 'birthday') {
          const mergeDate = parseLocalDate(mergeEvent.date);
          const duplicateDate = parseLocalDate(duplicate.date);
          const mergeYear = mergeDate.getFullYear();
          const duplicateYear = duplicateDate.getFullYear();

          // If merge event has known year and duplicate has unknown year, replace it
          if (mergeYear !== UNKNOWN_YEAR && duplicateYear === UNKNOWN_YEAR) {
            // Update the duplicate event with the known year
            await db
              .update(events)
              .set({ date: mergeEvent.date })
              .where(eq(events.id, duplicate.id));
            // Delete the merge event
            await db.delete(events).where(eq(events.id, mergeEvent.id));
          } else {
            // Otherwise, just delete the merge event (keep the existing one)
            await db.delete(events).where(eq(events.id, mergeEvent.id));
          }
        } else {
          // For non-birthday duplicates, just delete the merge event
          await db.delete(events).where(eq(events.id, mergeEvent.id));
        }
      }
    }
  }

  // Merge connections if needed
  if (data.mergeOptions.connections === 'merge') {
    // Get all connections from merge profile
    const mergeConnections = await db
      .select()
      .from(connections)
      .where(
        or(
          eq(connections.profileAId, data.mergeProfileId),
          eq(connections.profileBId, data.mergeProfileId)
        )
      );

    // Get existing connections from keep profile
    const keepConnections = await db
      .select()
      .from(connections)
      .where(
        or(
          eq(connections.profileAId, data.keepProfileId),
          eq(connections.profileBId, data.keepProfileId)
        )
      );

    const keepConnectionKeys = new Set<string>();
    keepConnections.forEach(conn => {
      const otherId = conn.profileAId === data.keepProfileId ? conn.profileBId : conn.profileAId;
      keepConnectionKeys.add(otherId);
    });

    // Move non-duplicate connections
    for (const conn of mergeConnections) {
      const otherId = conn.profileAId === data.mergeProfileId ? conn.profileBId : conn.profileAId;

      // Skip if already connected or if connecting to self
      if (otherId === data.keepProfileId || keepConnectionKeys.has(otherId)) {
        continue;
      }

      // Update connection to point to keep profile
      const [profileA, profileB] = [data.keepProfileId, otherId].sort();
      await db
        .update(connections)
        .set({
          profileAId: profileA,
          profileBId: profileB,
        })
        .where(eq(connections.id, conn.id));
    }
  }

  // Merge notes if needed
  if (data.mergeOptions.notes === 'merge') {
    // Get all notes from merge profile
    const mergeNotes = await db
      .select()
      .from(notes)
      .where(eq(notes.profileId, data.mergeProfileId));

    // Move notes to keep profile (preserve userId ownership)
    for (const note of mergeNotes) {
      // Check if user already has a note on keep profile
      const [existingNote] = await db
        .select()
        .from(notes)
        .where(
          and(
            eq(notes.profileId, data.keepProfileId),
            eq(notes.userId, note.userId)
          )
        )
        .limit(1);

      if (existingNote) {
        // Merge content
        const mergedContent = `${existingNote.content}\n\n--- Merged from ${mergeProfile.name} ---\n${note.content}`;
        await db
          .update(notes)
          .set({ content: mergedContent })
          .where(eq(notes.id, existingNote.id));
        // Delete the merge note
        await db.delete(notes).where(eq(notes.id, note.id));
      } else {
        // Move note to keep profile
        await db
          .update(notes)
          .set({ profileId: data.keepProfileId })
          .where(eq(notes.id, note.id));
      }
    }
  }

  // Update connection suggestions to point to keep profile
  await db
    .update(connectionSuggestions)
    .set({ suggestedProfileId: data.keepProfileId })
    .where(eq(connectionSuggestions.suggestedProfileId, data.mergeProfileId));

  // Update invites to point to keep profile
  await db
    .update(invites)
    .set({ profileId: data.keepProfileId })
    .where(eq(invites.profileId, data.mergeProfileId));

  // If merge profile is linked to a user, we need to handle that
  if (mergeProfile.linkedUserId) {
    // This is tricky - we can't have two profiles linked to the same user
    // Option 1: Unlink merge profile (user loses access) - safest option
    // Option 2: Transfer link to keep profile (if keep profile isn't linked)
    if (!keepProfile.linkedUserId) {
      // Transfer the link - user will now access via keep profile
      await db
        .update(profiles)
        .set({ linkedUserId: mergeProfile.linkedUserId })
        .where(eq(profiles.id, data.keepProfileId));
    }
    // Always unlink merge profile before deleting
    await db
      .update(profiles)
      .set({ linkedUserId: null })
      .where(eq(profiles.id, data.mergeProfileId));
  }

  // Delete the merge profile (cascade will handle related data)
  await db.delete(profiles).where(eq(profiles.id, data.mergeProfileId));

  return NextResponse.json({
    success: true,
    message: `Successfully merged ${mergeProfile.name} into ${keepProfile.name}`,
  });
}, 'merge profiles');
