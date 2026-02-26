'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import {
  Shield, Search, Eye, ArrowLeft, Check,
  BarChart3, Users as UsersIcon, LogIn, TrendingUp,
  Mail, Smartphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────

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
}

type Tab = 'view-as' | 'analytics';

// ─── Main Page ───────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('view-as');
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
    if (isLoadMore) {
      setLoadingMore(true);
    }
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (cursor) params.set('cursor', cursor);
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.status === 403) {
        setIsAdmin(false);
        return;
      }
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

  useEffect(() => {
    fetchUsers('');
  }, [fetchUsers]);

  // Debounced search — resets the list
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchUsers]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && nextCursor && !loadingMore) {
      fetchUsers(search, nextCursor);
    }
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
      if (res.ok) {
        window.location.href = '/admin';
      }
    } catch (error) {
      console.error('Stop impersonating error:', error);
    }
  };

  // ─── Analytics logic ───────────────────────────────────────────────

  const fetchAnalytics = useCallback(async (period: string) => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  // Fetch analytics when tab becomes active or period changes
  useEffect(() => {
    if (activeTab === 'analytics' && isAdmin) {
      fetchAnalytics(analyticsPeriod);
    }
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
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─── Tabs ──────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: typeof Eye }[] = [
    { id: 'view-as', label: 'View As', icon: Eye },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900">
              Admin
            </h1>
          </div>
        </div>
      </div>

      {/* Currently impersonating notice */}
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

      {/* Tab Content */}
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
  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0, rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  return (
    <>
      {/* Search */}
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

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Users ({totalCount})
          </CardTitle>
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
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar
                        src={user.profilePicture}
                        name={user.name}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">
                          {user.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate flex items-center gap-1">
                          <span className="truncate">{user.email}</span>
                          <span className="text-gray-300 flex-shrink-0">·</span>
                          <span className="text-gray-400 flex-shrink-0">{user.connectionCount}</span>
                          <span className="text-gray-300 flex-shrink-0">·</span>
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
                          <Check className="w-4 h-4" />
                          Active
                        </span>
                      ) : (
                        <button
                          onClick={() => onImpersonate(user.id)}
                          disabled={!!impersonating}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-full transition-colors disabled:opacity-50"
                        >
                          {isLoading ? (
                            <Spinner size="sm" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                          View as
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Infinite scroll sentinel */}
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

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
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

      {/* Loading overlay for period changes */}
      {loading && (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          icon={<UsersIcon className="w-5 h-5" />}
          label="Registered Users"
          value={analytics.metrics.totalRegisteredUsers}
          color="teal"
        />
        <MetricCard
          icon={<LogIn className="w-5 h-5" />}
          label="Total Logins"
          value={analytics.metrics.totalLogins}
          color="blue"
        />
        <MetricCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Active Users"
          value={analytics.metrics.uniqueUsers}
          color="emerald"
        />
      </div>

      {/* Daily Logins Chart */}
      {analytics.dailyLogins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Logins (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {analytics.dailyLogins.map((day) => {
                const height = Math.max((day.count / maxDaily) * 100, 4);
                const dayLabel = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                });
                return (
                  <div key={day.date} className="flex flex-col items-center flex-1 gap-1">
                    <span className="text-xs font-medium text-gray-700">{day.count}</span>
                    <div
                      className="w-full bg-teal-400 rounded-t-md transition-all"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-xs text-gray-500">{dayLabel}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Login Methods */}
      {Object.keys(analytics.loginsByMethod).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Login Methods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(analytics.loginsByMethod)
              .sort(([, a], [, b]) => b - a)
              .map(([method, count]) => {
                const pct = Math.round((count / totalMethodLogins) * 100);
                return (
                  <div key={method}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {methodLabels[method] || method}
                      </span>
                      <span className="text-sm text-gray-500">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-teal-500 h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}

      {/* Top Users */}
      {analytics.topUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most Active Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {analytics.topUsers.map((user, index) => (
                <div key={user.userId} className="flex items-center gap-3 p-4">
                  <span className="text-sm font-bold text-gray-400 w-6 text-right">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.email || ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-24 bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-teal-500 h-1.5 rounded-full"
                        style={{ width: `${(user.loginCount / maxUserLogins) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-600 w-8 text-right">
                      {user.loginCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────

const colorClasses = {
  teal: 'bg-teal-50 text-teal-600',
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
};

function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: keyof typeof colorClasses;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', colorClasses[color])}>
          {icon}
        </div>
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}
