'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import {
  Shield, Search, Eye, ArrowLeft, Check, ChevronDown,
  BarChart3, Users as UsersIcon, LogIn, TrendingUp,
  Mail, Smartphone, Link2, Calendar, Heart,
  Send, CreditCard, Bell, UserPlus, AlertTriangle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────

type MetricKey = 'users' | 'active' | 'signups' | 'logins' | 'profiles' | 'connections' | 'events' | 'circleSize';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  profilePicture: string | null;
  connectionCount: number;
  notificationChannel: 'email' | 'sms' | 'both';
}

interface AnalyticsData {
  period: string;
  metrics: {
    totalLogins: number;
    uniqueUsers: number;
    totalRegisteredUsers: number;
  };
  loginsByMethod: Record<string, number>;
  dailyLogins: { date: string; count: number }[];
  topUsers: { userId: string; name: string; email: string; loginCount: number }[];
  growth: {
    newUsersInPeriod: number;
    userGrowth: { date: string; count: number }[];
  };
  network: {
    totalProfiles: number;
    totalConnections: number;
    newConnectionsInPeriod: number;
    avgConnectionsPerUser: number;
    topByConnections: { userId: string; name: string; email: string; connectionCount: number }[];
  };
  eventMetrics: {
    totalEvents: number;
    byType: Record<string, number>;
  };
  cards: {
    totalSent: number;
    sentInPeriod: number;
    creditsPurchasedInPeriod: number;
    creditsUsedInPeriod: number;
    usersWithPrefs: number;
    usersWhoSentCards: number;
    statusBreakdown: Record<string, number>;
    recentPurchases: { name: string; email: string; amount: number; description: string; date: string }[];
    recentOrders: { senderName: string; senderEmail: string; recipientName: string; status: string; date: string }[];
  };
  invites: {
    sentInPeriod: number;
    acceptedInPeriod: number;
    recent: { inviterName: string; inviterEmail: string; inviteeEmail: string; profileName: string; status: string; date: string }[];
  };
  notifications: {
    sentInPeriod: number;
    failedInPeriod: number;
    successRate: number;
    recentFailures: { name: string; email: string; channel: string; errorMessage: string | null; date: string }[];
  };
}

type Tab = 'view-as' | 'analytics';

