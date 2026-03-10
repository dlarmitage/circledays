import { NextRequest, NextResponse } from 'next/server';
import { db, profiles, connections, invites } from '@/lib/db';
import { events } from '@/lib/db/schema';
import { withAuth } from '@/lib/api-handler';
import { eq, or, and, ilike, inArray } from 'drizzle-orm';

// Check for potential duplicate profiles before creating a new one
export const POST = withAuth(async (req, user) => {
  const body = await req.json();
  const { name, birthday } = body;

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  // Get user's profile
  const [userProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.linkedUserId, user.id))
    .limit(1);

  if (!userProfile) {
    return NextResponse.json({ duplicates: [] });
  }

  // Normalize name for comparison
  const normalizedName = name.trim().toLowerCase();
  const nameParts = normalizedName.split(/\s+/);

  // Build search conditions for name matching
  const searchConditions = [];

  // Exact name match (case-insensitive)
  searchConditions.push(ilike(profiles.name, name.trim()));

  // If we have first and last name, also search for reversed order
  if (nameParts.length >= 2) {
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    searchConditions.push(ilike(profiles.name, `${lastName}%${firstName}%`));
    searchConditions.push(ilike(profiles.name, `%${firstName}%${lastName}%`));
  }

  // Search for profiles starting with OR containing each name part
  // This catches "Stutzman" matching "Kerry L Stutzman", or "Lynn" matching "Kerry Lynn"
  for (const part of nameParts) {
    if (part.length >= 2) {
      searchConditions.push(ilike(profiles.name, `${part}%`));
      searchConditions.push(ilike(profiles.name, `% ${part}%`));
    }
  }

  // Search for similar profiles by name
  const nameMatchedProfiles = await db
    .select()
    .from(profiles)
    .where(or(...searchConditions))
    .limit(20);

  // If a birthday was provided, check which name-matched candidates share it
  // Birthday alone isn't enough — it boosts score for candidates already found by name
  const birthdayMonthDay = birthday ? birthday.slice(5) : null; // "MM-DD"
  const birthdayMatchIds = new Set<string>();

  if (birthdayMonthDay && nameMatchedProfiles.length > 0) {
    const candidateIds = nameMatchedProfiles.map(p => p.id);
    const birthdayEvents = await db
      .select({ profileId: events.profileId, date: events.date })
      .from(events)
      .where(
        and(
          inArray(events.profileId, candidateIds),
          eq(events.type, 'birthday')
        )
      );

    for (const evt of birthdayEvents) {
      if (evt.date.slice(5) === birthdayMonthDay) {
        birthdayMatchIds.add(evt.profileId);
      }
    }
  }

  const similarProfiles = nameMatchedProfiles;

  // Get user's existing connections to check if already connected
  const userConnections = await db
    .select()
    .from(connections)
    .where(
      or(
        eq(connections.profileAId, userProfile.id),
        eq(connections.profileBId, userProfile.id)
      )
    );

  const connectedProfileIds = new Set<string>();
  userConnections.forEach(conn => {
    if (conn.profileAId === userProfile.id) {
      connectedProfileIds.add(conn.profileBId);
    } else {
      connectedProfileIds.add(conn.profileAId);
    }
  });

  // Score and filter duplicates
  const duplicates = similarProfiles
    .filter(p => p.id !== userProfile.id) // Exclude self
    .filter(p => !p.isPrivate || p.createdByUserId === user.id) // Exclude others' private profiles
    .map(profile => {
      let score = 0;
      let reasons: string[] = [];

      // Name similarity
      const profileNameNorm = profile.name.trim().toLowerCase();
      const profileParts = profileNameNorm.split(/\s+/);
      if (profileNameNorm === normalizedName) {
        score += 50;
        reasons.push('Exact name match');
      } else if (profileNameNorm.includes(normalizedName) || normalizedName.includes(profileNameNorm)) {
        score += 30;
        reasons.push('Similar name');
      } else if (nameParts.some((p: string) => p.length >= 2 && profileParts.some((pp: string) => pp.startsWith(p) || p.startsWith(pp)))) {
        score += 20;
        reasons.push('Partial name match');
      }
      // If found only via birthday (no name overlap), score stays at 0 for name

      // Birthday match (strong signal — same month/day)
      if (birthdayMatchIds.has(profile.id)) {
        score += 60;
        reasons.push('Same birthday');
      }

      // Already connected?
      const isConnected = connectedProfileIds.has(profile.id);
      if (isConnected) {
        score += 100; // Strong signal - you already know this person
        reasons.push('Already in your connections');
      }

      // Created by current user?
      if (profile.createdByUserId === user.id) {
        score += 80;
        reasons.push('You created this profile');
      }

      return {
        id: profile.id,
        name: profile.name,
        profilePicture: profile.profilePicture,
        isConnected,
        isLinked: !!profile.linkedUserId,
        score,
        reasons,
      };
    })
    .filter(d => d.score >= 20) // Only show meaningful matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Top 5 matches

  return NextResponse.json({ duplicates });
}, 'check duplicates');
