import { NextRequest, NextResponse } from 'next/server';
import { db, loginEvents, users } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { eq, gte, sql, count, countDistinct } from 'drizzle-orm';

// GET /api/admin/analytics?period=7d
export async function GET(request: NextRequest) {
    try {
        // Check admin status via the original user (in case impersonating)
        const session = await getSession();
        const adminId = session.originalUserId || session.userId;

        if (!adminId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
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
        const period = searchParams.get('period') || '7d';

        // Calculate start date based on period
        const now = new Date();
        let startDate: Date;

        switch (period) {
            case '24h':
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        // Total logins in period
        const [totalLogins] = await db
            .select({ count: count() })
            .from(loginEvents)
            .where(gte(loginEvents.createdAt, startDate));

        // Unique users in period
        const [uniqueUsers] = await db
            .select({ count: countDistinct(loginEvents.userId) })
            .from(loginEvents)
            .where(gte(loginEvents.createdAt, startDate));

        // Logins by method
        const loginsByMethod = await db
            .select({
                method: loginEvents.loginMethod,
                count: count(),
            })
            .from(loginEvents)
            .where(gte(loginEvents.createdAt, startDate))
            .groupBy(loginEvents.loginMethod);

        // Daily login counts (last 7 days for chart)
        const dailyLogins = await db
            .select({
                date: sql<string>`DATE(${loginEvents.createdAt})`,
                count: count(),
            })
            .from(loginEvents)
            .where(gte(loginEvents.createdAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)))
            .groupBy(sql`DATE(${loginEvents.createdAt})`)
            .orderBy(sql`DATE(${loginEvents.createdAt})`);

        // Top users by login frequency (top 10)
        const topUsers = await db
            .select({
                userId: loginEvents.userId,
                userName: users.name,
                userEmail: users.email,
                loginCount: count(),
            })
            .from(loginEvents)
            .leftJoin(users, eq(loginEvents.userId, users.id))
            .where(gte(loginEvents.createdAt, startDate))
            .groupBy(loginEvents.userId, users.name, users.email)
            .orderBy(sql`count(*) DESC`)
            .limit(10);

        // Total registered users
        const [totalUsers] = await db
            .select({ count: count() })
            .from(users);

        return NextResponse.json({
            period,
            startDate: startDate.toISOString(),
            endDate: now.toISOString(),
            metrics: {
                totalLogins: totalLogins.count,
                uniqueUsers: uniqueUsers.count,
                totalRegisteredUsers: totalUsers.count,
            },
            loginsByMethod: loginsByMethod.reduce((acc, item) => {
                acc[item.method] = item.count;
                return acc;
            }, {} as Record<string, number>),
            dailyLogins: dailyLogins.map(d => ({
                date: d.date,
                count: d.count,
            })),
            topUsers: topUsers.map(u => ({
                userId: u.userId,
                name: u.userName,
                email: u.userEmail,
                loginCount: u.loginCount,
            })),
        });
    } catch (error) {
        console.error('Analytics error:', error);

        return NextResponse.json(
            { error: 'Failed to fetch analytics' },
            { status: 500 }
        );
    }
}
