'use client';

import { useState, useEffect } from 'react';

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  isPlatformAdmin?: boolean;
}

interface UseCurrentUserResult {
  user: CurrentUser | null;
  isAdmin: boolean;
  loading: boolean;
}

export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        setUser(data.user || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return {
    user,
    isAdmin: user?.isPlatformAdmin || false,
    loading,
  };
}
