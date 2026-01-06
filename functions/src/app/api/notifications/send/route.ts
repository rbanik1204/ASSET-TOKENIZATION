/**
 * Notifications API Route
 * POST /api/notifications/send
 * Sends email and/or SMS notifications to asset owners
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendNotification, NotificationPayload } from '@/services/notification.service';

export async function POST(request: NextRequest) {
  try {
    const payload: NotificationPayload = await request.json();

    // Validate payload
    if (!payload.type) {
      return NextResponse.json(
        { error: 'Notification type is required' },
        { status: 400 }
      );
    }

    if (!payload.recipientEmail && !payload.recipientPhone) {
      return NextResponse.json(
        { error: 'At least one recipient (email or phone) is required' },
        { status: 400 }
      );
    }

    // Send notification
    const result = await sendNotification(payload);

    // Check if any notification was sent successfully
    const emailSuccess = result.email?.success ?? false;
    const smsSuccess = result.sms?.success ?? false;

    if (!emailSuccess && !smsSuccess) {
      return NextResponse.json(
        {
          error: 'Failed to send notifications',
          details: {
            email: result.email?.error,
            sms: result.sms?.error,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      result,
    });
  } catch (error: any) {
    console.error('Notification API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to check notification service status
export async function GET() {
  const { isNotificationConfigured } = await import('@/services/notification.service');
  const config = isNotificationConfigured();

  return NextResponse.json({
    configured: config,
    message: 'Notification service status',
  });
}
