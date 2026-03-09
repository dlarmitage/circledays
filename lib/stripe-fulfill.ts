import { db } from '@/lib/db';
import { cardCredits, cardCreditTransactions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { CREDIT_BUNDLES } from '@/lib/constants';

/**
 * Fulfill a Stripe checkout session — idempotently credit the user's account.
 * Shared by the webhook handler and the client-facing fulfill endpoint.
 *
 * Returns true if credits were added (or already fulfilled), false if metadata is missing.
 */
export async function fulfillCheckoutSession(
  sessionId: string,
  paymentStatus: string,
  metadata: Record<string, string> | null
): Promise<boolean> {
  if (paymentStatus !== 'paid') return false;

  const { userId, bundleId, quantity } = metadata ?? {};
  if (!userId || !bundleId || !quantity) return false;

  const credits = parseInt(quantity, 10);
  const bundle = CREDIT_BUNDLES.find(b => b.id === bundleId);

  // Idempotency: the unique index on stripe_session_id rejects duplicates.
  try {
    await db.insert(cardCreditTransactions).values({
      userId,
      amount: credits,
      type: 'purchase',
      description: `Purchased ${bundle?.label ?? bundleId} via Stripe`,
      stripeSessionId: sessionId,
    });
  } catch (err) {
    const msg = String((err as Error)?.message ?? err);
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return true; // already fulfilled
    }
    throw err;
  }

  // Update the credit balance
  const [existing] = await db
    .select()
    .from(cardCredits)
    .where(eq(cardCredits.userId, userId));

  if (existing) {
    await db
      .update(cardCredits)
      .set({ balance: existing.balance + credits, updatedAt: new Date() })
      .where(eq(cardCredits.userId, userId));
  } else {
    await db.insert(cardCredits).values({ userId, balance: credits });
  }

  return true;
}
