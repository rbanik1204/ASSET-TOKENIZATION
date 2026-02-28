import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Shield, Camera, CheckCircle, AlertCircle, User, FileText,
  RefreshCw, Eye, Move, Upload, Loader2, XCircle, Fingerprint,
  Globe, Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAlgorand } from '../contexts/AlgorandContext';
import { useKyc } from '../contexts/KycContext';
import { toast } from 'sonner';
import {
  startCamera, stopCamera, runLivenessDetection,
  captureSelfieHash, computeDocumentHash, computeFaceMatchScore,
  type LivenessResult,
} from '../utils/liveness';

// ── Types ───────────────────────────────────────────────────────

type Step = 'status' | 'camera' | 'liveness' | 'document' | 'submitting' | 'result';

type DocType = 'passport' | 'drivers_license' | 'national_id';

const STATUS_CONFIG = {
  not_started: { color: 'text-muted-foreground', bg: 'border-foreground/20', label: 'NOT STARTED', icon: Shield },
  pending:     { color: 'text-yellow-400',       bg: 'border-yellow-400/40', label: 'PENDING REVIEW', icon: RefreshCw },
  approved:    { color: 'text-green-400',        bg: 'border-green-400/40',  label: 'APPROVED', icon: CheckCircle },
  rejected:    { color: 'text-red-400',          bg: 'border-red-400/40',    label: 'REJECTED', icon: XCircle },
  revoked:     { color: 'text-red-400',          bg: 'border-red-400/40',    label: 'REVOKED', icon: XCircle },
};

const FLOW_STEPS = [
  { num: 1, label: 'Status' },
  { num: 2, label: 'Live Camera' },
  { num: 3, label: 'Liveness' },
  { num: 4, label: 'Documents' },
  { num: 5, label: 'Submit' },
];

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

