import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { getStripe } from '@/lib/stripe';
import { CREDIT_BUNDLES } from '@/app/api/card-credits/route';
import { z } from 'zod';

const checkoutSchema = z.object({
  bundleId: z.enum(['bundle_1', 'bundle_5', 'bundle_10']),
  returnPath: z.string().optional(),
});

// POST /api/stripe/checkout — create a Stripe Checkout session for a credit bundle
export const POST = withAuth(async (request, user) => {
  const body = await request.json();
  const { bundleId, returnPath } = checkoutSchema.parse(body);

  const bundle = CREDIT_BUNDLES.find(b => b.id === bundleId)!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://circledays.ambient.technology';

  const session = await getStripe().checkout.sessions.create({
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
    redirect_on_completion: 'if_required',
    return_url: `${appUrl}${returnPath || '/settings?credits=added'}`,
    metadata: {
      userId: user.id,
      bundleId,
      quantity: String(bundle.quantity),
    },
  });

  return NextResponse.json({ clientSecret: session.client_secret });
}, 'create checkout session');
