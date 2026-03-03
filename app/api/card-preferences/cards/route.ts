import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listCards } from '@/lib/handwrytten';

// GET /api/card-preferences/cards?category_id=X — list cards for a category
export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const categoryId = request.nextUrl.searchParams.get('category_id');

    if (!categoryId) {
      return NextResponse.json(
        { error: 'category_id query parameter is required' },
        { status: 400 }
      );
    }

    const parsed = parseInt(categoryId, 10);
    if (isNaN(parsed)) {
      return NextResponse.json(
        { error: 'category_id must be a number' },
        { status: 400 }
      );
    }

    const cards = await listCards(parsed);
    return NextResponse.json({ cards });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Cards list error:', error);
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }
}
