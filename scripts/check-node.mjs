import process from 'node:process';

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const raw = process.versions?.node || '';
const major = Number(String(raw).split('.')[0] || '0');

// Next.js + Firebase Functions/App Hosting are typically happiest on LTS.
// This repo targets Node 20/22 (LTS) for local dev and deployment.
if (!Number.isFinite(major) || major <= 0) {
  fail(`[node-check] Unable to detect Node version (got: ${raw}).`);
}

if (major < 20 || major >= 23) {
  fail(
    `[node-check] Unsupported Node.js version: ${raw}\n` +
      `This repo expects Node 20.x or 22.x (LTS).\n` +
      `Reason: Next dev + Firebase runtimes are not guaranteed on Node ${major}.\n\n` +
      `Fix (Windows): install Node 22 LTS (recommended) or Node 20 LTS and re-open the terminal.`,
  );
}

console.log(`[node-check] OK (Node ${raw})`);
