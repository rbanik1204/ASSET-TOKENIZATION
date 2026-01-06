import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import { getIndexerOutFilePath } from '@/lib/indexerOutFile';

function isHexAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function getOutFilePath() {
  return getIndexerOutFilePath();
}

export async function GET(_request: Request, ctx: { params: Promise<{ wallet: string }> }) {
  const params = await ctx.params;
  const wallet = (params.wallet || '').trim();

  if (!wallet || !isHexAddress(wallet)) {
    return NextResponse.json({ error: 'Missing or invalid wallet address.' }, { status: 400 });
  }

  const outFile = getOutFilePath();

  try {
    const raw = await fs.readFile(outFile, 'utf8');
    const parsed = JSON.parse(raw) as any;

    const key = wallet.toLowerCase();
    const row = parsed?.wallets?.[key];

    if (!row) {
      return NextResponse.json(
        {
          wallet,
          indexed: false,
          updatedAt: parsed?.updatedAt ?? null,
          message:
            'Wallet not indexed yet. Ensure the backend indexer is running and INDEXER_WALLETS includes this wallet.',
          holdings: [],
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        wallet,
        indexed: true,
        updatedAt: parsed?.updatedAt ?? null,
        chainId: parsed?.chainId ?? null,
        registry: parsed?.registry ?? null,
        holdings: row.holdings ?? [],
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        wallet,
        indexed: false,
        updatedAt: null,
        message:
          'Indexer output not found. Start the indexer (node apps/frontend/scripts/indexer.mjs) and try again.',
        holdings: [],
      },
      { status: 200 },
    );
  }
}
