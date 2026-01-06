import { NextRequest, NextResponse } from 'next/server';
import { getUserRole, getPermissions, type UserRole } from '@/lib/rbac';

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
    
    const role: UserRole = getUserRole(address);
    const permissions = getPermissions(role);
    
    return NextResponse.json({
      address,
      role,
      permissions,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Role verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify role' },
      { status: 500 }
    );
  }
}
