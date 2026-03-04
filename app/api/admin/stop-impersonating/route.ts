import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { stopImpersonation, getSession } from '@/lib/auth';

export const POST = withAuth(async (_req, _user) => {
  const session = await getSession();

  if (!session.originalUserId) {
    return NextResponse.json(
      { error: 'Not currently impersonating anyone' },
      { status: 400 }
    );
  }

  await stopImpersonation();

  return NextResponse.json({ success: true });
}, 'stop impersonating');
