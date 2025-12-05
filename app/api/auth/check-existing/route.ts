import { NextRequest, NextResponse } from 'next/server';
import { db, profiles, invites, events } from '@/lib/db';
import { eq, and, ilike, isNull } from 'drizzle-orm';

// Check if there's an existing profile or invite for someone signing up
// Called during onboarding BEFORE user is fully authenticated
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, birthday } = body;
    
    const results: {
      pendingInvite: {
        id: string;
        profileId: string;
        profileName: string;
        profilePicture: string | null;
        invitedByName: string;
      } | null;
      matchingProfiles: {
        id: string;
        name: string;
        profilePicture: string | null;
        hasBirthdayMatch: boolean;
        createdByName: string;
      }[];
    } = {
      pendingInvite: null,
      matchingProfiles: [],
    };
    
    // Check for pending invite by email
    if (email) {
      const pendingInvites = await db
        .select({
          invite: invites,
          profile: profiles,
        })
        .from(invites)
        .innerJoin(profiles, eq(invites.profileId, profiles.id))
        .where(
          and(
            ilike(invites.email, email.trim()),
            eq(invites.status, 'pending')
          )
        )
        .limit(1);
      
      if (pendingInvites.length > 0) {
        const { invite, profile } = pendingInvites[0];
        
        // Get inviter's name
        const [inviter] = await db
          .select()
          .from(profiles)
          .where(eq(profiles.linkedUserId, invite.invitedByUserId))
          .limit(1);
        
        results.pendingInvite = {
          id: invite.id,
          profileId: profile.id,
          profileName: profile.name,
          profilePicture: profile.profilePicture,
          invitedByName: inviter?.name || 'Someone',
        };
      }
    }
    
    // Check for unlinked profiles with matching name (and optionally birthday)
    if (name) {
      const normalizedName = name.trim();
      
      // Find unlinked profiles with similar names
      const matchingProfilesRaw = await db
        .select()
        .from(profiles)
        .where(
          and(
            ilike(profiles.name, `%${normalizedName}%`),
            isNull(profiles.linkedUserId) // Only unlinked profiles
          )
        )
        .limit(5);
      
      // For each matching profile, check if birthday matches
      for (const profile of matchingProfilesRaw) {
        let hasBirthdayMatch = false;
        
        if (birthday) {
          // Check if profile has a birthday event matching
          const birthdayEvents = await db
            .select()
            .from(events)
            .where(
              and(
                eq(events.profileId, profile.id),
                eq(events.type, 'birthday')
              )
            )
            .limit(1);
          
          if (birthdayEvents.length > 0) {
            const eventDate = birthdayEvents[0].date;
            // Compare month and day (ignore year)
            const eventMD = eventDate.slice(5); // "MM-DD"
            const inputMD = birthday.slice(5); // "MM-DD"
            hasBirthdayMatch = eventMD === inputMD;
          }
        }
        
        // Get creator's name
        const [creator] = await db
          .select()
          .from(profiles)
          .where(eq(profiles.linkedUserId, profile.createdByUserId))
          .limit(1);
        
        results.matchingProfiles.push({
          id: profile.id,
          name: profile.name,
          profilePicture: profile.profilePicture,
          hasBirthdayMatch,
          createdByName: creator?.name || 'Someone',
        });
      }
      
      // Sort: birthday matches first
      results.matchingProfiles.sort((a, b) => {
        if (a.hasBirthdayMatch && !b.hasBirthdayMatch) return -1;
        if (!a.hasBirthdayMatch && b.hasBirthdayMatch) return 1;
        return 0;
      });
    }
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Check existing error:', error);
    return NextResponse.json(
      { error: 'Failed to check existing' },
      { status: 500 }
    );
  }
}

