import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import { getIndexerOutFilePath } from '@/lib/indexerOutFile';
import { ensureIndexerOutputWithOptions } from '@/lib/indexer/ensureIndexerOutput';

function getOutFilePath() {
  return getIndexerOutFilePath();
}

export async function GET() {
  const outFile = getOutFilePath();

  try {
    await ensureIndexerOutputWithOptions({ waitMs: 1500 });
    const raw = await fs.readFile(outFile, 'utf8');
    const parsed = JSON.parse(raw) as any;

    const queue = parsed?.admin?.queue;

    return NextResponse.json(
      {
        indexed: true,
        updatedAt: parsed?.updatedAt ?? null,
        queue: Array.isArray(queue) ? queue : [],
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      {
        indexed: true,
        updatedAt: new Date().toISOString(),
        queue: [],
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
