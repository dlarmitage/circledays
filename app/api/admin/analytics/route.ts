import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import {
  db, loginEvents, users, profiles, connections, events,
  cardOrders, cardCreditTransactions, cardPreferences,
  invites, notificationLogs,
} from '@/lib/db';
import { getSession } from '@/lib/auth';
import { eq, gte, sql, count, countDistinct, and, or, desc } from 'drizzle-orm';

// GET /api/admin/analytics?period=7d
export const GET = withAuth(async (request) => {
  // Check admin status via the original user (in case impersonating)
  const session = await getSession();
  const adminId = session.originalUserId || session.userId;

  if (!adminId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const [admin] = await db.select().from(users).where(eq(users.id, adminId)).limit(1);
  if (!admin || !admin.isPlatformAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const period = searchParams.get('period') || '7d';

  const now = new Date();
  let startDate: Date;
  switch (period) {
    case '24h': startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
    case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
    case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
    case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
    default: startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  // ─── Login metrics (existing) ─────────────────────────────────────

  const [totalLogins] = await db
    .select({ count: count() })
    .from(loginEvents)
    .where(gte(loginEvents.createdAt, startDate));

  const [uniqueUsers] = await db
    .select({ count: countDistinct(loginEvents.userId) })
    .from(loginEvents)
    .where(gte(loginEvents.createdAt, startDate));

  const loginsByMethod = await db
    .select({ method: loginEvents.loginMethod, count: count() })
    .from(loginEvents)
    .where(gte(loginEvents.createdAt, startDate))
    .groupBy(loginEvents.loginMethod);

  const dailyLogins = await db
    .select({ date: sql<string>`DATE(${loginEvents.createdAt})`, count: count() })
    .from(loginEvents)
    .where(gte(loginEvents.createdAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)))
    .groupBy(sql`DATE(${loginEvents.createdAt})`)
    .orderBy(sql`DATE(${loginEvents.createdAt})`);

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

  // ─── User growth ──────────────────────────────────────────────────

  const [totalUsers] = await db.select({ count: count() }).from(users);

  const [newUsersInPeriod] = await db
    .select({ count: count() })
    .from(users)
    .where(gte(users.createdAt, startDate));

  const userGrowth = await db
    .select({ date: sql<string>`DATE(${users.createdAt})`, count: count() })
    .from(users)
    .where(gte(users.createdAt, startDate))
    .groupBy(sql`DATE(${users.createdAt})`)
    .orderBy(sql`DATE(${users.createdAt})`);

  // ─── Network metrics ──────────────────────────────────────────────

  const [totalProfileCount] = await db.select({ count: count() }).from(profiles);
  const [totalConnectionCount] = await db.select({ count: count() }).from(connections);

  const [newConnectionsInPeriod] = await db
    .select({ count: count() })
    .from(connections)
    .where(gte(connections.createdAt, startDate));

  // ─── Events metrics ───────────────────────────────────────────────

  const [totalEventCount] = await db.select({ count: count() }).from(events);

  const eventsByType = await db
    .select({ type: events.type, count: count() })
    .from(events)
    .groupBy(events.type);

  // ─── Cards & revenue ──────────────────────────────────────────────

  const [totalCardsSent] = await db.select({ count: count() }).from(cardOrders);

  const [cardsSentInPeriod] = await db
    .select({ count: count() })
    .from(cardOrders)
    .where(gte(cardOrders.createdAt, startDate));

  const cardStatusBreakdown = await db
    .select({ status: cardOrders.status, count: count() })
    .from(cardOrders)
    .groupBy(cardOrders.status);

  const [creditsPurchased] = await db
    .select({ total: sql<number>`COALESCE(SUM(${cardCreditTransactions.amount}), 0)` })
    .from(cardCreditTransactions)
    .where(and(
      eq(cardCreditTransactions.type, 'purchase'),
      gte(cardCreditTransactions.createdAt, startDate),
    ));

  const [creditsUsed] = await db
    .select({ total: sql<number>`COALESCE(ABS(SUM(${cardCreditTransactions.amount})), 0)` })
    .from(cardCreditTransactions)
    .where(and(
      eq(cardCreditTransactions.type, 'use'),
      gte(cardCreditTransactions.createdAt, startDate),
    ));

  // ─── Feature adoption ─────────────────────────────────────────────

  const [usersWithCardPrefs] = await db.select({ count: count() }).from(cardPreferences);

  const [usersWhoSentCards] = await db
    .select({ count: countDistinct(cardOrders.userId) })
    .from(cardOrders);

  // ─── Invites ──────────────────────────────────────────────────────

  const [invitesSentInPeriod] = await db
    .select({ count: count() })
    .from(invites)
    .where(gte(invites.createdAt, startDate));

  const [invitesAcceptedInPeriod] = await db
    .select({ count: count() })
    .from(invites)
    .where(and(
      eq(invites.status, 'accepted'),
      gte(invites.createdAt, startDate),
    ));

  // ─── Notifications ────────────────────────────────────────────────

  const [notifsSentInPeriod] = await db
    .select({ count: count() })
    .from(notificationLogs)
    .where(gte(notificationLogs.sentAt, startDate));

  const [notifsFailedInPeriod] = await db
    .select({ count: count() })
    .from(notificationLogs)
    .where(and(
      eq(notificationLogs.status, 'failed'),
      gte(notificationLogs.sentAt, startDate),
    ));

  // ─── Per-user engagement (top users by circle size) ───────────────

  const topByConnections = await db
    .select({
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      connectionCount: count(connections.id),
    })
    .from(users)
    .innerJoin(profiles, eq(profiles.linkedUserId, users.id))
    .innerJoin(connections, or(
      eq(connections.profileAId, profiles.id),
      eq(connections.profileBId, profiles.id),
    ))
    .groupBy(users.id, users.name, users.email)
    .orderBy(sql`count(${connections.id}) DESC`)
    .limit(10);

  // ─── Card detail: who purchased credits & who sent cards ──────────

  const creditPurchases = await db
    .select({
      userName: users.name,
      userEmail: users.email,
      amount: cardCreditTransactions.amount,
      description: cardCreditTransactions.description,
      createdAt: cardCreditTransactions.createdAt,
    })
    .from(cardCreditTransactions)
    .leftJoin(users, eq(cardCreditTransactions.userId, users.id))
    .where(eq(cardCreditTransactions.type, 'purchase'))
    .orderBy(desc(cardCreditTransactions.createdAt))
    .limit(20);

  const recentCardOrders = await db
    .select({
      userName: users.name,
      userEmail: users.email,
      recipientName: cardOrders.recipientName,
      status: cardOrders.status,
      createdAt: cardOrders.createdAt,
    })
    .from(cardOrders)
    .leftJoin(users, eq(cardOrders.userId, users.id))
    .orderBy(desc(cardOrders.createdAt))
    .limit(20);

  // ─── Invite detail: who sent & who accepted ─────────────────────

  const recentInvites = await db
    .select({
      inviterName: users.name,
      inviterEmail: users.email,
      inviteeEmail: invites.email,
      profileName: profiles.name,
      status: invites.status,
      createdAt: invites.createdAt,
    })
    .from(invites)
    .leftJoin(users, eq(invites.invitedByUserId, users.id))
    .leftJoin(profiles, eq(invites.profileId, profiles.id))
    .orderBy(desc(invites.createdAt))
    .limit(20);

  // ─── Notification detail: failed deliveries ─────────────────────

  const failedNotifications = await db
    .select({
      userName: users.name,
      userEmail: users.email,
      channel: notificationLogs.channel,
      errorMessage: notificationLogs.errorMessage,
      sentAt: notificationLogs.sentAt,
    })
    .from(notificationLogs)
    .leftJoin(users, eq(notificationLogs.userId, users.id))
    .where(eq(notificationLogs.status, 'failed'))
    .orderBy(desc(notificationLogs.sentAt))
    .limit(20);

  // ─── Response ─────────────────────────────────────────────────────

  const notifTotal = notifsSentInPeriod.count;
  const notifFailed = notifsFailedInPeriod.count;

  return NextResponse.json({
    period,
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),

    // Login metrics
    metrics: {
      totalLogins: totalLogins.count,
      uniqueUsers: uniqueUsers.count,
      totalRegisteredUsers: totalUsers.count,
    },
    loginsByMethod: loginsByMethod.reduce((acc, item) => {
      acc[item.method] = item.count;
      return acc;
    }, {} as Record<string, number>),
    dailyLogins: dailyLogins.map(d => ({ date: d.date, count: d.count })),
    topUsers: topUsers.map(u => ({
      userId: u.userId, name: u.userName, email: u.userEmail, loginCount: u.loginCount,
    })),

    // Growth
    growth: {
      newUsersInPeriod: newUsersInPeriod.count,
      userGrowth: userGrowth.map(d => ({ date: d.date, count: d.count })),
    },

    // Network
    network: {
      totalProfiles: totalProfileCount.count,
      totalConnections: totalConnectionCount.count,
      newConnectionsInPeriod: newConnectionsInPeriod.count,
      avgConnectionsPerUser: totalUsers.count > 0
        ? Math.round((totalConnectionCount.count / totalUsers.count) * 10) / 10
        : 0,
      topByConnections: topByConnections.map(u => ({
        userId: u.userId, name: u.userName, email: u.userEmail,
        connectionCount: Number(u.connectionCount),
      })),
    },

    // Events
    eventMetrics: {
      totalEvents: totalEventCount.count,
      byType: eventsByType.reduce((acc, item) => {
        acc[item.type] = item.count;
        return acc;
      }, {} as Record<string, number>),
    },

    // Cards & revenue
    cards: {
      totalSent: totalCardsSent.count,
      sentInPeriod: cardsSentInPeriod.count,
      creditsPurchasedInPeriod: Number(creditsPurchased.total),
      creditsUsedInPeriod: Number(creditsUsed.total),
      usersWithPrefs: usersWithCardPrefs.count,
      usersWhoSentCards: usersWhoSentCards.count,
      statusBreakdown: cardStatusBreakdown.reduce((acc, item) => {
        acc[item.status] = item.count;
        return acc;
      }, {} as Record<string, number>),
      recentPurchases: creditPurchases.map(p => ({
        name: p.userName, email: p.userEmail,
        amount: p.amount, description: p.description,
        date: p.createdAt?.toISOString(),
      })),
      recentOrders: recentCardOrders.map(o => ({
        senderName: o.userName, senderEmail: o.userEmail,
        recipientName: o.recipientName, status: o.status,
        date: o.createdAt?.toISOString(),
      })),
    },

    // Invites
    invites: {
      sentInPeriod: invitesSentInPeriod.count,
      acceptedInPeriod: invitesAcceptedInPeriod.count,
      recent: recentInvites.map(i => ({
        inviterName: i.inviterName, inviterEmail: i.inviterEmail,
        inviteeEmail: i.inviteeEmail, profileName: i.profileName,
        status: i.status, date: i.createdAt?.toISOString(),
      })),
    },

    // Notifications
    notifications: {
      sentInPeriod: notifTotal,
      failedInPeriod: notifFailed,
      successRate: notifTotal > 0
        ? Math.round(((notifTotal - notifFailed) / notifTotal) * 100)
        : 100,
      recentFailures: failedNotifications.map(f => ({
        name: f.userName, email: f.userEmail,
        channel: f.channel,
        errorMessage: typeof f.errorMessage === 'object' ? JSON.stringify(f.errorMessage) : f.errorMessage,
        date: f.sentAt?.toISOString(),
      })),
    },
  });
}, 'fetch analytics');
