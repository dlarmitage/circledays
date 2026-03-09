import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { getStripe } from '@/lib/stripe';
import { fulfillCheckoutSession } from '@/lib/stripe-fulfill';
import { db } from '@/lib/db';
import { cardCredits } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// POST /api/stripe/fulfill — client calls this after Stripe onComplete to
// immediately fulfill the purchase without waiting for the webhook.
export const POST = withAuth(async (_request, user) => {
  // Find the user's most recent paid checkout session from Stripe.
  // Only fulfill one session — the webhook handles anything older.
  const sessions = await getStripe().checkout.sessions.list({
    limit: 10,
  });

  let fulfilled = false;
  for (const session of sessions.data) {
    if (session.metadata?.userId !== user.id) continue;
    if (session.payment_status !== 'paid') continue;

    // Found the most recent paid session for this user — fulfill it and stop
    try {
      fulfilled = await fulfillCheckoutSession(
        session.id,
        session.payment_status,
        session.metadata as Record<string, string>
      );
    } catch (err) {
      console.error('Fulfill endpoint: failed for session', session.id, err);
    }
    break;
  }

  // Return current balance
  const [creditRow] = await db
    .select()
    .from(cardCredits)
    .where(eq(cardCredits.userId, user.id));

  return NextResponse.json({
    fulfilled,
    balance: creditRow?.balance ?? 0,
  });
}, 'fulfill stripe purchase');
