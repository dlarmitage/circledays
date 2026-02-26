import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { cardOrders, cardCredits, cardCreditTransactions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { sendCard } from '@/lib/handwrite';
import { CARD_CHAR_LIMIT } from '@/lib/constants';

const sendCardSchema = z.object({
  profileId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  recipientName: z.string().min(1),
  recipientStreet: z.string().min(1),
  recipientCity: z.string().min(1),
  recipientState: z.string().min(1),
  recipientZip: z.string().regex(/^\d{5}$/, 'ZIP must be 5 digits'),
  message: z.string().min(1).max(CARD_CHAR_LIMIT),
  handwritingId: z.string().min(1),
  stationeryId: z.string().min(1),
});

// GET /api/handwritten-cards — list the user's card order history
export async function GET() {
  try {
    const user = await requireAuth();
    const userId = user.id;

    const orders = await db
      .select()
      .from(cardOrders)
      .where(eq(cardOrders.userId, userId))
      .orderBy(cardOrders.createdAt);

    return NextResponse.json({ orders: orders.reverse() });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Card orders fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch card orders' }, { status: 500 });
  }
}

// POST /api/handwritten-cards — send a handwritten card
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const userId = user.id;
    const body = await request.json();
    const data = sendCardSchema.parse(body);

    // Check credit balance
    const [creditRow] = await db
      .select()
      .from(cardCredits)
      .where(eq(cardCredits.userId, userId));

    const balance = creditRow?.balance ?? 0;

    if (balance < 1) {
      return NextResponse.json(
        { error: 'Insufficient credits', code: 'NO_CREDITS' },
        { status: 402 }
      );
    }

    // Deduct credit BEFORE sending to Handwrite — if the API call fails we refund,
    // but this ensures a DB failure never results in a free card.
    if (creditRow) {
      await db
        .update(cardCredits)
        .set({ balance: balance - 1, updatedAt: new Date() })
        .where(eq(cardCredits.userId, userId));
    } else {
      await db.insert(cardCredits).values({ userId, balance: -1 });
    }
    await db.insert(cardCreditTransactions).values({
      userId,
      amount: -1,
      type: 'use',
      description: `Handwritten card sent to ${data.recipientName}`,
    });

    // Parse recipient name into first/last for Handwrite API
    const nameParts = data.recipientName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || undefined;

    // Send to Handwrite.io — if this fails, refund the credit
    let order: Awaited<ReturnType<typeof sendCard>>[0];
    try {
      [order] = await sendCard({
        message: data.message,
        card: data.stationeryId,
        handwriting: data.handwritingId,
        recipients: [
          {
            firstName,
            lastName,
            street1: data.recipientStreet,
            city: data.recipientCity,
            state: data.recipientState,
            zip: data.recipientZip,
          },
        ],
      });
    } catch (sendErr) {
      // Refund the credit since the card was never sent
      await db
        .update(cardCredits)
        .set({ balance, updatedAt: new Date() })
        .where(eq(cardCredits.userId, userId));
      await db.insert(cardCreditTransactions).values({
        userId,
        amount: 1,
        type: 'refund',
        description: `Refund — card send failed for ${data.recipientName}`,
      });
      throw sendErr;
    }

    // Record the card order
    await db.insert(cardOrders).values({
      userId,
      profileId: data.profileId ?? null,
      eventId: data.eventId ?? null,
      recipientName: data.recipientName,
      recipientStreet: data.recipientStreet,
      recipientCity: data.recipientCity,
      recipientState: data.recipientState,
      recipientZip: data.recipientZip,
      message: data.message,
      handwritingId: data.handwritingId,
      stationeryId: data.stationeryId,
      handwriteOrderId: order._id,
      status: order.status,
    });

    return NextResponse.json({ success: true, orderId: order._id, status: order.status });
  } catch (error) {
    console.error('Card send error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to send card' }, { status: 500 });
  }
}
