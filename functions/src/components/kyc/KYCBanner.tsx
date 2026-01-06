'use client';

import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getKYCStatus, getKYCStatusBadge, type KYCStatus } from '@/lib/kyc';

export function KYCBanner() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [kycStatus, setKycStatus] = useState<KYCStatus>('NOT_STARTED');
  const [showBanner, setShowBanner] = useState(false);
  
  useEffect(() => {
    if (!isConnected || !address) {
      setShowBanner(false);
      return;
    }
    
    const kyc = getKYCStatus(address);
    setKycStatus(kyc.status);
    
    // Show banner if not verified
    setShowBanner(kyc.status !== 'VERIFIED');
  }, [address, isConnected]);
  
  if (!showBanner) return null;
  
  const badge = getKYCStatusBadge(kycStatus);
  
  const getBannerColor = () => {
    switch (kycStatus) {
      case 'PENDING':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
      case 'REJECTED':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };
  
  const getTextColor = () => {
    switch (kycStatus) {
      case 'PENDING':
        return 'text-amber-800 dark:text-amber-300';
      case 'REJECTED':
        return 'text-red-800 dark:text-red-300';
      default:
        return 'text-blue-800 dark:text-blue-300';
    }
  };
  
  const getMessage = () => {
    switch (kycStatus) {
      case 'PENDING':
        return 'Your KYC verification is being processed. You will be notified once complete.';
      case 'REJECTED':
        return 'Your KYC application was rejected. Please contact support for more information.';
      default:
        return 'Complete KYC verification to access all features and purchase restricted assets.';
    }
  };
  
  const getAction = () => {
    switch (kycStatus) {
      case 'PENDING':
        return null;
      case 'REJECTED':
        return (
          <button
            onClick={() => router.push('/support')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all text-sm"
          >
            Contact Support
          </button>
        );
      default:
        return (
          <button
            onClick={() => router.push('/kyc')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all text-sm"
          >
            Start KYC Verification
          </button>
        );
    }
  };
  
  return (
    <div className={`border-b ${getBannerColor()}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className={`px-2 py-1 rounded text-xs font-medium border ${badge.color}`}>
              {badge.icon} {badge.text}
            </div>
            <p className={`text-sm ${getTextColor()}`}>
              {getMessage()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getAction()}
            <button
              onClick={() => setShowBanner(false)}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
              aria-label="Dismiss banner"
            >
              <svg className={`w-5 h-5 ${getTextColor()}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
