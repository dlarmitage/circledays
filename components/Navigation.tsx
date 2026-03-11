'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Home, Users, Calendar, Mail, Settings, Shield, LogOut } from 'lucide-react';

const mainNavItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/mycircle', label: 'My Circle', icon: Users },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/cards', label: 'Cards', icon: Mail },
];

const desktopOnlyItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
];

const adminItem = { href: '/admin', label: 'Admin', icon: Shield };

interface NavigationProps {
  isAdmin?: boolean;
  userName?: string;
  profilePicture?: string | null;
}

export function Navigation({ isAdmin, userName, profilePicture }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLLIElement>(null);

  const desktopItems = [
    ...mainNavItems,
    ...desktopOnlyItems,
    ...(isAdmin ? [adminItem] : []),
  ];

  const mobileBottomItems = mainNavItems;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-100 p-4">
        <Link href="/dashboard" className="flex items-center gap-2 px-3 py-4 mb-6">
          <img
            src="/icons/touch-icon-96x96.png"
            alt="CircleDays"
            className="w-10 h-10 rounded-xl"
          />
          <span className="font-display text-xl font-bold text-teal-600">CircleDays</span>
        </Link>

        <nav className="flex-1">
          <ul className="space-y-1">
            {desktopItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Desktop Sign Out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe z-50">
        <ul className="flex justify-around">
          {mobileBottomItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  className={cn(
                    'flex flex-col items-center py-3 text-xs font-medium transition-colors',
                    isActive
                      ? 'text-teal-600'
                      : 'text-gray-500'
                  )}
                >
                  <Icon className={cn('w-6 h-6 mb-1', isActive && 'text-teal-600')} />
                  {label}
                </Link>
              </li>
            );
          })}

          {/* Avatar / Account tab */}
          <li className="flex-1" ref={menuRef}>
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={cn(
                  'flex flex-col items-center py-3 text-xs font-medium transition-colors w-full',
                  (pathname.startsWith('/settings') || pathname.startsWith('/admin'))
                    ? 'text-teal-600'
                    : 'text-gray-500'
                )}
              >
                <Avatar
                  src={profilePicture}
                  name={userName || '?'}
                  size="xs"
                  className="mb-1 !w-6 !h-6"
                />
                Me
              </button>

              {menuOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 overflow-hidden">
                  <Link
                    href="/settings"
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors',
                      pathname.startsWith('/settings')
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    <Settings className="w-5 h-5" />
                    Settings
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors',
                        pathname.startsWith('/admin')
                          ? 'bg-teal-50 text-teal-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      <Shield className="w-5 h-5" />
                      Admin
                    </Link>
                  )}
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors w-full"
                  >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </li>
        </ul>
      </nav>
    </>
  );
}
