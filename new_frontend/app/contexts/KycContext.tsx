import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAlgorand } from './AlgorandContext';

// ── Types ───────────────────────────────────────────────────────

export type KycStatusType =
  | 'not_started'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'revoked';

export interface KycStatusResult {
  walletAddress: string;
  status: KycStatusType;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  livenessScore: number | null;
  faceMatchScore: number | null;
  faceMatchPassed: boolean;
  ipfsAuditCid: string | null;
  ipfsAuditUri: string | null;
  onchainVerified: boolean;
  onchainTxId: string | null;
}

export interface KycSubmitPayload {
  walletAddress: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  nationality?: string;
  documentType?: string;
  documentNumber?: string;
  selfieBiometricHash: string;
  documentPhotoHash?: string;
  liveness: {
    score: number;
    challengesPassed: string[];
    frameCount: number;
  };
  faceMatchScore?: number;
}

export interface KycSubmitResult {
  success: boolean;
  submissionId: string;
  status: string;
  ipfsCid: string;
  ipfsUri: string;
  livenessScore: number;
  faceMatchScore: number | null;
  faceMatchPassed: boolean;
  message: string;
}

interface KycContextType {
  kycStatus: KycStatusResult | null;
  isLoading: boolean;
  isVerified: boolean;
  submitKyc: (payload: KycSubmitPayload) => Promise<KycSubmitResult>;
  refreshStatus: () => Promise<void>;
}

import { API_BASE, apiFetch } from '../config/api';

// ── Context ─────────────────────────────────────────────────────

const KycContext = createContext<KycContextType>({
  kycStatus: null,
  isLoading: false,
  isVerified: false,
  submitKyc: async () => { throw new Error('KycProvider not mounted'); },
  refreshStatus: async () => {},
});

export const useKyc = () => useContext(KycContext);

// ── Provider ────────────────────────────────────────────────────

export const KycProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address } = useAlgorand();
  const [kycStatus, setKycStatus] = useState<KycStatusResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isVerified = kycStatus?.status === 'approved';

  // ── Fetch status ───────────────────────────────────────────
  const refreshStatus = useCallback(async () => {
    if (!address) {
      setKycStatus(null);
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/kyc/status/${address}`);
      if (res.ok) {
        const data = await res.json();
        setKycStatus(data.data ?? data);
      }
    } catch (err) {
      console.warn('Failed to fetch KYC status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // ── Submit KYC ─────────────────────────────────────────────
  const submitKyc = useCallback(async (payload: KycSubmitPayload): Promise<KycSubmitResult> => {
    const res = await apiFetch(`${API_BASE}/kyc/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    const result = json.data ?? json;

    if (!res.ok) {
      throw new Error(result.message || 'KYC submission failed');
    }

    // Refresh status after submission
    await refreshStatus();

    return result;
  }, [refreshStatus]);

  return (
    <KycContext.Provider value={{ kycStatus, isLoading, isVerified, submitKyc, refreshStatus }}>
      {children}
    </KycContext.Provider>
  );
};
