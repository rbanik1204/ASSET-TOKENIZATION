// Notification system types and utilities

export type NotificationType = 
  | 'ASSET_APPROVED' 
  | 'ASSET_REJECTED' 
  | 'INCOME_DEPOSITED' 
  | 'CLAIM_SUCCESS' 
  | 'CLAIM_FAILED'
  | 'PURCHASE_SUCCESS' 
  | 'PURCHASE_FAILED'
  | 'ORACLE_STALE'
  | 'ORACLE_RESTORED'
  | 'KYC_APPROVED'
  | 'KYC_REJECTED';

export type NotificationPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  assetId?: string;
  assetName?: string;
  amount?: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

// Real notification data from blockchain events
export async function getNotificationsFromEvents(address: string): Promise<Notification[]> {
  if (!address) return [];

  try {
    // Fetch indexed data containing blockchain events
    const response = await fetch('/api/admin/activity', { cache: 'no-store' });
    if (!response.ok) return [];
    
    const data = await response.json();
    const activity = data.activity || [];
    
    const notifications: Notification[] = [];
    
    // Process each event and convert to notification
    for (const event of activity) {
      const notification = mapEventToNotification(event, address);
      if (notification) {
        notifications.push(notification);
      }
    }
    
    // Sort by timestamp (newest first)
    return notifications.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return [];
  }
}

// Map blockchain event to notification
function mapEventToNotification(event: any, userAddress: string): Notification | null {
  const eventType = event.event;
  const ref = event.ref || '';
  const timestamp = event.timestamp || new Date().toISOString();
  
  // Asset Approved Event
  if (eventType === 'AssetApproved') {
    // Parse asset ID from ref (format: "asset:1" or "token:0x...")
    const assetId = ref.includes(':') ? ref.split(':')[1] : ref;
    
    return {
      id: event.id,
      type: 'ASSET_APPROVED',
      priority: 'HIGH',
      title: 'Asset Approved!',
      message: 'Your asset has been approved and is now live on the marketplace.',
      assetId: assetId,
      timestamp,
      read: false,
      actionUrl: `/assets/${assetId}`,
      actionLabel: 'View Asset',
    };
  }
  
  // Income Deposited Event
  if (eventType === 'IncomeDeposited') {
    const assetId = ref.includes(':') ? ref.split(':')[1] : ref;
    
    return {
      id: event.id,
      type: 'INCOME_DEPOSITED',
      priority: 'MEDIUM',
      title: 'Income Available',
      message: 'New rental income has been deposited and is ready to claim.',
      assetId: assetId,
      timestamp,
      read: false,
      actionUrl: '/income',
      actionLabel: 'Claim Now',
    };
  }
  
  // Token Transfer (Purchase)
  if (eventType === 'Transfer' && ref.toLowerCase().includes(userAddress.toLowerCase())) {
    return {
      id: event.id,
      type: 'PURCHASE_SUCCESS',
      priority: 'MEDIUM',
      title: 'Transaction Complete',
      message: 'Your token transaction has been completed successfully.',
      timestamp,
      read: false,
      actionUrl: '/portfolio',
      actionLabel: 'View Portfolio',
    };
  }
  
  // Claim Success
  if (eventType === 'Claim' && ref.toLowerCase().includes(userAddress.toLowerCase())) {
    return {
      id: event.id,
      type: 'CLAIM_SUCCESS',
      priority: 'MEDIUM',
      title: 'Claim Successful',
      message: 'Your income claim has been processed successfully.',
      timestamp,
      read: false,
      actionUrl: '/income',
      actionLabel: 'View Income',
    };
  }
  
  return null;
}

export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'ASSET_APPROVED':
      return '✅';
    case 'ASSET_REJECTED':
      return '❌';
    case 'INCOME_DEPOSITED':
      return '💰';
    case 'CLAIM_SUCCESS':
      return '✓';
    case 'CLAIM_FAILED':
      return '⚠️';
    case 'PURCHASE_SUCCESS':
      return '🎉';
    case 'PURCHASE_FAILED':
      return '❌';
    case 'ORACLE_STALE':
      return '⚠️';
    case 'ORACLE_RESTORED':
      return '✓';
    case 'KYC_APPROVED':
      return '✅';
    case 'KYC_REJECTED':
      return '❌';
    default:
      return '📢';
  }
}

export function getNotificationColor(priority: NotificationPriority): string {
  switch (priority) {
    case 'HIGH':
      return 'bg-red-100 dark:bg-red-900/30 border-red-500';
    case 'MEDIUM':
      return 'bg-amber-100 dark:bg-amber-900/30 border-amber-500';
    case 'LOW':
      return 'bg-blue-100 dark:bg-blue-900/30 border-blue-500';
  }
}
