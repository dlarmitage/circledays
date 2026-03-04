import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { db, users, profiles } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { eq, ilike, or, gt, and, count, sql } from 'drizzle-orm';

const PAGE_SIZE = 30;

export const GET = withAuth(async (request, _user) => {
  // For this endpoint, we need to check admin status via the original user
  // in case we're currently impersonating someone
  const session = await getSession();
  const adminId = session.originalUserId || session.userId;

  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [admin] = await db
    .select()
    .from(users)
    .where(eq(users.id, adminId))
    .limit(1);

  if (!admin || !admin.isPlatformAdmin) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get('search') || '';
  const cursor = searchParams.get('cursor') || ''; // name-based cursor for alphabetical paging

  // Build where conditions
  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(users.name, `%${search}%`),
        ilike(users.email, `%${search}%`)
      )!
    );
  }
  if (cursor) {
    conditions.push(gt(users.name, cursor));
  }

  // Build query for users with their profile info
  const whereClause = conditions.length > 0
    ? conditions.length === 1 ? conditions[0] : and(...conditions)
    : undefined;

  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      notificationChannel: users.notificationChannel,
      profilePicture: profiles.profilePicture,
      connectionCount: sql<number>`(
        SELECT COUNT(*)::int FROM connections
        WHERE connections.profile_a_id = ${profiles.id}
           OR connections.profile_b_id = ${profiles.id}
      )`.as('connection_count'),
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.linkedUserId, users.id))
    .where(whereClause)
    .orderBy(users.name)
    .limit(PAGE_SIZE + 1); // Fetch one extra to know if there's more

  const hasMore = result.length > PAGE_SIZE;
  const pageUsers = hasMore ? result.slice(0, PAGE_SIZE) : result;
  const nextCursor = hasMore ? pageUsers[pageUsers.length - 1].name : null;

  // Get total count for display
  const countConditions = search
    ? or(
        ilike(users.name, `%${search}%`),
        ilike(users.email, `%${search}%`)
      )
    : undefined;

  const [totalResult] = await db
    .select({ count: count() })
    .from(users)
    .where(countConditions);

  return NextResponse.json({
    users: pageUsers,
    totalCount: totalResult.count,
    nextCursor,
    hasMore,
    currentImpersonating: session.userId !== adminId ? session.userId : null,
  });
}, 'list users');