const KYCPage: React.FC = () => {
  const { address } = useAlgorand();
  const { kycStatus, isLoading, isVerified, submitKyc, refreshStatus } = useKyc();

  const [step, setStep] = useState<Step>('status');

  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Liveness state
  const [livenessMsg, setLivenessMsg] = useState('Initializing camera...');
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

  // ── Cleanup camera on unmount ──────────────────────────────
  useEffect(() => {
    return () => {
      stopCamera(streamRef.current);
      abortRef.current?.abort();
    };
  }, []);

  // ── Start camera + liveness flow ──────────────────────────
  const startLivenessFlow = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setStep('camera');
    setLivenessMsg('Starting camera...');

    try {
      streamRef.current = await startCamera(videoRef.current);
      setLivenessMsg('Camera ready — position your face in the center');

      // Wait 2 seconds for user to position
      await new Promise(r => setTimeout(r, 2000));

      setStep('liveness');

      // Run liveness detection
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

      toast.success(`Liveness score: ${(result.score * 100).toFixed(0)}%`);
      setStep('document');
    } catch (err: any) {
      toast.error(err.message || 'Camera access failed');
      stopCamera(streamRef.current);
      streamRef.current = null;
      setStep('status');
    }
  }, []);

  // ── Handle document upload ─────────────────────────────────
  const handleDocUpload = useCallback(async (file: File) => {
    setDocFile(file);
    const hash = await computeDocumentHash(file);
    setDocHash(hash);

    // Compute face match score
    if (selfieHash) {
      const score = computeFaceMatchScore(selfieHash, hash);
      setFaceMatchScore(score);
    }
  }, [selfieHash]);

  // ── Submit KYC ─────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!address || !livenessResult || !selfieHash) {
      toast.error('Missing required data');
      return;
    }

    setStep('submitting');
    setSubmitError('');

    try {
      const result = await submitKyc({
        walletAddress: address,
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
      });

      setSubmitResult(result);
      setStep('result');
      toast.success('KYC submitted successfully!');
    } catch (err: any) {
      setSubmitError(err.message);
      toast.error(err.message);
    }
  }, [address, livenessResult, selfieHash, docHash, faceMatchScore, form, docType, docFile, submitKyc]);

  // ── Active step for stepper ────────────────────────────────
  const activeStep =
    step === 'status' ? 1 :
    step === 'camera' ? 2 :
    step === 'liveness' ? 3 :
    step === 'document' ? 4 :
    5;

  // ── Current status letter ──────────────────────────────────
  const statusKey = (kycStatus?.status || 'not_started') as keyof typeof STATUS_CONFIG;
  const statusConf = STATUS_CONFIG[statusKey];

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Fingerprint className="w-8 h-8 text-accent" />
        <div>
          <h1 className="text-3xl font-bold uppercase">BIOMETRIC KYC</h1>
          <p className="text-muted-foreground text-sm">
            Live photo verification — under 60 seconds
          </p>
        </div>
        {kycStatus && kycStatus.status !== 'not_started' && (
          <span className={`ml-auto font-bold uppercase text-sm px-3 py-1 border ${statusConf.bg} ${statusConf.color}`}>
            {statusConf.label}
          </span>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {FLOW_STEPS.map((s, i) => (
          <React.Fragment key={s.num}>
            <div
              className={`w-8 h-8 border-2 flex items-center justify-center font-bold text-sm
                ${activeStep >= s.num ? 'border-accent text-accent bg-accent/10' : 'border-foreground/30 text-muted-foreground'}`}
            >
              {activeStep > s.num ? '\u2713' : s.num}
            </div>
            {i < FLOW_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 ${activeStep > s.num ? 'bg-accent' : 'bg-foreground/20'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── Hidden video + canvas ──────────────────────────────── */}
      <video
        ref={videoRef}
        className={`w-full max-h-[360px] object-cover border-4 border-foreground bg-black ${
          step === 'camera' || step === 'liveness' ? 'block' : 'hidden'
        }`}
        muted
        playsInline
      />
      <canvas ref={canvasRef} className="hidden" />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* ═══════════════════════════════════════════════════════ */}
          {/* STEP: STATUS / START                                   */}
          {/* ═══════════════════════════════════════════════════════ */}
          {step === 'status' && (
            <div className="border-4 border-foreground p-6 bg-black space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                </div>
              ) : isVerified ? (
                /* ── Already verified ──────────────────────────── */
                <div className="text-center py-8 space-y-4">
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
                  <h2 className="text-2xl font-bold uppercase text-green-400">VERIFIED</h2>
                  <p className="text-muted-foreground">
                    Your identity has been verified. You can tokenize assets and trade.
                  </p>
                  <div className="border-2 border-foreground p-4 text-left text-sm space-y-2">
                    <Detail label="WALLET" value={address?.slice(0, 12) + '...' + address?.slice(-6)} />
                    <Detail label="STATUS" value="APPROVED" className="text-green-400" />
                    <Detail label="VERIFIED ON" value={kycStatus?.reviewedAt ? new Date(kycStatus.reviewedAt).toLocaleDateString() : '\u2014'} />
                    <Detail label="LIVENESS SCORE" value={kycStatus?.livenessScore ? `${(Number(kycStatus.livenessScore) * 100).toFixed(0)}%` : '\u2014'} />
                    {kycStatus?.ipfsAuditCid && (
                      <Detail label="IPFS AUDIT" value={kycStatus.ipfsAuditCid.slice(0, 16) + '...'} />
                    )}
                    {kycStatus?.onchainVerified && (
                      <Detail label="ON-CHAIN" value="\u2713 Verified" className="text-green-400" />
                    )}
                  </div>
                </div>
              ) : kycStatus?.status === 'pending' ? (
                /* ── Pending review ───────────────────────────── */
                <div className="text-center py-8 space-y-4">
                  <RefreshCw className="w-16 h-16 text-yellow-400 mx-auto" />
                  <h2 className="text-2xl font-bold uppercase text-yellow-400">PENDING REVIEW</h2>
                  <p className="text-muted-foreground">
                    Your biometric verification is being reviewed by our compliance team.
                    This typically takes a few minutes.
                  </p>
                  <div className="border-2 border-foreground p-4 text-left text-sm space-y-2">
                    <Detail label="SUBMITTED" value={kycStatus.submittedAt ? new Date(kycStatus.submittedAt).toLocaleDateString() : '\u2014'} />
                    <Detail label="LIVENESS" value={kycStatus.livenessScore ? `${(Number(kycStatus.livenessScore) * 100).toFixed(0)}%` : '\u2014'} />
                    {kycStatus.ipfsAuditCid && (
                      <Detail label="AUDIT CID" value={kycStatus.ipfsAuditCid.slice(0, 20) + '...'} />
                    )}
                  </div>
                  <button
                    onClick={refreshStatus}
                    className="px-6 py-2 border-2 border-accent text-accent font-bold uppercase text-sm hover:bg-accent/10 transition-colors"
                  >
                    REFRESH STATUS
                  </button>
                </div>
              ) : kycStatus?.status === 'rejected' ? (
                /* ── Rejected — allow retry ───────────────────── */
                <div className="text-center py-8 space-y-4">
                  <XCircle className="w-16 h-16 text-red-400 mx-auto" />
                  <h2 className="text-2xl font-bold uppercase text-red-400">REJECTED</h2>
                  <p className="text-muted-foreground">
                    {kycStatus.rejectionReason || 'Your verification was not approved. You may try again.'}
                  </p>
                  <button
                    onClick={startLivenessFlow}
                    disabled={!address}
                    className="px-8 py-3 bg-accent text-black font-bold uppercase hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    RETRY VERIFICATION \u2192
                  </button>
                </div>
              ) : (
                /* ── Not started ──────────────────────────────── */
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-accent" />
                    <h2 className="font-bold uppercase">IDENTITY VERIFICATION</h2>
                  </div>

                  <p className="text-muted-foreground text-sm mb-4">
                    Complete a quick biometric verification to start tokenizing and trading.
                    No documents required — just your camera and 60 seconds.
                  </p>

                  {/* Features grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                    {[
                      { icon: Camera, title: 'LIVE CAMERA', desc: 'Real-time selfie capture' },
                      { icon: Eye, title: 'LIVENESS CHECK', desc: 'Blink & head movement' },
                      { icon: Lock, title: 'PRIVACY FIRST', desc: 'Only hashes stored \u2014 no raw images' },
                    ].map(f => (
                      <div key={f.title} className="border-2 border-foreground/30 p-4">
                        <f.icon className="w-5 h-5 text-accent mb-2" />
                        <div className="text-xs font-bold uppercase">{f.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">{f.desc}</div>
                      </div>
                    ))}
                  </div>

                  <div className="border-2 border-yellow-400/40 bg-yellow-400/5 p-4 text-xs text-yellow-400 mb-4">
                    <strong>PRIVACY NOTICE:</strong> We never store raw photos or biometric data.
                    Only cryptographic hashes are transmitted and saved. Your verification is
                    recorded on IPFS for an immutable audit trail.
                  </div>

                  {!address ? (
                    <div className="border-2 border-red-400/40 bg-red-400/5 p-4 text-sm text-red-400 text-center">
                      <AlertCircle className="w-5 h-5 mx-auto mb-2" />
                      Connect your wallet to begin verification
                    </div>
                  ) : (
                    <button
                      onClick={startLivenessFlow}
                      className="w-full py-4 bg-accent text-black font-bold uppercase text-lg hover:bg-accent/80 transition-colors flex items-center justify-center gap-3"
                    >
                      <Camera className="w-6 h-6" />
                      START VERIFICATION
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* STEP: CAMERA INITIALIZING                              */}
          {/* ═══════════════════════════════════════════════════════ */}
          {step === 'camera' && (
            <div className="border-4 border-foreground p-4 bg-black text-center">
              <div className="flex items-center justify-center gap-2 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-accent" />
                <span className="text-sm font-bold uppercase text-accent">{livenessMsg}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ensure good lighting \u2022 Face the camera directly \u2022 Remove sunglasses
              </p>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* STEP: LIVENESS DETECTION IN PROGRESS                   */}
          {/* ═══════════════════════════════════════════════════════ */}
          {step === 'liveness' && (
            <div className="border-4 border-accent p-4 bg-black">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-5 h-5 text-accent" />
                <span className="font-bold uppercase text-sm">LIVENESS DETECTION</span>
              </div>

              {/* Challenge indicators */}
              <div className="space-y-2 mb-4">
                {['Blink your eyes', 'Turn your head left', 'Turn your head right'].map((label, i) => {
                  const isPassed = challengeIdx > i || (challengeIdx === i && livenessMsg.startsWith('\u2713'));
                  const isActive = challengeIdx === i && !livenessMsg.startsWith('\u2713');
                  return (
                    <div key={label} className={`flex items-center gap-3 px-3 py-2 border ${
                      isPassed ? 'border-green-400/40 bg-green-400/5' :
                      isActive ? 'border-accent bg-accent/5' :
                      'border-foreground/20'
                    }`}>
                      {isPassed ? <CheckCircle className="w-4 h-4 text-green-400" /> :
                       isActive ? <Loader2 className="w-4 h-4 text-accent animate-spin" /> :
                       <div className="w-4 h-4 border border-foreground/30 rounded-full" />}
                      <span className={`text-sm font-bold uppercase ${
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

          {/* ═══════════════════════════════════════════════════════ */}
          {/* STEP: DOCUMENT UPLOAD + PERSONAL INFO                  */}
          {/* ═══════════════════════════════════════════════════════ */}
          {step === 'document' && (
            <div className="border-4 border-foreground p-6 bg-black space-y-6">
              {/* Liveness result summary */}
              {livenessResult && (
                <div className="border-2 border-green-400/40 bg-green-400/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="font-bold uppercase text-sm text-green-400">LIVENESS VERIFIED</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <StatBox label="SCORE" value={`${(livenessResult.score * 100).toFixed(0)}%`} />
                    <StatBox label="CHALLENGES" value={`${livenessResult.challengesPassed.length}/3`} />
                    <StatBox label="FRAMES" value={`${livenessResult.frameCount}`} />
                  </div>
                </div>
              )}

              {/* Selfie preview */}
              {selfieThumbnail && (
                <div className="flex items-center gap-4 border-2 border-foreground p-3">
                  <img src={selfieThumbnail} alt="Selfie" className="w-16 h-12 object-cover border border-foreground" />
                  <div>
                    <div className="text-xs font-bold uppercase text-accent">SELFIE CAPTURED</div>
                    <div className="text-xs text-muted-foreground font-mono mt-1">
                      Hash: {selfieHash.slice(0, 16)}...
                    </div>
                  </div>
                </div>
              )}

              {/* Personal info (optional) */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-accent" />
                  <span className="text-xs font-bold uppercase">
                    PERSONAL INFO <span className="text-muted-foreground">(OPTIONAL)</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: 'firstName', label: 'FIRST NAME' },
                    { name: 'lastName', label: 'LAST NAME' },
                    { name: 'dateOfBirth', label: 'DOB', type: 'date' },
                    { name: 'nationality', label: 'NATIONALITY' },
                  ].map(f => (
                    <div key={f.name}>
                      <label className="block text-xs text-muted-foreground uppercase mb-1">{f.label}</label>
                      <input
                        type={f.type || 'text'}
                        name={f.name}
                        value={(form as any)[f.name]}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 bg-background border-2 border-foreground focus:border-accent outline-none text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Document upload (optional) */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-accent" />
                  <span className="text-xs font-bold uppercase">
                    GOVERNMENT ID <span className="text-muted-foreground">(OPTIONAL)</span>
                  </span>
                </div>

                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value as DocType)}
                  className="w-full px-3 py-2 bg-background border-2 border-foreground focus:border-accent outline-none text-sm mb-3"
                >
                  <option value="passport">Passport</option>
                  <option value="drivers_license">Driver&apos;s License</option>
                  <option value="national_id">National ID / Aadhaar</option>
                </select>

                <label className="cursor-pointer block border-2 border-dashed border-foreground hover:border-accent transition-colors p-6 text-center">
                  <Upload className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                  {docFile ? (
                    <span className="text-accent text-sm font-bold">{docFile.name}</span>
                  ) : (
                    <span className="text-muted-foreground text-sm">Click to upload document photo</span>
                  )}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleDocUpload(f);
                    }}
                  />
                </label>

                {docHash && (
                  <div className="mt-2 text-xs text-muted-foreground font-mono">
                    Doc hash: {docHash.slice(0, 20)}...
                  </div>
                )}

                {faceMatchScore !== null && (
                  <div className={`mt-2 flex items-center gap-2 text-sm font-bold ${
                    faceMatchScore >= 0.80 ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    <Fingerprint className="w-4 h-4" />
                    Face match: {(faceMatchScore * 100).toFixed(0)}%
                    {faceMatchScore >= 0.80 ? ' \u2713' : ' \u2014 manual review needed'}
                  </div>
                )}

                {docFile && (
                  <div className="mt-2">
                    <label className="block text-xs text-muted-foreground uppercase mb-1">DOCUMENT NUMBER</label>
                    <input
                      type="text"
                      name="documentNumber"
                      value={form.documentNumber}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 bg-background border-2 border-foreground focus:border-accent outline-none text-sm"
                      placeholder="Optional"
                    />
                  </div>
                )}
              </div>

              {/* Submit buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep('status');
                    setLivenessResult(null);
                    setSelfieHash('');
                    setSelfieThumbnail('');
                    setDocFile(null);
                    setDocHash('');
                    setFaceMatchScore(null);
                  }}
                  className="flex-1 py-3 border-2 border-foreground font-bold uppercase text-sm hover:border-accent transition-colors"
                >
                  \u2190 CANCEL
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!selfieHash || !livenessResult || livenessResult.score < 0.6}
                  className="flex-1 py-3 bg-accent text-black font-bold uppercase text-sm hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  SUBMIT VERIFICATION
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* STEP: SUBMITTING                                       */}
          {/* ═══════════════════════════════════════════════════════ */}
          {step === 'submitting' && (
            <div className="border-4 border-accent p-8 bg-black text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-accent mx-auto" />
              <h2 className="text-xl font-bold uppercase">SUBMITTING VERIFICATION</h2>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Encrypting biometric hashes...</p>
                <p>Pinning audit proof to IPFS...</p>
                <p>Recording submission...</p>
              </div>
              {submitError && (
                <div className="border-2 border-red-400/40 bg-red-400/5 p-4 text-sm text-red-400">
                  <AlertCircle className="w-5 h-5 mx-auto mb-2" />
                  {submitError}
                  <button
                    onClick={handleSubmit}
                    className="block mx-auto mt-3 px-4 py-2 border border-red-400 text-red-400 hover:bg-red-400/10 font-bold uppercase text-xs"
                  >
                    RETRY
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* STEP: RESULT                                           */}
          {/* ═══════════════════════════════════════════════════════ */}
          {step === 'result' && submitResult && (
            <div className="border-4 border-green-400 p-6 bg-black space-y-5">
              <div className="text-center space-y-3">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
                <h2 className="text-2xl font-bold uppercase text-green-400">VERIFICATION SUBMITTED</h2>
                <p className="text-muted-foreground text-sm">
                  Your biometric verification has been recorded and is pending admin review.
                </p>
              </div>

              <div className="border-2 border-foreground p-4 text-sm space-y-2">
                <Detail label="SUBMISSION ID" value={submitResult.submissionId?.slice(0, 12) + '...'} />
                <Detail label="STATUS" value="PENDING REVIEW" className="text-yellow-400" />
                <Detail label="LIVENESS SCORE" value={`${(submitResult.livenessScore * 100).toFixed(0)}%`} className="text-green-400" />
                {submitResult.faceMatchScore && (
                  <Detail label="FACE MATCH" value={`${(submitResult.faceMatchScore * 100).toFixed(0)}%`} />
                )}
                {submitResult.ipfsCid && (
                  <Detail label="IPFS AUDIT CID" value={submitResult.ipfsCid} mono />
                )}
              </div>

              <div className="border-2 border-accent/30 bg-accent/5 p-4 text-xs">
                <div className="flex items-center gap-2 text-accent font-bold mb-2">
                  <Globe className="w-4 h-4" />
                  AUDIT TRAIL
                </div>
                <p className="text-muted-foreground">
                  Your verification proof has been pinned to IPFS. This creates an immutable,
                  tamper-proof record of your KYC submission without storing any raw biometric data.
                </p>
                {submitResult.ipfsCid && (
                  <a
                    href={`https://gateway.pinata.cloud/ipfs/${submitResult.ipfsCid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline mt-2 block"
                  >
                    View on IPFS \u2192
                  </a>
                )}
              </div>

              <button
                onClick={() => {
                  setStep('status');
                  refreshStatus();
                }}
                className="w-full py-3 border-2 border-accent text-accent font-bold uppercase hover:bg-accent/10 transition-colors"
              >
                VIEW STATUS
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ── Utility sub-components ──────────────────────────────────────

function Detail({ label, value, className = '', mono = false }: {
  label: string; value: string; className?: string; mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground uppercase text-xs">{label}</span>
      <span className={`font-bold text-sm ${mono ? 'font-mono text-xs' : ''} ${className}`}>
        {value}
      </span>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-foreground/30 p-2">
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
      <div className="font-bold text-accent">{value}</div>
    </div>
  );
}

export default KYCPage;
