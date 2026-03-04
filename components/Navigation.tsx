'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Users, Calendar, Mail, Settings, Shield } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/mycircle', label: 'My Circle', icon: Users },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/cards', label: 'Cards', icon: Mail },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const adminItem = { href: '/admin', label: 'Admin', icon: Shield };

interface NavigationProps {
  isAdmin?: boolean;
}

export function Navigation({ isAdmin }: NavigationProps) {
  const pathname = usePathname();
  const allItems = isAdmin ? [...navItems, adminItem] : navItems;

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
            {allItems.map(({ href, label, icon: Icon }) => {
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
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe z-50">
        <ul className="flex justify-around">
          {allItems.map(({ href, label, icon: Icon }) => {
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
        </ul>
      </nav>
    </>
  );
}
