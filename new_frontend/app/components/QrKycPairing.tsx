import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Smartphone, Wifi, WifiOff, CheckCircle, Loader2,
  Camera, Eye, FileText, Shield, RefreshCw, QrCode, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const API_BASE = 'http://localhost:3001/api/v1';
const APP_BASE = typeof window !== 'undefined' ? window.location.origin : '';
const POLL_INTERVAL = 2000;  // 2 seconds

// ── Session status from backend ─────────────────────────────────
type SessionStatus = 'waiting' | 'paired' | 'in_progress' | 'completed' | 'expired';

interface SessionData {
  sessionToken: string;
  walletAddress: string;
  status: SessionStatus;
  mobileProgress: string | null;
  pairedAt: string | null;
  completedAt: string | null;
  expiresAt: string;
  kycStatus: any;
}

// ── Progress step labels ────────────────────────────────────────
const PROGRESS_LABELS: Record<string, { icon: React.ComponentType<any>; label: string }> = {
  camera:     { icon: Camera,   label: 'Camera Active' },
  liveness:   { icon: Eye,      label: 'Liveness Detection' },
  document:   { icon: FileText, label: 'Document Upload' },
  submitting: { icon: Shield,   label: 'Submitting Biometrics' },
};

// ── Props ───────────────────────────────────────────────────────
interface QrKycPairingProps {
  walletAddress: string;
  onCompleted: () => void;    // called when mobile finishes KYC
  onCancel: () => void;       // user cancels QR flow
}

// ═══════════════════════════════════════════════════════════════
// QR KYC Pairing Component
// ═══════════════════════════════════════════════════════════════

