import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { cardOrders, cardCredits, cardCreditTransactions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { placeOrder } from '@/lib/handwrytten';

const sendCardSchema = z.object({
  profileId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  recipientName: z.string().min(1),
  recipientStreet: z.string().min(1),
  recipientCity: z.string().min(1),
  recipientState: z.string().min(1),
  recipientZip: z.string().regex(/^\d{5}$/, 'ZIP must be 5 digits'),
  message: z.string().min(1),
  fontId: z.string().min(1),     // Handwrytten font label (e.g. "Ambitious Anita")
  cardId: z.string().min(1),     // Handwrytten card ID
  // Sender address
  senderName: z.string().min(1),
  senderAddress1: z.string().min(1),
  senderCity: z.string().min(1),
  senderState: z.string().min(1),
  senderZip: z.string().regex(/^\d{5}$/, 'ZIP must be 5 digits'),
  // Delivery timing
  daysUntil: z.number().optional(),
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

// POST /api/handwritten-cards — send a handwritten card via Handwrytten
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

    // Deduct credit BEFORE sending — if the API call fails we refund,
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

    // Calculate date_send for timed delivery (send 4 days before the event)
    let dateSend: string | undefined;
    if (data.daysUntil !== undefined && data.daysUntil > 4) {
      const sendDate = new Date();
      sendDate.setDate(sendDate.getDate() + data.daysUntil - 4);
      const mm = String(sendDate.getMonth() + 1).padStart(2, '0');
      const dd = String(sendDate.getDate()).padStart(2, '0');
      const yyyy = sendDate.getFullYear();
      dateSend = `${mm}/${dd}/${yyyy}`;
    }

    // Place order with Handwrytten — if this fails, refund the credit
    let orderResponse: Awaited<ReturnType<typeof placeOrder>>;
    try {
      orderResponse = await placeOrder({
        card_id: parseInt(data.cardId, 10),
        font_label: data.fontId,
        message: data.message,
        sender_name: data.senderName,
        sender_address1: data.senderAddress1,
        sender_city: data.senderCity,
        sender_state: data.senderState,
        sender_zip: data.senderZip,
        recipient_name: data.recipientName,
        recipient_address1: data.recipientStreet,
        recipient_city: data.recipientCity,
        recipient_state: data.recipientState,
        recipient_zip: data.recipientZip,
        date_send: dateSend,
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
      fontId: data.fontId,
      cardId: data.cardId,
      handwriteOrderId: String(orderResponse.order_id),
      status: 'pending',
    });

    return NextResponse.json({
      success: true,
      orderId: orderResponse.order_id,
      status: orderResponse.status,
    });
  } catch (error) {
    console.error('Card send error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }

    const detail = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to send card', detail }, { status: 500 });
  }
}
