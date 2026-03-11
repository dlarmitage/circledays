import { NextRequest, NextResponse } from 'next/server';
import { db, pushTokens } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const requestSchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { token } = requestSchema.parse(body);

    await db
      .delete(pushTokens)
      .where(
        and(
          eq(pushTokens.token, token),
          eq(pushTokens.userId, user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    console.error('Push unregister error:', error);
    return NextResponse.json({ error: 'Failed to unregister token' }, { status: 500 });
  }
}
