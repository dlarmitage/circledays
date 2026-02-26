import { NextResponse } from 'next/server';
import { stopImpersonation, getSession } from '@/lib/auth';

export async function POST() {
  try {
    const session = await getSession();

    if (!session.originalUserId) {
      return NextResponse.json(
        { error: 'Not currently impersonating anyone' },
        { status: 400 }
      );
    }

    await stopImpersonation();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Stop impersonating error:', error);

    return NextResponse.json(
      { error: 'Failed to stop impersonating' },
      { status: 500 }
    );
  }
}
