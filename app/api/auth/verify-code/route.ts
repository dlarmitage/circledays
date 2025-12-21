import { NextRequest, NextResponse } from 'next/server';
import { db, magicLinks, users } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { eq, and, gt } from 'drizzle-orm';
import { z } from 'zod';

const verifyCodeSchema = z.object({
    email: z.string().email(),
    code: z.string().length(6),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, code } = verifyCodeSchema.parse(body);

        // Find valid magic link with matching email and code
        const [magicLink] = await db
            .select()
            .from(magicLinks)
            .where(
                and(
                    eq(magicLinks.email, email.toLowerCase()),
                    eq(magicLinks.code, code),
                    eq(magicLinks.used, false),
                    gt(magicLinks.expiresAt, new Date())
                )
            )
            .limit(1);

        if (!magicLink) {
            return NextResponse.json(
                { error: 'Invalid or expired code. Please request a new one.' },
                { status: 400 }
            );
        }

        // Mark as used
        await db
            .update(magicLinks)
            .set({ used: true })
            .where(eq(magicLinks.id, magicLink.id));

        // Check if user exists
        const [existingUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, email.toLowerCase()))
            .limit(1);

        if (existingUser) {
            // Create session for existing user
            await createSession(existingUser.id);
            return NextResponse.json({
                success: true,
                redirect: '/dashboard',
                isNewUser: false
            });
        } else {
            // New user - redirect to onboarding
            return NextResponse.json({
                success: true,
                redirect: `/onboarding?email=${encodeURIComponent(email.toLowerCase())}`,
                isNewUser: true
            });
        }
    } catch (error) {
        console.error('Verify code error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid code format' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Verification failed' },
            { status: 500 }
        );
    }
}
