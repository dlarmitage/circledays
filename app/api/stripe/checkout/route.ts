import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { CREDIT_BUNDLES } from '@/app/api/card-credits/route';
import { z } from 'zod';

const checkoutSchema = z.object({
  bundleId: z.enum(['bundle_1', 'bundle_5', 'bundle_10']),
});

// POST /api/stripe/checkout — create a Stripe Checkout session for a credit bundle
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { bundleId } = checkoutSchema.parse(body);

    const bundle = CREDIT_BUNDLES.find(b => b.id === bundleId)!;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://circledays.ambient.technology';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `CircleDays Card Credits — ${bundle.label}`,
              description: `${bundle.quantity} handwritten card credit${bundle.quantity > 1 ? 's' : ''}`,
            },
            unit_amount: Math.round(bundle.priceUsd * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      ui_mode: 'embedded',
      return_url: `${appUrl}/settings?credits=added`,
      metadata: {
        userId: user.id,
        bundleId,
        quantity: String(bundle.quantity),
      },
    });

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
