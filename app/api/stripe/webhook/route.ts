import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { fulfillCheckoutSession } from '@/lib/stripe-fulfill';
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

    try {
      await fulfillCheckoutSession(
        session.id,
        session.payment_status,
        session.metadata as Record<string, string> | null
      );
    } catch (err) {
      console.error('Stripe webhook: fulfillment failed for session', session.id, err);
      return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
