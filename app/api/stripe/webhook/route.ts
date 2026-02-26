import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { cardCredits, cardCreditTransactions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { CREDIT_BUNDLES } from '@/app/api/card-credits/route';
import type Stripe from 'stripe';

// POST /api/stripe/webhook — handle Stripe events
// Stripe must be configured to send checkout.session.completed to this endpoint.
export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing webhook signature or secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Only fulfill paid sessions
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ received: true });
    }

    const { userId, bundleId, quantity } = session.metadata ?? {};
    if (!userId || !bundleId || !quantity) {
      console.error('Stripe webhook: missing metadata on session', session.id);
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    const credits = parseInt(quantity, 10);
    const bundle = CREDIT_BUNDLES.find(b => b.id === bundleId);

    // Idempotency: insert the transaction record first.
    // The unique index on stripe_session_id will reject duplicates.
    try {
      await db.insert(cardCreditTransactions).values({
        userId,
        amount: credits,
        type: 'purchase',
        description: `Purchased ${bundle?.label ?? bundleId} via Stripe`,
        stripeSessionId: session.id,
      });
    } catch (err) {
      const msg = String((err as Error)?.message ?? err);
      if (msg.includes('unique') || msg.includes('duplicate')) {
        // Already processed — return 200 so Stripe stops retrying
        return NextResponse.json({ received: true });
      }
      console.error('Stripe webhook: failed to record transaction', err);
      return NextResponse.json({ error: 'Failed to record transaction' }, { status: 500 });
    }

    // Update the credit balance
    try {
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
    } catch (err) {
      console.error('Stripe webhook: failed to update credit balance', err);
      return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
