'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getFirstAccessibleDashboardRoute,
  isAllowedRole,
  readStoredAuth,
} from './authservice/auth';

export default function AdminDashboardIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const { token, role, permissions } = readStoredAuth();

    if (!token || !isAllowedRole(role)) {
      router.replace('/auth/login');
      return;
    }

    const destination = getFirstAccessibleDashboardRoute(role, permissions);
    router.replace(destination || '/auth/login');
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-slate-500">Opening dashboard...</p>
    </div>
  );
}
