import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Shield, Camera, CheckCircle, AlertCircle, User, FileText,
  Eye, Move, Upload, Loader2, XCircle, Fingerprint,
  Smartphone, Wifi, Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import {
  startCamera, stopCamera, runLivenessDetection,
  captureSelfieHash, computeDocumentHash, computeFaceMatchScore,
  type LivenessResult,
} from '../utils/liveness';

const API_BASE = 'http://localhost:3001/api/v1';

// ── Types ───────────────────────────────────────────────────────

type Step = 'pairing' | 'camera' | 'liveness' | 'document' | 'submitting' | 'result' | 'error';
type DocType = 'passport' | 'drivers_license' | 'national_id';

// ═══════════════════════════════════════════════════════════════
// MOBILE KYC PAGE — Opened via QR scan from desktop
// ═══════════════════════════════════════════════════════════════

const MobileKYCPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionToken = searchParams.get('session') || '';
  const walletAddress = searchParams.get('wallet') || '';

  const [step, setStep] = useState<Step>('pairing');
  const [paired, setPaired] = useState(false);
  const [pairError, setPairError] = useState('');

  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Liveness state
  const [livenessMsg, setLivenessMsg] = useState('');
  const [challengeIdx, setChallengeIdx] = useState(-1);
  const [livenessResult, setLivenessResult] = useState<LivenessResult | null>(null);

  // Selfie state
  const [selfieHash, setSelfieHash] = useState('');
  const [selfieThumbnail, setSelfieThumbnail] = useState('');

  // Document state
  const [docType, setDocType] = useState<DocType>('passport');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docHash, setDocHash] = useState('');
  const [faceMatchScore, setFaceMatchScore] = useState<number | null>(null);

  // Personal info
  const [form, setForm] = useState({
    firstName: '', lastName: '', dateOfBirth: '', nationality: '',
    documentNumber: '',
  });

  // Result
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [submitError, setSubmitError] = useState('');

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  // ── Helper: report progress to desktop ──────────────────────
  const reportProgress = useCallback(async (progress: string) => {
    if (!sessionToken) return;
    try {
      await fetch(`${API_BASE}/kyc/session/${sessionToken}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress }),
      });
    } catch { /* best-effort */ }
  }, [sessionToken]);

  // ── Pair with desktop session on mount ──────────────────────
  useEffect(() => {
    if (!sessionToken || !walletAddress) {
      setPairError('Invalid QR link — missing session or wallet parameters');
      setStep('error');
      return;
    }

    const pair = async () => {
      try {
        const ua = navigator.userAgent;
        const res = await fetch(`${API_BASE}/kyc/session/${sessionToken}/pair`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceInfo: ua.slice(0, 200) }),
        });
        const json = await res.json();
        const data = json.data ?? json;
        if (!res.ok) throw new Error(data.message || 'Pairing failed');

        setPaired(true);
        // Auto-start camera after brief delay
        setTimeout(() => startLivenessFlow(), 1200);
      } catch (err: any) {
        setPairError(err.message);
        setStep('error');
      }
    };

    pair();

    return () => {
      stopCamera(streamRef.current);
      abortRef.current?.abort();
    };
  }, [sessionToken, walletAddress]);

  // ── Start camera + liveness flow ───────────────────────────
  const startLivenessFlow = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setStep('camera');
    setLivenessMsg('Starting camera...');
    await reportProgress('camera');

    try {
      // Use environment (rear) camera on mobile if available, fallback to user
      streamRef.current = await startCamera(videoRef.current, 'user');
      setLivenessMsg('Camera ready — position your face');

      await new Promise(r => setTimeout(r, 2000));

      setStep('liveness');
      await reportProgress('liveness');

      abortRef.current = new AbortController();
      const result = await runLivenessDetection(
        videoRef.current,
        canvasRef.current,
        (msg, idx) => {
          setLivenessMsg(msg);
          setChallengeIdx(idx);
        },
        abortRef.current.signal,
      );

      setLivenessResult(result);

      // Capture selfie hash
      const selfie = await captureSelfieHash(videoRef.current, canvasRef.current);
      setSelfieHash(selfie.hash);
      setSelfieThumbnail(selfie.thumbnail);

      // Stop camera
      stopCamera(streamRef.current);
      streamRef.current = null;

      toast.success(`Liveness: ${(result.score * 100).toFixed(0)}%`);
      setStep('document');
      await reportProgress('document');
    } catch (err: any) {
      toast.error(err.message || 'Camera access failed');
      stopCamera(streamRef.current);
      streamRef.current = null;
      setPairError(err.message);
      setStep('error');
    }
  }, [reportProgress]);

  // ── Handle document upload ─────────────────────────────────
  const handleDocUpload = useCallback(async (file: File) => {
    setDocFile(file);
    const hash = await computeDocumentHash(file);
    setDocHash(hash);
    if (selfieHash) {
      const score = computeFaceMatchScore(selfieHash, hash);
      setFaceMatchScore(score);
    }
  }, [selfieHash]);

  // ── Submit KYC ─────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!walletAddress || !livenessResult || !selfieHash) {
      toast.error('Missing required data');
      return;
    }

    setStep('submitting');
    setSubmitError('');
    await reportProgress('submitting');

    try {
      const res = await fetch(`${API_BASE}/kyc/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          nationality: form.nationality || undefined,
          documentType: docFile ? docType : undefined,
          documentNumber: form.documentNumber || undefined,
          selfieBiometricHash: selfieHash,
          documentPhotoHash: docHash || undefined,
          liveness: {
            score: livenessResult.score,
            challengesPassed: livenessResult.challengesPassed,
            frameCount: livenessResult.frameCount,
          },
          faceMatchScore: faceMatchScore ?? undefined,
        }),
      });

      const json = await res.json();
      const result = json.data ?? json;
      if (!res.ok) throw new Error(result.message || 'KYC submission failed');

      // Mark session as completed
      if (sessionToken) {
        try {
          await fetch(`${API_BASE}/kyc/session/${sessionToken}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
        } catch { /* best-effort */ }
      }

      setSubmitResult(result);
      setStep('result');
      toast.success('KYC submitted!');
    } catch (err: any) {
      setSubmitError(err.message);
      toast.error(err.message);
    }
  }, [walletAddress, livenessResult, selfieHash, docHash, faceMatchScore, form, docType, docFile, sessionToken, reportProgress]);

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-black text-foreground">
      <div className="container mx-auto px-4 py-6 max-w-lg">
        {/* ── Mobile Header ───────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-accent" />
            <Fingerprint className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-lg font-bold uppercase">MOBILE eKYC</h1>
            <p className="text-[10px] text-muted-foreground font-mono">
              {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}` : 'No wallet'}
            </p>
          </div>
          {paired && (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-accent font-bold">
              <Wifi className="w-3 h-3" /> LINKED
            </span>
          )}
        </div>

        {/* ── Hidden video + canvas ────────────────────────────── */}
        <video
          ref={videoRef}
          className={`w-full max-h-[320px] object-cover border-4 border-foreground bg-black rounded ${
            step === 'camera' || step === 'liveness' ? 'block' : 'hidden'
          }`}
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="hidden" />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
          >
            {/* ═══════════════════════════════════════════════════ */}
            {/* PAIRING — connecting to desktop                    */}
            {/* ═══════════════════════════════════════════════════ */}
            {step === 'pairing' && (
              <div className="border-4 border-accent p-6 bg-black text-center space-y-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                >
                  <Wifi className="w-12 h-12 text-accent mx-auto" />
                </motion.div>
                <h2 className="text-xl font-bold uppercase text-accent">CONNECTING...</h2>
                <p className="text-sm text-muted-foreground">
                  Pairing with your desktop session
                </p>
                <div className="flex justify-center gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-accent"
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.3 }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════ */}
            {/* CAMERA INIT                                        */}
            {/* ═══════════════════════════════════════════════════ */}
            {step === 'camera' && (
              <div className="border-4 border-foreground p-4 bg-black text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-accent" />
                  <span className="text-sm font-bold uppercase text-accent">{livenessMsg}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Good lighting • Face the camera • No sunglasses
                </p>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════ */}
            {/* LIVENESS DETECTION                                 */}
            {/* ═══════════════════════════════════════════════════ */}
            {step === 'liveness' && (
              <div className="border-4 border-accent p-4 bg-black">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-5 h-5 text-accent" />
                  <span className="font-bold uppercase text-sm">LIVENESS CHECK</span>
                </div>
                <div className="space-y-2 mb-3">
                  {['Blink your eyes', 'Turn head left', 'Turn head right'].map((label, i) => {
                    const isPassed = challengeIdx > i || (challengeIdx === i && livenessMsg.startsWith('✓'));
                    const isActive = challengeIdx === i && !livenessMsg.startsWith('✓');
                    return (
                      <div key={label} className={`flex items-center gap-3 px-3 py-2 border ${
                        isPassed ? 'border-green-400/40 bg-green-400/5' :
                        isActive ? 'border-accent bg-accent/5' :
                        'border-foreground/20'
                      }`}>
                        {isPassed ? <CheckCircle className="w-4 h-4 text-green-400" /> :
                         isActive ? <Loader2 className="w-4 h-4 text-accent animate-spin" /> :
                         <div className="w-4 h-4 border border-foreground/30 rounded-full" />}
                        <span className={`text-sm font-bold ${
                          isPassed ? 'text-green-400' : isActive ? 'text-accent' : 'text-muted-foreground'
                        }`}>{label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-center">
                  <Move className="w-5 h-5 mx-auto text-accent mb-1" />
                  <p className="text-sm text-accent font-bold">{livenessMsg}</p>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════ */}
            {/* DOCUMENT + PERSONAL INFO                           */}
            {/* ═══════════════════════════════════════════════════ */}
            {step === 'document' && (
              <div className="border-4 border-foreground p-5 bg-black space-y-5">
                {/* Liveness result */}
                {livenessResult && (
                  <div className="border-2 border-green-400/40 bg-green-400/5 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="font-bold uppercase text-xs text-green-400">LIVENESS OK</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="border border-foreground/20 p-1">
                        <div className="text-muted-foreground">SCORE</div>
                        <div className="font-bold text-accent">{(livenessResult.score * 100).toFixed(0)}%</div>
                      </div>
                      <div className="border border-foreground/20 p-1">
                        <div className="text-muted-foreground">PASS</div>
                        <div className="font-bold text-accent">{livenessResult.challengesPassed.length}/3</div>
                      </div>
                      <div className="border border-foreground/20 p-1">
                        <div className="text-muted-foreground">FRAMES</div>
                        <div className="font-bold text-accent">{livenessResult.frameCount}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Selfie preview */}
                {selfieThumbnail && (
                  <div className="flex items-center gap-3 border-2 border-foreground p-2">
                    <img src={selfieThumbnail} alt="Selfie" className="w-12 h-10 object-cover border border-foreground" />
                    <div>
                      <div className="text-[10px] font-bold text-accent uppercase">SELFIE CAPTURED</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {selfieHash.slice(0, 16)}...
                      </div>
                    </div>
                  </div>
                )}

                {/* Personal info */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-accent" />
                    <span className="text-xs font-bold uppercase">
                      INFO <span className="text-muted-foreground">(OPT)</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'firstName', label: 'First Name' },
                      { name: 'lastName', label: 'Last Name' },
                      { name: 'dateOfBirth', label: 'DOB', type: 'date' },
                      { name: 'nationality', label: 'Nationality' },
                    ].map(f => (
                      <div key={f.name}>
                        <label className="block text-[10px] text-muted-foreground uppercase mb-0.5">{f.label}</label>
                        <input
                          type={f.type || 'text'}
                          name={f.name}
                          value={(form as any)[f.name]}
                          onChange={handleFormChange}
                          className="w-full px-2 py-1.5 bg-background border-2 border-foreground focus:border-accent outline-none text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Document upload */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-accent" />
                    <span className="text-xs font-bold uppercase">
                      GOV ID <span className="text-muted-foreground">(OPT)</span>
                    </span>
                  </div>
                  <select
                    value={docType}
                    onChange={e => setDocType(e.target.value as DocType)}
                    className="w-full px-2 py-1.5 bg-background border-2 border-foreground focus:border-accent outline-none text-sm mb-2"
                  >
                    <option value="passport">Passport</option>
                    <option value="drivers_license">Driver&apos;s License</option>
                    <option value="national_id">National ID / Aadhaar</option>
                  </select>

                  <label className="cursor-pointer block border-2 border-dashed border-foreground hover:border-accent transition-colors p-4 text-center">
                    <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    {docFile ? (
                      <span className="text-accent text-xs font-bold">{docFile.name}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Tap to upload photo</span>
                    )}
                    <input type="file" accept="image/*" capture="environment" className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) handleDocUpload(f);
                      }}
                    />
                  </label>

                  {faceMatchScore !== null && (
                    <div className={`mt-2 flex items-center gap-2 text-xs font-bold ${
                      faceMatchScore >= 0.80 ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      <Fingerprint className="w-3 h-3" />
                      Match: {(faceMatchScore * 100).toFixed(0)}%
                    </div>
                  )}
                </div>

                {/* Submit */}
                <div className="flex gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={!selfieHash || !livenessResult || livenessResult.score < 0.6}
                    className="flex-1 py-3 bg-accent text-black font-bold uppercase text-sm hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    SUBMIT
                  </button>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════ */}
            {/* SUBMITTING                                         */}
            {/* ═══════════════════════════════════════════════════ */}
            {step === 'submitting' && (
              <div className="border-4 border-accent p-8 bg-black text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-accent mx-auto" />
                <h2 className="text-lg font-bold uppercase">SUBMITTING</h2>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Encrypting biometric hashes...</p>
                  <p>Pinning to IPFS...</p>
                  <p>Recording submission...</p>
                </div>
                {submitError && (
                  <div className="border-2 border-red-400/40 bg-red-400/5 p-3 text-xs text-red-400">
                    {submitError}
                    <button onClick={handleSubmit}
                      className="block mx-auto mt-2 px-4 py-1 border border-red-400 font-bold uppercase text-[10px] hover:bg-red-400/10">
                      RETRY
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════ */}
            {/* RESULT — SUCCESS                                   */}
            {/* ═══════════════════════════════════════════════════ */}
            {step === 'result' && submitResult && (
              <div className="border-4 border-green-400 p-6 bg-black space-y-4">
                <div className="text-center space-y-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
                  </motion.div>
                  <h2 className="text-xl font-bold uppercase text-green-400">SUBMITTED!</h2>
                  <p className="text-xs text-muted-foreground">
                    Your biometric KYC is pending review. You can now close this tab.
                  </p>
                </div>

                <div className="border-2 border-foreground p-3 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID</span>
                    <span className="font-bold font-mono">{submitResult.submissionId?.slice(0, 12)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">STATUS</span>
                    <span className="font-bold text-yellow-400">PENDING</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">LIVENESS</span>
                    <span className="font-bold text-green-400">{(submitResult.livenessScore * 100).toFixed(0)}%</span>
                  </div>
                  {submitResult.ipfsCid && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IPFS</span>
                      <span className="font-bold font-mono text-[10px]">{submitResult.ipfsCid.slice(0, 16)}...</span>
                    </div>
                  )}
                </div>

                <div className="border-2 border-accent/30 bg-accent/5 p-3 text-center">
                  <Lock className="w-4 h-4 text-accent mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground">
                    Your desktop will auto-update. You can safely close this page.
                  </p>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════ */}
            {/* ERROR STATE                                        */}
            {/* ═══════════════════════════════════════════════════ */}
            {step === 'error' && (
              <div className="border-4 border-red-400 p-6 bg-black text-center space-y-4">
                <XCircle className="w-12 h-12 text-red-400 mx-auto" />
                <h2 className="text-lg font-bold uppercase text-red-400">CONNECTION FAILED</h2>
                <p className="text-sm text-muted-foreground">
                  {pairError || 'Could not connect to desktop session'}
                </p>
                <p className="text-xs text-muted-foreground/60">
                  Please go back to your desktop and generate a new QR code
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MobileKYCPage;
