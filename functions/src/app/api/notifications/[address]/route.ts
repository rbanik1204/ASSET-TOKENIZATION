import { NextResponse } from 'next/server';
import { getNotificationsFromEvents } from '@/lib/notifications';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  
  // Validate Ethereum address format
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json(
      { error: 'Invalid Ethereum address' },
      { status: 400 }
    );
  }
  
  try {
    // Get real notifications from blockchain events
    const notifications = await getNotificationsFromEvents(address);
    
    return NextResponse.json({
      address,
      notifications,
      unreadCount: notifications.filter(n => !n.read).length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  
  // Validate Ethereum address format
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json(
      { error: 'Invalid Ethereum address' },
      { status: 400 }
    );
  }
  
  const body = await request.json();
  const { notificationId, action } = body;
  
  if (action === 'markAsRead' && notificationId) {
    // In production: update database
    return NextResponse.json({
      success: true,
      notificationId,
      action: 'marked_as_read',
    });
  }
  
  if (action === 'markAllAsRead') {
    // In production: update all notifications for user
    return NextResponse.json({
      success: true,
      action: 'marked_all_as_read',
    });
  }
  
  if (action === 'delete' && notificationId) {
    // In production: delete notification from database
    return NextResponse.json({
      success: true,
      notificationId,
      action: 'deleted',
    });
  }
  
  return NextResponse.json(
    { error: 'Invalid action' },
    { status: 400 }
  );
}
