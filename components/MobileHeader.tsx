'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Settings, Shield, LogOut, ChevronDown } from 'lucide-react';

interface MobileHeaderProps {
  isAdmin?: boolean;
  userName?: string;
  profilePicture?: string | null;
}

export function MobileHeader({ isAdmin, userName, profilePicture }: MobileHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    <div className="md:hidden absolute top-2 right-4 z-40">
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-1.5 bg-white rounded-full shadow-md border border-gray-100 pr-2 pl-0.5 py-0.5"
        >
          <Avatar src={profilePicture} name={userName || '?'} size="sm" />
          <ChevronDown className={cn('w-3.5 h-3.5 text-gray-500 transition-transform', menuOpen && 'rotate-180')} />
        </button>

        {menuOpen && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 overflow-hidden z-50">
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
    </div>
  );
}
