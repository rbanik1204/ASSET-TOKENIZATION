import { NextRequest, NextResponse } from 'next/server';
import { getKYCStatus } from '@/lib/kyc';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    
    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }
    
    const kycProfile = getKYCStatus(address);
    
    return NextResponse.json({
      ...kycProfile,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('KYC status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KYC status' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const body = await request.json();
    
    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }
    
    // In production, this would:
    // 1. Store KYC submission in database
    // 2. Trigger KYC verification workflow
    // 3. Send confirmation email
    // 4. Return submission ID
    
    return NextResponse.json({
      success: true,
      status: 'PENDING',
      message: 'KYC application submitted successfully',
      submissionId: Math.floor(Math.random() * 100000),
      estimatedProcessingTime: '3-5 business days',
    });
    
  } catch (error) {
    console.error('KYC submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit KYC application' },
      { status: 500 }
    );
  }
}
