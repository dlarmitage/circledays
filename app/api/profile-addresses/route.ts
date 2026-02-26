import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { profileAddresses } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const addressSchema = z.object({
  profileId: z.string().uuid(),
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().regex(/^\d{5}$/, 'ZIP must be 5 digits'),
  country: z.string().default('US'),
});

// GET /api/profile-addresses?profileId=... — fetch stored address for a profile
export async function GET(request: NextRequest) {
  try {
    const _user = await requireAuth();
    const userId = _user.id;
    const profileId = request.nextUrl.searchParams.get('profileId');

    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
    }

    const [address] = await db
      .select()
      .from(profileAddresses)
      .where(
        and(
          eq(profileAddresses.profileId, profileId),
          eq(profileAddresses.userId, userId)
        )
      );

    return NextResponse.json({ address: address ?? null });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Profile address fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch address' }, { status: 500 });
  }
}

// PUT /api/profile-addresses — save or update a mailing address for a profile
export async function PUT(request: NextRequest) {
  try {
    const _user = await requireAuth();
    const userId = _user.id;
    const body = await request.json();
    const data = addressSchema.parse(body);

    const [existing] = await db
      .select()
      .from(profileAddresses)
      .where(
        and(
          eq(profileAddresses.profileId, data.profileId),
          eq(profileAddresses.userId, userId)
        )
      );

    if (existing) {
      await db
        .update(profileAddresses)
        .set({
          street: data.street,
          city: data.city,
          state: data.state,
          zip: data.zip,
          country: data.country,
          updatedAt: new Date(),
        })
        .where(eq(profileAddresses.id, existing.id));
    } else {
      await db.insert(profileAddresses).values({
        profileId: data.profileId,
        userId,
        street: data.street,
        city: data.city,
        state: data.state,
        zip: data.zip,
        country: data.country,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    console.error('Profile address save error:', error);
    return NextResponse.json({ error: 'Failed to save address' }, { status: 500 });
  }
}

// DELETE /api/profile-addresses?profileId=... — remove stored address
export async function DELETE(request: NextRequest) {
  try {
    const _user = await requireAuth();
    const userId = _user.id;
    const profileId = request.nextUrl.searchParams.get('profileId');

    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
    }

    await db
      .delete(profileAddresses)
      .where(
        and(
          eq(profileAddresses.profileId, profileId),
          eq(profileAddresses.userId, userId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Profile address delete error:', error);
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 });
  }
}
