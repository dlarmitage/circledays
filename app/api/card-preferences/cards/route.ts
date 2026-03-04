import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { listCards } from '@/lib/handwrytten';

// GET /api/card-preferences/cards?category_id=X — list cards for a category
export const GET = withAuth(async (request, _user) => {
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
}, 'fetch cards');
