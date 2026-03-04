import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

type User = Awaited<ReturnType<typeof requireAuth>>;

/**
 * Wraps an authenticated API route handler with standard error handling.
 * Handles: requireAuth() → 401, ZodError → 400, generic → 500.
 */
export function withAuth(
  handler: (req: NextRequest, user: User) => Promise<NextResponse>,
  operationName?: string
) {
  return async (req: NextRequest) => {
    try {
      const user = await requireAuth();
      return await handler(req, user);
    } catch (error) {
      return handleApiError(error, operationName);
    }
  };
}

/**
 * Wraps an authenticated API route handler that receives route params.
 * Use for dynamic routes like /api/profiles/[id].
 */
export function withAuthParams<P extends Record<string, string>>(
  handler: (req: NextRequest, user: User, params: P) => Promise<NextResponse>,
  operationName?: string
) {
  return async (req: NextRequest, context: { params: Promise<P> }) => {
    try {
      const user = await requireAuth();
      const params = await context.params;
      return await handler(req, user, params);
    } catch (error) {
      return handleApiError(error, operationName);
    }
  };
}

/**
 * Wraps a public (unauthenticated) API route handler with standard error handling.
 * Handles: ZodError → 400, generic → 500.
 */
export function withPublicHandler(
  handler: (req: NextRequest) => Promise<NextResponse>,
  operationName?: string
) {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (error) {
      return handleApiError(error, operationName);
    }
  };
}

function handleApiError(error: unknown, operationName?: string): NextResponse {
  if (error instanceof Error && error.message === 'Unauthorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Invalid data', details: error.issues },
      { status: 400 }
    );
  }

  const label = operationName || 'API';
  console.error(`${label} error:`, error);
  return NextResponse.json(
    { error: `Failed to ${operationName || 'process request'}` },
    { status: 500 }
  );
}
