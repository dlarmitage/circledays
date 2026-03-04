import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { db } from '@/lib/db';
import { cardCredits, cardCreditTransactions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { CREDIT_BUNDLES } from '@/lib/constants';
export { CREDIT_BUNDLES };

// GET /api/card-credits — return current balance and recent transactions
export const GET = withAuth(async (_req, user) => {
  const userId = user.id;

  const [creditRow] = await db
    .select()
    .from(cardCredits)
    .where(eq(cardCredits.userId, userId));

  const transactions = await db
    .select()
    .from(cardCreditTransactions)
    .where(eq(cardCreditTransactions.userId, userId))
    .orderBy(desc(cardCreditTransactions.createdAt))
    .limit(20);

  return NextResponse.json({
    balance: creditRow?.balance ?? 0,
    transactions,
    bundles: CREDIT_BUNDLES,
  });
}, 'fetch credits');

const purchaseSchema = z.object({
  bundleId: z.enum(['bundle_1', 'bundle_5', 'bundle_10']),
});

// POST /api/card-credits — add credits (called after payment confirmation)
// In production this will be triggered by a Stripe webhook, not called directly.
// For now it acts as a manual top-up for development/testing.
export const POST = withAuth(async (request, user) => {
  const userId = user.id;
  const body = await request.json();
  const { bundleId } = purchaseSchema.parse(body);

  const bundle = CREDIT_BUNDLES.find(b => b.id === bundleId);
  if (!bundle) {
    return NextResponse.json({ error: 'Invalid bundle' }, { status: 400 });
  }

  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(cardCredits)
      .where(eq(cardCredits.userId, userId));

    if (existing) {
      await tx
        .update(cardCredits)
        .set({ balance: existing.balance + bundle.quantity, updatedAt: new Date() })
        .where(eq(cardCredits.userId, userId));
    } else {
      await tx.insert(cardCredits).values({
        userId,
        balance: bundle.quantity,
      });
    }

    await tx.insert(cardCreditTransactions).values({
      userId,
      amount: bundle.quantity,
      type: 'purchase',
      description: `Purchased ${bundle.label}`,
    });
  });

  const [updated] = await db
    .select()
    .from(cardCredits)
    .where(eq(cardCredits.userId, userId));

  return NextResponse.json({ balance: updated.balance });
}, 'add credits');
