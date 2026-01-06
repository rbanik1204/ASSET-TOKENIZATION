// Role definitions and access control utilities

export type UserRole = 'USER' | 'ADMIN' | 'AUDITOR';

export interface UserPermissions {
  canViewMarketplace: boolean;
  canPurchaseAssets: boolean;
  canListAssets: boolean;
  canViewPortfolio: boolean;
  canClaimIncome: boolean;
  canApproveAssets: boolean;
  canManageOracles: boolean;
  canDepositIncome: boolean;
  canViewAdminPanel: boolean;
  canViewAuditLogs: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  USER: {
    canViewMarketplace: true,
    canPurchaseAssets: true,
    canListAssets: true,
    canViewPortfolio: true,
    canClaimIncome: true,
    canApproveAssets: false,
    canManageOracles: false,
    canDepositIncome: false,
    canViewAdminPanel: false,
    canViewAuditLogs: false,
  },
  ADMIN: {
    canViewMarketplace: true,
    canPurchaseAssets: true,
    canListAssets: true,
    canViewPortfolio: true,
    canClaimIncome: true,
    canApproveAssets: true,
    canManageOracles: true,
    canDepositIncome: true,
    canViewAdminPanel: true,
    canViewAuditLogs: true,
  },
  AUDITOR: {
    canViewMarketplace: true,
    canPurchaseAssets: false,
    canListAssets: false,
    canViewPortfolio: false,
    canClaimIncome: false,
    canApproveAssets: false,
    canManageOracles: false,
    canDepositIncome: false,
    canViewAdminPanel: false,
    canViewAuditLogs: true,
  },
};

export function getPermissions(role: UserRole): UserPermissions {
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(
  role: UserRole,
  permission: keyof UserPermissions
): boolean {
  return ROLE_PERMISSIONS[role][permission];
}

// Admin wallet addresses (in production, store in database)
export const ADMIN_ADDRESSES = new Set([
  '0x400aD70deF204b2d8D01d1801df80c0F6A719Fc9', // Existing admin
  // Add more admin addresses here
].map(addr => addr.toLowerCase()));

// Auditor wallet addresses
export const AUDITOR_ADDRESSES = new Set<string>([
  // Add auditor addresses here when needed
]);

export function getUserRole(address: string | undefined): UserRole {
  if (!address) return 'USER';
  const normalized = address.toLowerCase();
  
  if (ADMIN_ADDRESSES.has(normalized)) return 'ADMIN';
  if (AUDITOR_ADDRESSES.has(normalized)) return 'AUDITOR';
  
  return 'USER';
}

export function isAdmin(address: string | undefined): boolean {
  return getUserRole(address) === 'ADMIN';
}

export function isAuditor(address: string | undefined): boolean {
  return getUserRole(address) === 'AUDITOR';
}
