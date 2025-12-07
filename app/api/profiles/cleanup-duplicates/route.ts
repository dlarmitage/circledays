import { NextRequest, NextResponse } from 'next/server';
import { db, profiles, events } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { eq, and, inArray } from 'drizzle-orm';
import { UNKNOWN_YEAR, parseLocalDate } from '@/lib/utils';

// POST - Clean up duplicate birthdays for a profile (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    
    // Only platform admins can clean up duplicates
    if (!user.isPlatformAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    const { profileId } = body;
    
    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID required' }, { status: 400 });
    }
    
    // Get all birthday events for this profile
    const birthdayEvents = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.profileId, profileId),
          eq(events.type, 'birthday')
        )
      );
    
    // Group by month/day
    const eventsByMonthDay = new Map<string, typeof birthdayEvents>();
    
    for (const event of birthdayEvents) {
      const date = parseLocalDate(event.date);
      const monthDay = `${date.getMonth()}-${date.getDate()}`;
      
      if (!eventsByMonthDay.has(monthDay)) {
        eventsByMonthDay.set(monthDay, []);
      }
      eventsByMonthDay.get(monthDay)!.push(event);
    }
    
    let deletedCount = 0;
    const updates: Array<{ id: string; date: string }> = [];
    
    // For each month/day group, keep only one event
    for (const [monthDay, eventGroup] of eventsByMonthDay.entries()) {
      if (eventGroup.length <= 1) continue; // No duplicates
      
      // Sort: prefer events with known year (not 1904), then by date
      eventGroup.sort((a, b) => {
        const dateA = parseLocalDate(a.date);
        const dateB = parseLocalDate(b.date);
        const yearA = dateA.getFullYear();
        const yearB = dateB.getFullYear();
        
        // Prefer known year over unknown
        if (yearA !== UNKNOWN_YEAR && yearB === UNKNOWN_YEAR) return -1;
        if (yearA === UNKNOWN_YEAR && yearB !== UNKNOWN_YEAR) return 1;
        
        // If both known or both unknown, prefer earlier date (more likely to be correct)
        return dateA.getTime() - dateB.getTime();
      });
      
      // Keep the first one (best one), delete the rest
      const keepEvent = eventGroup[0];
      const duplicates = eventGroup.slice(1);
      
      // If keep event has unknown year but a duplicate has known year, update it
      const keepDate = parseLocalDate(keepEvent.date);
      if (keepDate.getFullYear() === UNKNOWN_YEAR) {
        const knownYearEvent = duplicates.find(e => {
          const d = parseLocalDate(e.date);
          return d.getFullYear() !== UNKNOWN_YEAR;
        });
        
        if (knownYearEvent) {
          updates.push({ id: keepEvent.id, date: knownYearEvent.date });
        }
      }
      
      // Delete duplicates
      for (const duplicate of duplicates) {
        await db.delete(events).where(eq(events.id, duplicate.id));
        deletedCount++;
      }
    }
    
    // Apply updates
    for (const update of updates) {
      await db
        .update(events)
        .set({ date: update.date })
        .where(eq(events.id, update.id));
    }
    
    return NextResponse.json({
      success: true,
      deletedCount,
      updatedCount: updates.length,
      message: `Cleaned up ${deletedCount} duplicate birthday${deletedCount !== 1 ? 's' : ''}`,
    });
  } catch (error) {
    console.error('Cleanup duplicates error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to clean up duplicates' },
      { status: 500 }
    );
  }
}

