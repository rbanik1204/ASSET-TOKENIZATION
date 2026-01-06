import fs from 'node:fs/promises';
import path from 'node:path';

import { getIndexerOutFilePath } from '@/lib/indexerOutFile';
import { buildIndexerSnapshot } from './buildSnapshot';

const MAX_AGE_MS = 3_000;
let inFlight: Promise<void> | null = null;

type EnsureOptions = {
  /** Maximum time to wait for a refresh before returning (ms). */
  waitMs?: number;
};

async function fileIsFresh(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    const ageMs = Date.now() - stat.mtimeMs;
    return ageMs >= 0 && ageMs <= MAX_AGE_MS;
  } catch {
    return false;
  }
}

async function writeSnapshot(outFile: string) {
  const dir = path.dirname(outFile);
  await fs.mkdir(dir, { recursive: true }).catch(() => undefined);

  const snapshot = await buildIndexerSnapshot();
  await fs.writeFile(outFile, JSON.stringify(snapshot), 'utf8');
}

export async function ensureIndexerOutput(): Promise<string> {
  return ensureIndexerOutputWithOptions({});
}

export async function ensureIndexerOutputWithOptions(options: EnsureOptions): Promise<string> {
  const outFile = getIndexerOutFilePath();

  const fresh = await fileIsFresh(outFile);
  if (fresh) return outFile;

  if (!inFlight) {
    inFlight = writeSnapshot(outFile).finally(() => {
      inFlight = null;
    });
  }

  const waitMs = typeof options.waitMs === 'number' ? options.waitMs : 0;
  if (waitMs > 0) {
    await Promise.race([
      inFlight,
      new Promise<void>((resolve) => {
        setTimeout(resolve, waitMs);
      }),
    ]);
  }
  return outFile;
}