// ─── Main Page ───────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('analytics');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // View As state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [currentImpersonating, setCurrentImpersonating] = useState<string | null>(null);

  // Analytics state
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('7d');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // ─── View As logic ─────────────────────────────────────────────────

  const fetchUsers = useCallback(async (searchQuery: string, cursor?: string) => {
    const isLoadMore = !!cursor;
    if (isLoadMore) setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (cursor) params.set('cursor', cursor);
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.status === 403) { setIsAdmin(false); return; }
      const data = await res.json();
      if (isLoadMore) {
        setUsers(prev => [...prev, ...(data.users || [])]);
      } else {
        setUsers(data.users || []);
      }
      setTotalCount(data.totalCount || 0);
      setNextCursor(data.nextCursor || null);
      setHasMore(data.hasMore || false);
      setCurrentImpersonating(data.currentImpersonating);
      setIsAdmin(true);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchUsers(''); }, [fetchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(search), 300);
    return () => clearTimeout(timer);
  }, [search, fetchUsers]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && nextCursor && !loadingMore) fetchUsers(search, nextCursor);
  }, [hasMore, nextCursor, loadingMore, search, fetchUsers]);

  const handleImpersonate = async (userId: string) => {
    setImpersonating(userId);
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        window.location.href = '/dashboard';
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to impersonate');
        setImpersonating(null);
      }
    } catch (error) {
      console.error('Impersonate error:', error);
      setImpersonating(null);
    }
  };

  const handleStopImpersonating = async () => {
    try {
      const res = await fetch('/api/admin/stop-impersonating', { method: 'POST' });
      if (res.ok) window.location.href = '/admin';
    } catch (error) {
      console.error('Stop impersonating error:', error);
    }
  };

  // ─── Analytics logic ───────────────────────────────────────────────

  const fetchAnalytics = useCallback(async (period: string) => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?period=${period}`);
      if (res.ok) setAnalytics(await res.json());
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics' && isAdmin) fetchAnalytics(analyticsPeriod);
  }, [activeTab, analyticsPeriod, isAdmin, fetchAnalytics]);

  // ─── Loading / Access denied ───────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="text-center py-16">
          <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Admin Access Required</h1>
          <p className="text-gray-500">You don&apos;t have permission to access this page.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 text-teal-600 hover:text-teal-700 text-sm font-medium"
          >
            &larr; Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─── Tabs ──────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: typeof Eye }[] = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'view-as', label: 'View As', icon: Eye },
  ];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900">
            Admin
          </h1>
        </div>
      </div>

      {currentImpersonating && (
        <Card className="mb-4 border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800">
                <Eye className="w-4 h-4" />
                <span className="text-sm font-medium">
                  You are currently impersonating another user.
                </span>
              </div>
              <button
                onClick={handleStopImpersonating}
                className="text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors"
              >
                Stop Impersonating
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center',
              activeTab === id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'view-as' && (
        <ViewAsTab
          users={users}
          totalCount={totalCount}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={handleLoadMore}
          search={search}
          onSearchChange={setSearch}
          impersonating={impersonating}
          currentImpersonating={currentImpersonating}
          onImpersonate={handleImpersonate}
        />
      )}

      {activeTab === 'analytics' && (
        <AnalyticsTab
          analytics={analytics}
          period={analyticsPeriod}
          onPeriodChange={setAnalyticsPeriod}
          loading={analyticsLoading}
        />
      )}
    </div>
  );
}

// ─── View As Tab ─────────────────────────────────────────────────────

function ViewAsTab({
  users,
  totalCount,
  hasMore,
  loadingMore,
  onLoadMore,
  search,
  onSearchChange,
  impersonating,
  currentImpersonating,
  onImpersonate,
}: {
  users: AdminUser[];
  totalCount: number;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  search: string;
  onSearchChange: (s: string) => void;
  impersonating: string | null;
  currentImpersonating: string | null;
  onImpersonate: (id: string) => void;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) onLoadMore(); },
      { threshold: 0, rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  return (
    <>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Users ({totalCount})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-sm text-gray-500">
                {search ? 'No users match your search.' : 'No users found.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {users.map((user) => {
                const isCurrentlyImpersonating = currentImpersonating === user.id;
                const isLoading = impersonating === user.id;
                return (
                  <div key={user.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar src={user.profilePicture} name={user.name} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{user.name}</p>
                        <p className="text-sm text-gray-500 truncate flex items-center gap-1">
                          <span className="truncate">{user.email}</span>
                          <span className="text-gray-300 flex-shrink-0">&middot;</span>
                          <span className="text-gray-400 flex-shrink-0">{user.connectionCount}</span>
                          <span className="text-gray-300 flex-shrink-0">&middot;</span>
                          <span className="flex items-center gap-0.5 flex-shrink-0">
                            <Mail className={cn('w-3 h-3', (user.notificationChannel === 'email' || user.notificationChannel === 'both') ? 'text-teal-500' : 'text-gray-300')} />
                            <Smartphone className={cn('w-3 h-3', (user.notificationChannel === 'sms' || user.notificationChannel === 'both') ? 'text-teal-500' : 'text-gray-300')} />
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {isCurrentlyImpersonating ? (
                        <span className="flex items-center gap-1 text-sm text-amber-600 font-medium">
                          <Check className="w-4 h-4" /> Active
                        </span>
                      ) : (
                        <button
                          onClick={() => onImpersonate(user.id)}
                          disabled={!!impersonating}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-full transition-colors disabled:opacity-50"
                        >
                          {isLoading ? <Spinner size="sm" /> : <Eye className="w-4 h-4" />}
                          View as
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {hasMore && (
                <div ref={sentinelRef} className="flex justify-center py-4">
                  {loadingMore && <Spinner size="sm" />}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ─── Analytics Tab ───────────────────────────────────────────────────

const periodOptions = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

const methodLabels: Record<string, string> = {
  magic_link: 'Magic Link',
  verification_code: 'Verification Code',
  invite_accept: 'Invite Accept',
  onboarding: 'Onboarding',
};

const eventTypeLabels: Record<string, string> = {
  birthday: 'Birthdays',
  anniversary: 'Anniversaries',
  custom: 'Custom Events',
};

function AnalyticsTab({
  analytics,
  period,
  onPeriodChange,
  loading,
}: {
  analytics: AnalyticsData | null;
  period: string;
  onPeriodChange: (p: string) => void;
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState<MetricKey | null>(null);

  const toggle = (key: MetricKey) => setExpanded(prev => prev === key ? null : key);

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-16">
        <BarChart3 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p className="text-sm text-gray-500">Failed to load analytics.</p>
      </div>
    );
  }

  const maxDaily = Math.max(...analytics.dailyLogins.map(d => d.count), 1);
  const totalMethodLogins = Object.values(analytics.loginsByMethod).reduce((a, b) => a + b, 0) || 1;
  const maxUserLogins = Math.max(...analytics.topUsers.map(u => u.loginCount), 1);
  const { network, cards, invites, notifications, eventMetrics, growth } = analytics;

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2 flex-wrap">
        {periodOptions.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onPeriodChange(value)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors',
              period === value
                ? 'bg-teal-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      )}

      {/* ─── Overview cards (row 1) ──────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard metricKey="users" icon={<UsersIcon className="w-5 h-5" />} label="Registered Users" value={analytics.metrics.totalRegisteredUsers} color="teal" expanded={expanded} onToggle={toggle} />
        <MetricCard metricKey="active" icon={<TrendingUp className="w-5 h-5" />} label="Active Users" value={analytics.metrics.uniqueUsers} color="emerald" subtext={`of ${analytics.metrics.totalRegisteredUsers}`} expanded={expanded} onToggle={toggle} />
        <MetricCard metricKey="signups" icon={<UserPlus className="w-5 h-5" />} label="New Signups" value={growth.newUsersInPeriod} color="blue" expanded={expanded} onToggle={toggle} />
        <MetricCard metricKey="logins" icon={<LogIn className="w-5 h-5" />} label="Total Logins" value={analytics.metrics.totalLogins} color="violet" expanded={expanded} onToggle={toggle} />
      </div>

      {/* Detail panel for row 1 */}
      <AnimatePresence>
        {expanded === 'users' && (
          <DetailPanel key="users">
            <DetailTitle>User Growth</DetailTitle>
            {growth.userGrowth.length > 0 ? (
              <div className="flex items-end gap-2 h-32">
                {growth.userGrowth.map((day) => {
                  const max = Math.max(...growth.userGrowth.map(d => d.count), 1);
                  const height = Math.max((day.count / max) * 100, 4);
                  const dayLabel = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <div key={day.date} className="flex flex-col items-center flex-1 gap-1">
                      <span className="text-xs font-medium text-gray-700">{day.count}</span>
                      <div className="w-full bg-teal-400 rounded-t-md" style={{ height: `${height}%` }} />
                      <span className="text-xs text-gray-500">{dayLabel}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No new users in this period.</p>
            )}
          </DetailPanel>
        )}

        {expanded === 'active' && (
          <DetailPanel key="active">
            <DetailTitle>Most Active Users (by logins)</DetailTitle>
            {analytics.topUsers.length > 0 ? (
              <div className="divide-y divide-gray-100 -mx-4">
                {analytics.topUsers.map((user, index) => (
                  <div key={user.userId} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-sm font-bold text-gray-400 w-6 text-right">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email || ''}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-24 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${(user.loginCount / maxUserLogins) * 100}%` }} />
                      </div>
                      <span className="text-sm font-medium text-gray-600 w-8 text-right">{user.loginCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No login data for this period.</p>
            )}
          </DetailPanel>
        )}

        {expanded === 'signups' && (
          <DetailPanel key="signups">
            <DetailTitle>New Signups</DetailTitle>
            {growth.userGrowth.length > 0 ? (
              <div className="flex items-end gap-2 h-32">
                {growth.userGrowth.map((day) => {
                  const max = Math.max(...growth.userGrowth.map(d => d.count), 1);
                  const height = Math.max((day.count / max) * 100, 4);
                  const dayLabel = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <div key={day.date} className="flex flex-col items-center flex-1 gap-1">
                      <span className="text-xs font-medium text-gray-700">{day.count}</span>
                      <div className="w-full bg-blue-400 rounded-t-md" style={{ height: `${height}%` }} />
                      <span className="text-xs text-gray-500">{dayLabel}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No new signups in this period.</p>
            )}
          </DetailPanel>
        )}

        {expanded === 'logins' && (
          <DetailPanel key="logins">
            <div className="space-y-6">
              {/* Daily logins chart */}
              {analytics.dailyLogins.length > 0 && (
                <div>
                  <DetailTitle>Daily Logins (Last 7 Days)</DetailTitle>
                  <div className="flex items-end gap-2 h-32">
                    {analytics.dailyLogins.map((day) => {
                      const height = Math.max((day.count / maxDaily) * 100, 4);
                      const dayLabel = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
                      return (
                        <div key={day.date} className="flex flex-col items-center flex-1 gap-1">
                          <span className="text-xs font-medium text-gray-700">{day.count}</span>
                          <div className="w-full bg-violet-400 rounded-t-md" style={{ height: `${height}%` }} />
                          <span className="text-xs text-gray-500">{dayLabel}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Login methods */}
              {Object.keys(analytics.loginsByMethod).length > 0 && (
                <div>
                  <DetailTitle>Login Methods</DetailTitle>
                  <div className="space-y-3">
                    {Object.entries(analytics.loginsByMethod)
                      .sort(([, a], [, b]) => b - a)
                      .map(([method, cnt]) => {
                        const pct = Math.round((cnt / totalMethodLogins) * 100);
                        return (
                          <div key={method}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700">{methodLabels[method] || method}</span>
                              <span className="text-sm text-gray-500">{cnt} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div className="bg-violet-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </DetailPanel>
        )}
      </AnimatePresence>

      {/* ─── Network & content cards (row 2) ─────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard metricKey="profiles" icon={<UsersIcon className="w-5 h-5" />} label="Profiles" value={network.totalProfiles} color="teal" expanded={expanded} onToggle={toggle} />
        <MetricCard metricKey="connections" icon={<Link2 className="w-5 h-5" />} label="Connections" value={network.totalConnections} color="blue" subtext={`+${network.newConnectionsInPeriod} new`} expanded={expanded} onToggle={toggle} />
        <MetricCard metricKey="events" icon={<Calendar className="w-5 h-5" />} label="Events Tracked" value={eventMetrics.totalEvents} color="emerald" expanded={expanded} onToggle={toggle} />
        <MetricCard metricKey="circleSize" icon={<Heart className="w-5 h-5" />} label="Avg Circle Size" value={network.avgConnectionsPerUser} color="rose" expanded={expanded} onToggle={toggle} />
      </div>

      {/* Detail panel for row 2 */}
      <AnimatePresence>
        {expanded === 'profiles' && (
          <DetailPanel key="profiles">
            <DetailTitle>Profile Overview</DetailTitle>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-gray-900">{network.totalProfiles}</p>
                <p className="text-xs text-gray-500">Total profiles created</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.metrics.totalRegisteredUsers > 0
                    ? Math.round((network.totalProfiles / analytics.metrics.totalRegisteredUsers) * 10) / 10
                    : 0}
                </p>
                <p className="text-xs text-gray-500">Profiles per user</p>
              </div>
            </div>
          </DetailPanel>
        )}

        {(expanded === 'connections' || expanded === 'circleSize') && (
          <DetailPanel key="connections-circles">
            <DetailTitle>Largest Circles</DetailTitle>
            {network.topByConnections.filter(u => u.connectionCount > 0).length > 0 ? (
              <div className="divide-y divide-gray-100 -mx-4">
                {network.topByConnections
                  .filter(u => u.connectionCount > 0)
                  .map((user, index) => {
                    const maxConn = network.topByConnections[0]?.connectionCount || 1;
                    return (
                      <div key={user.userId} className="flex items-center gap-3 px-4 py-3">
                        <span className="text-sm font-bold text-gray-400 w-6 text-right">{index + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email || ''}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-24 bg-gray-100 rounded-full h-1.5">
                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(user.connectionCount / maxConn) * 100}%` }} />
                          </div>
                          <span className="text-sm font-medium text-gray-600 w-8 text-right">{user.connectionCount}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No connection data yet.</p>
            )}
          </DetailPanel>
        )}

        {expanded === 'events' && (
          <DetailPanel key="events">
            <DetailTitle>Events by Type</DetailTitle>
            {Object.keys(eventMetrics.byType).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(eventMetrics.byType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, cnt]) => {
                    const pct = Math.round((cnt / eventMetrics.totalEvents) * 100);
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{eventTypeLabels[type] || type}</span>
                          <span className="text-sm text-gray-500">{cnt} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={cn(
                              'h-2 rounded-full transition-all',
                              type === 'birthday' ? 'bg-pink-400' :
                              type === 'anniversary' ? 'bg-red-400' : 'bg-teal-400'
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No events tracked yet.</p>
            )}
          </DetailPanel>
        )}
      </AnimatePresence>

      {/* ─── Cards & revenue ─────────────────────────────────────── */}
      <ExpandableCard
        icon={<Send className="w-4 h-4 text-teal-600" />}
        title="Handwritten Cards"
        summary={
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-bold text-gray-900">{cards.totalSent}</p>
              <p className="text-xs text-gray-500">Total Cards Sent</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{cards.sentInPeriod}</p>
              <p className="text-xs text-gray-500">Sent This Period</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{cards.creditsPurchasedInPeriod}</p>
              <p className="text-xs text-gray-500">Credits Purchased</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{cards.usersWhoSentCards}</p>
              <p className="text-xs text-gray-500">Users Who Sent Cards</p>
            </div>
          </div>
        }
      >
        {Object.keys(cards.statusBreakdown).length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Order Status</p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(cards.statusBreakdown).map(([status, cnt]) => (
                <span key={status} className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium',
                  status === 'complete' ? 'bg-emerald-50 text-emerald-700' :
                  status === 'problem' || status === 'cancelled' ? 'bg-red-50 text-red-700' :
                  'bg-gray-100 text-gray-600'
                )}>
                  {status}: {cnt}
                </span>
              ))}
            </div>
          </div>
        )}

        {cards.recentPurchases.length > 0 && (
          <div className="mb-4">
            <DetailTitle>Credit Purchases</DetailTitle>
            <div className="divide-y divide-gray-100 -mx-4">
              {cards.recentPurchases.map((p, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500 truncate">{p.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-sm font-semibold text-emerald-600">+{p.amount} credits</p>
                    <p className="text-xs text-gray-400">{new Date(p.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {cards.recentOrders.length > 0 && (
          <div>
            <DetailTitle>Recent Card Orders</DetailTitle>
            <div className="divide-y divide-gray-100 -mx-4">
              {cards.recentOrders.map((o, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {o.senderName || 'Unknown'} <span className="text-gray-400 font-normal">&rarr;</span> {o.recipientName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{o.senderEmail}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      o.status === 'complete' ? 'bg-emerald-50 text-emerald-700' :
                      o.status === 'problem' || o.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    )}>
                      {o.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(o.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {cards.recentPurchases.length === 0 && cards.recentOrders.length === 0 && (
          <p className="text-sm text-gray-400">No card activity yet.</p>
        )}
      </ExpandableCard>

      {/* ─── Invites & notifications ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ExpandableCard
          icon={<UserPlus className="w-4 h-4 text-blue-600" />}
          title="Invites"
          summary={
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{invites.sentInPeriod}</p>
                  <p className="text-xs text-gray-500">Sent</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{invites.acceptedInPeriod}</p>
                  <p className="text-xs text-gray-500">Accepted</p>
                </div>
              </div>
              {invites.sentInPeriod > 0 && (
                <div className="mt-3">
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.round((invites.acceptedInPeriod / invites.sentInPeriod) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {Math.round((invites.acceptedInPeriod / invites.sentInPeriod) * 100)}% acceptance rate
                  </p>
                </div>
              )}
            </>
          }
        >
          {invites.recent.length > 0 ? (
            <div className="divide-y divide-gray-100 -mx-4">
              {invites.recent.map((inv, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {inv.inviterName || 'Unknown'} <span className="text-gray-400 font-normal">invited</span> {inv.profileName || inv.inviteeEmail}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{inv.inviteeEmail}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      inv.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' :
                      inv.status === 'expired' ? 'bg-gray-100 text-gray-500' :
                      'bg-amber-50 text-amber-700'
                    )}>
                      {inv.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(inv.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No invites yet.</p>
          )}
        </ExpandableCard>

        <ExpandableCard
          icon={<Bell className="w-4 h-4 text-amber-600" />}
          title="Notifications"
          summary={
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{notifications.sentInPeriod}</p>
                  <p className="text-xs text-gray-500">Sent</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    <span className={notifications.successRate < 95 ? 'text-red-600' : ''}>
                      {notifications.successRate}%
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">Success Rate</p>
                </div>
              </div>
              {notifications.failedInPeriod > 0 && (
                <p className="text-xs text-red-500 mt-2">
                  {notifications.failedInPeriod} failed delivery attempts
                </p>
              )}
            </>
          }
        >
          {notifications.recentFailures.length > 0 ? (
            <>
              <DetailTitle>Failed Deliveries</DetailTitle>
              <div className="divide-y divide-gray-100 -mx-4">
                {notifications.recentFailures.map((f, i) => (
                  <div key={i} className="px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{f.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500 truncate">{f.email}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{f.channel}</span>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(f.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {f.errorMessage && (
                      <div className="mt-1.5 flex items-start gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-600 break-all">
                          {f.errorMessage === '[object Object]' ? 'Error details not captured (fixed for future failures)' : f.errorMessage}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">No failed deliveries in this period.</p>
          )}
        </ExpandableCard>
      </div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────

function DetailPanel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <Card className="border-teal-200 bg-teal-50/30">
        <CardContent className="p-4">{children}</CardContent>
      </Card>
    </motion.div>
  );
}

function DetailTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-gray-700 mb-3">{children}</h3>;
}

// ─── Expandable Card ──────────────────────────────────────────────────

function ExpandableCard({
  icon,
  title,
  summary,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  summary: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left"
      >
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {icon}
            <span className="flex-1">{title}</span>
            <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', open && 'rotate-180')} />
          </CardTitle>
        </CardHeader>
        <CardContent>{summary}</CardContent>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-2 border-t border-gray-100">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────

const colorClasses = {
  teal: 'bg-teal-50 text-teal-600',
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
  rose: 'bg-rose-50 text-rose-600',
};

function MetricCard({
  metricKey,
  icon,
  label,
  value,
  color,
  subtext,
  expanded,
  onToggle,
}: {
  metricKey: MetricKey;
  icon: React.ReactNode;
  label: string;
  value: number;
  color: keyof typeof colorClasses;
  subtext?: string;
  expanded: MetricKey | null;
  onToggle: (key: MetricKey) => void;
}) {
  const isExpanded = expanded === metricKey;
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isExpanded && 'ring-2 ring-teal-400 shadow-md'
      )}
      onClick={() => onToggle(metricKey)}
    >
      <CardContent className="p-4">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-2', colorClasses[color])}>
          {icon}
        </div>
        <div className="flex items-baseline gap-1.5">
          <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
          {subtext && <p className="text-xs text-gray-400">{subtext}</p>}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}
