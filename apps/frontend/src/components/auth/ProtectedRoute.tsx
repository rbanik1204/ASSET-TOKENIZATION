'use client';

import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';
import { getUserRole, getPermissions, type UserRole, type UserPermissions } from '@/lib/rbac';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: keyof UserPermissions;
  requiredRole?: UserRole;
  fallbackUrl?: string;
}

export function ProtectedRoute({
  children,
  requiredPermission,
  requiredRole,
  fallbackUrl = '/',
}: ProtectedRouteProps) {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  
  useEffect(() => {
    if (!isConnected) {
      setIsAuthorized(false);
      return;
    }
    
    const role = getUserRole(address);
    const permissions = getPermissions(role);
    
    // Check role requirement
    if (requiredRole && role !== requiredRole) {
      setIsAuthorized(false);
      return;
    }
    
    // Check permission requirement
    if (requiredPermission && !permissions[requiredPermission]) {
      setIsAuthorized(false);
      return;
    }
    
    setIsAuthorized(true);
  }, [address, isConnected, requiredPermission, requiredRole]);
  
  useEffect(() => {
    if (isAuthorized === false) {
      router.push(fallbackUrl);
    }
  }, [isAuthorized, router, fallbackUrl]);
  
  // Loading state
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Verifying access...</p>
        </div>
      </div>
    );
  }
  
  // Unauthorized state
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Access Denied</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            You don't have permission to access this page.
          </p>
          <button
            onClick={() => router.push(fallbackUrl)}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  // Authorized - render children
  return <>{children}</>;
}
