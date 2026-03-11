import { NextRequest, NextResponse } from 'next/server';
import { db, pushTokens } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const requestSchema = z.object({
  token: z.string().min(1),
  platform: z.string().default('ios'),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { token, platform } = requestSchema.parse(body);

    // Upsert: if token exists, update userId and lastUsedAt
    const [existing] = await db
      .select()
      .from(pushTokens)
      .where(eq(pushTokens.token, token))
      .limit(1);

    if (existing) {
      await db
        .update(pushTokens)
        .set({ userId: user.id, platform, lastUsedAt: new Date() })
        .where(eq(pushTokens.id, existing.id));
    } else {
      await db.insert(pushTokens).values({
        userId: user.id,
        token,
        platform,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    console.error('Push register error:', error);
    return NextResponse.json({ error: 'Failed to register token' }, { status: 500 });
  }
}
