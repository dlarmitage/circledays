import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { cardOrders, cardCredits, cardCreditTransactions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// DELETE /api/handwritten-cards/[id] — cancel a pending card order and refund the credit
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const userId = user.id;
    const { id: orderId } = await params;

    // Fetch the order and verify ownership
    const [order] = await db
      .select()
      .from(cardOrders)
      .where(and(eq(cardOrders.id, orderId), eq(cardOrders.userId, userId)));

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending orders can be cancelled' },
        { status: 400 }
      );
    }

    // Mark as cancelled
    await db
      .update(cardOrders)
      .set({ status: 'cancelled' })
      .where(eq(cardOrders.id, orderId));

    // Refund the credit
    const [creditRow] = await db
      .select()
      .from(cardCredits)
      .where(eq(cardCredits.userId, userId));

    const currentBalance = creditRow?.balance ?? 0;

    if (creditRow) {
      await db
        .update(cardCredits)
        .set({ balance: currentBalance + 1, updatedAt: new Date() })
        .where(eq(cardCredits.userId, userId));
    } else {
      await db.insert(cardCredits).values({ userId, balance: 1 });
    }

    await db.insert(cardCreditTransactions).values({
      userId,
      amount: 1,
      type: 'refund',
      description: `Refund — cancelled card to ${order.recipientName}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Cancel card order error:', error);
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
}
