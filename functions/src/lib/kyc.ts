// KYC/Compliance types and utilities

export type KYCStatus = 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export type Jurisdiction = 
  | 'india' 
  | 'uae' 
  | 'singapore' 
  | 'uk' 
  | 'us' 
  | 'eu' 
  | 'other';

export interface KYCProfile {
  address: string;
  status: KYCStatus;
  jurisdiction?: Jurisdiction;
  verifiedAt?: string;
  expiresAt?: string;
  documents?: {
    idProof: boolean;
    addressProof: boolean;
    taxDocuments: boolean;
  };
}

export interface AssetJurisdiction {
  assetId: string;
  jurisdiction: Jurisdiction;
  requiresKYC: boolean;
  allowedJurisdictions: Jurisdiction[];
  minimumKYCLevel: 'basic' | 'enhanced' | 'institutional';
}

// Mock KYC data - in production, this would come from database
const MOCK_KYC_DATA: Record<string, KYCProfile> = {
  '0x400ad70def204b2d8d01d1801df80c0f6a719fc9': {
    address: '0x400ad70def204b2d8d01d1801df80c0f6a719fc9',
    status: 'VERIFIED',
    jurisdiction: 'india',
    verifiedAt: '2026-01-01T00:00:00Z',
    expiresAt: '2027-01-01T00:00:00Z',
    documents: {
      idProof: true,
      addressProof: true,
      taxDocuments: true,
    },
  },
};

export function getKYCStatus(address: string | undefined): KYCProfile {
  if (!address) {
    return {
      address: '',
      status: 'NOT_STARTED',
    };
  }
  
  const normalized = address.toLowerCase();
  return MOCK_KYC_DATA[normalized] || {
    address,
    status: 'NOT_STARTED',
  };
}

export function isKYCVerified(address: string | undefined): boolean {
  return getKYCStatus(address).status === 'VERIFIED';
}

export function canAccessAsset(
  userAddress: string | undefined,
  assetJurisdiction: AssetJurisdiction
): { allowed: boolean; reason?: string } {
  if (!assetJurisdiction.requiresKYC) {
    return { allowed: true };
  }
  
  const kyc = getKYCStatus(userAddress);
  
  if (kyc.status !== 'VERIFIED') {
    return {
      allowed: false,
      reason: 'KYC verification required for this asset',
    };
  }
  
  if (!kyc.jurisdiction) {
    return {
      allowed: false,
      reason: 'Jurisdiction information missing from KYC profile',
    };
  }
  
  if (
    assetJurisdiction.allowedJurisdictions.length > 0 &&
    !assetJurisdiction.allowedJurisdictions.includes(kyc.jurisdiction)
  ) {
    return {
      allowed: false,
      reason: `This asset is only available to investors from: ${assetJurisdiction.allowedJurisdictions.join(', ')}`,
    };
  }
  
  return { allowed: true };
}

export function getKYCStatusBadge(status: KYCStatus): {
  text: string;
  color: string;
  icon: string;
} {
  switch (status) {
    case 'VERIFIED':
      return {
        text: 'KYC Verified',
        color: 'bg-green-500/10 text-green-500 border-green-500/30',
        icon: '✓',
      };
    case 'PENDING':
      return {
        text: 'KYC Pending',
        color: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
        icon: '⏳',
      };
    case 'REJECTED':
      return {
        text: 'KYC Rejected',
        color: 'bg-red-500/10 text-red-500 border-red-500/30',
        icon: '✗',
      };
    case 'NOT_STARTED':
      return {
        text: 'KYC Required',
        color: 'bg-slate-500/10 text-slate-500 border-slate-500/30',
        icon: '!',
      };
  }
}

export function getJurisdictionName(jurisdiction: Jurisdiction): string {
  const names: Record<Jurisdiction, string> = {
    india: 'India',
    uae: 'United Arab Emirates',
    singapore: 'Singapore',
    uk: 'United Kingdom',
    us: 'United States',
    eu: 'European Union',
    other: 'Other',
  };
  return names[jurisdiction];
}
