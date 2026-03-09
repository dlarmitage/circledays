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
  // List the user's recent checkout sessions from Stripe
  const sessions = await getStripe().checkout.sessions.list({
    limit: 5,
  });

  let fulfilled = false;
  for (const session of sessions.data) {
    // Only process sessions belonging to this user
    if (session.metadata?.userId !== user.id) continue;
    if (session.payment_status !== 'paid') continue;

    try {
      const result = await fulfillCheckoutSession(
        session.id,
        session.payment_status,
        session.metadata as Record<string, string>
      );
      if (result) fulfilled = true;
    } catch (err) {
      console.error('Fulfill endpoint: failed for session', session.id, err);
    }
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
