'use client';

import React from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/client';

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

function parseAdminEmails(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

function normalizeEmail(raw: string | undefined) {
  const v = (raw || '').trim().toLowerCase();
  return v || null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  const adminEmails = React.useMemo(
    () => parseAdminEmails(process.env.NEXT_PUBLIC_ADMIN_EMAILS),
    [],
  );

  const developerEmail = React.useMemo(
    () => normalizeEmail(process.env.NEXT_PUBLIC_DEVELOPER_EMAIL),
    [],
  );

  React.useEffect(() => {
    let unsub: (() => void) | undefined;

    try {
      const auth = getFirebaseAuth();
      unsub = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
      });
    } catch {
      // Firebase not configured – allow the app to run without auth.
      setUser(null);
      setLoading(false);
    }

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const isAuthenticated = Boolean(user);
  const isAdmin = Boolean(
    user?.email &&
      ((developerEmail && user.email.toLowerCase() === developerEmail) ||
        adminEmails.has(user.email.toLowerCase())),
  );

  const signOut = React.useCallback(async () => {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isAdmin, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