const QrKycPairing: React.FC<QrKycPairingProps> = ({ walletAddress, onCompleted, onCancel }) => {
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Create session ──────────────────────────────────────────
  const createSession = useCallback(async () => {
    setIsCreating(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/kyc/session/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });
      const json = await res.json();
      const data = json.data ?? json;
      if (!res.ok) throw new Error(data.message || 'Failed to create session');
      setSession({ ...data, mobileProgress: null, pairedAt: null, completedAt: null, kycStatus: null });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  }, [walletAddress]);

  // Create session on mount
  useEffect(() => {
    createSession();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [createSession]);

  // ── Countdown timer ─────────────────────────────────────────
  useEffect(() => {
    if (!session?.expiresAt) return;
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff <= 0 && session.status !== 'completed') {
        setSession(s => s ? { ...s, status: 'expired' } : null);
      }
    };
    update();
    timerRef.current = setInterval(update, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session?.expiresAt, session?.status]);

  // ── Poll session status ─────────────────────────────────────
  useEffect(() => {
    if (!session?.sessionToken) return;
    if (session.status === 'completed' || session.status === 'expired') return;

    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/kyc/session/${session.sessionToken}`);
        const json = await res.json();
        const data = json.data ?? json;
        setSession(data);

        if (data.status === 'completed') {
          if (pollRef.current) clearInterval(pollRef.current);
          setTimeout(() => onCompleted(), 1500);   // brief pause for animation
        }
      } catch { /* ignore poll errors */ }
    };

    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [session?.sessionToken, session?.status, onCompleted]);

  // ── QR URL ──────────────────────────────────────────────────
  const qrUrl = session
    ? `${APP_BASE}/kyc/mobile?session=${session.sessionToken}&wallet=${walletAddress}`
    : '';

  // ── Timer format ────────────────────────────────────────────
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // ── Status visuals ──────────────────────────────────────────
  const statusConfig: Record<SessionStatus, { icon: React.ComponentType<any>; color: string; label: string; pulse?: boolean }> = {
    waiting:     { icon: QrCode,      color: '#00e08a', label: 'WAITING FOR MOBILE', pulse: true },
    paired:      { icon: Wifi,        color: '#00bfff', label: 'DEVICE CONNECTED',   pulse: true },
    in_progress: { icon: Loader2,     color: '#ffaa32', label: 'BIOMETRIC CAPTURE',  pulse: false },
    completed:   { icon: CheckCircle, color: '#00e08a', label: 'KYC COMPLETE',       pulse: false },
    expired:     { icon: WifiOff,     color: '#ff5555', label: 'SESSION EXPIRED',    pulse: false },
  };

  const currentStatus = session?.status ?? 'waiting';
  const conf = statusConfig[currentStatus];
  const StatusIcon = conf.icon;

  return (
    <div className="border-4 border-foreground p-6 bg-black space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Smartphone className="w-6 h-6 text-accent" />
          <div>
            <h2 className="font-bold uppercase text-lg">MOBILE KYC HANDOFF</h2>
            <p className="text-xs text-muted-foreground">
              Scan the QR code with your phone to complete biometric verification
            </p>
          </div>
        </div>
        <button onClick={onCancel} className="p-2 border border-foreground/30 hover:border-red-400 transition-colors">
          <X className="w-4 h-4 text-muted-foreground hover:text-red-400" />
        </button>
      </div>

      {error && (
        <div className="border-2 border-red-400/40 bg-red-400/5 p-3 text-sm text-red-400 text-center">
          {error}
          <button onClick={createSession} className="block mx-auto mt-2 px-4 py-1 border border-red-400 text-xs font-bold uppercase hover:bg-red-400/10">
            RETRY
          </button>
        </div>
      )}

      {isCreating && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      )}

      {session && !isCreating && (
        <>
          {/* ── Connection status badge ──────────────────────── */}
          <motion.div
            key={currentStatus}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center gap-3 py-3"
          >
            <div className="relative">
              <StatusIcon
                className={`w-6 h-6 ${currentStatus === 'in_progress' ? 'animate-spin' : ''}`}
                style={{ color: conf.color }}
              />
              {conf.pulse && (
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 rounded-full"
                  style={{ border: `2px solid ${conf.color}` }}
                />
              )}
            </div>
            <span className="text-sm font-bold uppercase tracking-wider" style={{ color: conf.color }}>
              {conf.label}
            </span>
            {currentStatus !== 'completed' && currentStatus !== 'expired' && (
              <span className="text-xs text-muted-foreground font-mono ml-2">{timerStr}</span>
            )}
          </motion.div>

          <AnimatePresence mode="wait">
            {/* ── WAITING — Show QR code ──────────────────────── */}
            {currentStatus === 'waiting' && (
              <motion.div
                key="qr"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="flex flex-col items-center space-y-4"
              >
                <div className="relative p-4 bg-white rounded-lg">
                  <QRCodeSVG
                    value={qrUrl}
                    size={220}
                    level="M"
                    includeMargin
                    imageSettings={{
                      src: '',
                      height: 0,
                      width: 0,
                      excavate: false,
                    }}
                  />
                  {/* Pulsing overlay */}
                  <motion.div
                    animate={{ opacity: [0, 0.08, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5 }}
                    className="absolute inset-0 rounded-lg"
                    style={{ background: '#00e08a' }}
                  />
                </div>

                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Open your phone camera and <strong className="text-accent">scan the QR code</strong>
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    The biometric verification will happen on your mobile device
                  </p>
                </div>

                {/* Connection animation — dotted line */}
                <div className="flex items-center gap-3 w-full max-w-xs">
                  <div className="border-2 border-accent/40 p-2 rounded">
                    <QrCode className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 relative h-0.5">
                    <div className="absolute inset-0 border-t-2 border-dashed border-foreground/20" />
                    <motion.div
                      className="absolute top-0 w-3 h-0.5 bg-accent rounded"
                      animate={{ left: ['0%', '100%', '0%'] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    />
                  </div>
                  <div className="border-2 border-foreground/20 p-2 rounded">
                    <Smartphone className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── PAIRED — Device connected ───────────────────── */}
            {currentStatus === 'paired' && (
              <motion.div
                key="paired"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="text-center space-y-4 py-4"
              >
                <div className="flex items-center justify-center gap-6">
                  <div className="border-2 border-accent p-3 rounded bg-accent/5">
                    <QrCode className="w-8 h-8 text-accent" />
                  </div>
                  <motion.div className="flex items-center gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-accent"
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.3 }}
                      />
                    ))}
                  </motion.div>
                  <div className="border-2 border-accent p-3 rounded bg-accent/5">
                    <Smartphone className="w-8 h-8 text-accent" />
                  </div>
                </div>
                <p className="text-sm text-accent font-bold">
                  Mobile device paired successfully!
                </p>
                <p className="text-xs text-muted-foreground">
                  Waiting for biometric capture to begin on your mobile device...
                </p>
                {session.deviceInfo && (
                  <span className="inline-block text-[10px] px-2 py-1 border border-foreground/20 text-muted-foreground font-mono">
                    {session.deviceInfo}
                  </span>
                )}
              </motion.div>
            )}

            {/* ── IN_PROGRESS — Live biometric progress ───────── */}
            {currentStatus === 'in_progress' && (
              <motion.div
                key="progress"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-4 py-4"
              >
                <div className="flex items-center justify-center gap-4">
                  <div className="border-2 border-accent p-3 rounded bg-accent/5">
                    <QrCode className="w-6 h-6 text-accent" />
                  </div>
                  <Wifi className="w-5 h-5 text-accent" />
                  <div className="border-2 border-yellow-400 p-3 rounded bg-yellow-400/5">
                    <Smartphone className="w-6 h-6 text-yellow-400" />
                  </div>
                </div>

                {/* Progress steps */}
                <div className="space-y-2 max-w-xs mx-auto">
                  {Object.entries(PROGRESS_LABELS).map(([key, val]) => {
                    const Icon = val.icon;
                    const isActive = session.mobileProgress === key;
                    const isDone = (() => {
                      const order = ['camera', 'liveness', 'document', 'submitting'];
                      const currentIdx = order.indexOf(session.mobileProgress || '');
                      return order.indexOf(key) < currentIdx;
                    })();
                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-3 px-3 py-2 border transition-colors ${
                          isActive ? 'border-yellow-400/60 bg-yellow-400/5' :
                          isDone   ? 'border-green-400/40 bg-green-400/5' :
                                     'border-foreground/10'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : isActive ? (
                          <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                        ) : (
                          <Icon className="w-4 h-4 text-muted-foreground/40" />
                        )}
                        <span className={`text-sm font-bold uppercase ${
                          isActive ? 'text-yellow-400' :
                          isDone   ? 'text-green-400' :
                                     'text-muted-foreground/40'
                        }`}>
                          {val.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  Keep this page open — it will update automatically when verification completes
                </p>
              </motion.div>
            )}

            {/* ── COMPLETED — Success ─────────────────────────── */}
            {currentStatus === 'completed' && (
              <motion.div
                key="completed"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4 py-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                >
                  <CheckCircle className="w-20 h-20 text-green-400 mx-auto" />
                </motion.div>
                <h3 className="text-xl font-bold uppercase text-green-400">VERIFICATION COMPLETE</h3>
                <p className="text-sm text-muted-foreground">
                  Biometric KYC was submitted from your mobile device.
                  Your verification is now pending admin review.
                </p>
              </motion.div>
            )}

            {/* ── EXPIRED — Timed out ─────────────────────────── */}
            {currentStatus === 'expired' && (
              <motion.div
                key="expired"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-4 py-6"
              >
                <WifiOff className="w-12 h-12 text-red-400 mx-auto" />
                <h3 className="text-lg font-bold uppercase text-red-400">SESSION EXPIRED</h3>
                <p className="text-sm text-muted-foreground">
                  The QR session timed out. Generate a new one to continue.
                </p>
                <button
                  onClick={createSession}
                  className="px-6 py-2 border-2 border-accent text-accent font-bold uppercase text-sm hover:bg-accent/10 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 inline mr-2" />
                  NEW QR CODE
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

export default QrKycPairing;
