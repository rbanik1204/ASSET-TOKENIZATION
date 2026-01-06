import { NextResponse } from 'next/server';
import { isAddress } from 'viem';

function parseAdminWallets(value: string | undefined): Set<string> {
  if (!value) return new Set();

  return new Set(
    value
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function GET(_req: Request, ctx: { params: Promise<{ wallet: string }> }) {
  const params = await ctx.params;
  const wallet = (params.wallet ?? '').trim();

  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
  }

  // Backend-controlled role mapping (no authentication, just a role lookup).
  // Configure via env var in hosting/runtime:
  //   ADMIN_WALLETS=0xabc...,0xdef...
  const admins = parseAdminWallets(process.env.ADMIN_WALLETS);
  const isAdmin = admins.has(wallet.toLowerCase());

  return NextResponse.json(
    {
      wallet,
      role: isAdmin ? 'admin' : 'user',
    },
    { status: 200 },
  );
}
