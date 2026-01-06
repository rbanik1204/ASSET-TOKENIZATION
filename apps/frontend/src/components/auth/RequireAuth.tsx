'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth/AuthProvider';

type Props = {
  children: React.ReactNode;
  requireAdmin?: boolean;
};

export function RequireAuth({ children, requireAdmin }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const { loading, isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      const qs = new URLSearchParams();
      const search = typeof window !== 'undefined' ? window.location.search : '';
      qs.set('redirect', pathname + (search || ''));
      router.replace(requireAdmin ? `/admin/signin?${qs.toString()}` : `/signin?${qs.toString()}`);
      return;
    }

    if (requireAdmin && !isAdmin) {
      const qs = new URLSearchParams();
      const search = typeof window !== 'undefined' ? window.location.search : '';
      qs.set('redirect', pathname + (search || ''));
      router.replace(`/admin/signin?${qs.toString()}`);
      return;
    }
  }, [
    loading,
    isAuthenticated,
    isAdmin,
    requireAdmin,
    pathname,
    router,
  ]);

  if (loading) {
    return (
      <div className="p-6 text-sm text-[color:var(--text-muted)]">Loading…</div>
    );
  }

  if (!isAuthenticated) return null;
  if (requireAdmin && !isAdmin) return null;

  return <>{children}</>;
}
