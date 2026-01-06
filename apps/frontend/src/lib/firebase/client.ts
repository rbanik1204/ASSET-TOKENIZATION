import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

export type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
};

function decodeBase64(raw: string): string {
  if (typeof atob === 'function') return atob(raw);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return Buffer.from(raw, 'base64').toString('utf-8');
}

function normalizeBase64(raw: string): string {
  // Cookies are often URL-encoded and Firebase may use base64url encoding.
  let value = raw;
  try {
    value = decodeURIComponent(value);
  } catch {
    // ignore
  }
  // base64url -> base64
  value = value.replace(/-/g, '+').replace(/_/g, '/');
  // pad
  const pad = value.length % 4;
  if (pad) value = value + '='.repeat(4 - pad);
  return value;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const parts = document.cookie.split(';').map((p) => p.trim());
  for (const part of parts) {
    if (!part.startsWith(`${name}=`)) continue;
    return part.slice(name.length + 1);
  }
  return null;
}

function tryGetFirebaseClientConfigFromEnv(): FirebaseClientConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !appId) return null;

  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

function tryGetFirebaseClientConfigFromHostingDefaults(): FirebaseClientConfig | null {
  // Firebase Hosting (Frameworks) injects config via the __FIREBASE_DEFAULTS__ cookie.
  // It contains base64-encoded JSON: { config: { apiKey, authDomain, ... }, ... }
  const raw = readCookie('__FIREBASE_DEFAULTS__');
  if (!raw) return null;

  try {
    const decoded = decodeBase64(normalizeBase64(raw));
    const parsed = JSON.parse(decoded) as { config?: Partial<FirebaseClientConfig> };
    const cfg = parsed?.config;
    if (!cfg?.apiKey || !cfg?.authDomain || !cfg?.projectId || !cfg?.appId) return null;
    return {
      apiKey: cfg.apiKey,
      authDomain: cfg.authDomain,
      projectId: cfg.projectId,
      appId: cfg.appId,
      storageBucket: cfg.storageBucket,
      messagingSenderId: cfg.messagingSenderId,
      measurementId: cfg.measurementId,
    };
  } catch {
    return null;
  }
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    tryGetFirebaseClientConfigFromEnv() || tryGetFirebaseClientConfigFromHostingDefaults(),
  );
}

function getFirebaseClientConfig(): FirebaseClientConfig {
  const fromEnv = tryGetFirebaseClientConfigFromEnv();
  if (fromEnv) return fromEnv;

  const fromHosting = tryGetFirebaseClientConfigFromHostingDefaults();
  if (fromHosting) return fromHosting;

  throw new Error(
    'Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, and NEXT_PUBLIC_FIREBASE_APP_ID in apps/frontend/.env.local (or deploy via Firebase Hosting Frameworks to use injected defaults).',
  );
}

export function getFirebaseApp() {
  if (!getApps().length) {
    initializeApp(getFirebaseClientConfig());
  }
  return getApps()[0]!;
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}
