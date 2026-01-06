import path from 'node:path';

function isAppsFrontendCwd(cwd: string) {
  const parts = cwd.split(path.sep).filter(Boolean);
  return (
    parts.length >= 2 &&
    parts[parts.length - 2] === 'apps' &&
    parts[parts.length - 1] === 'frontend'
  );
}

export function getIndexerOutFilePath() {
  const configured = process.env.INDEXER_OUT_FILE;
  if (configured && configured.trim()) {
    return path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured);
  }

  // In Firebase Hosting SSR (Gen2 / Cloud Run), the filesystem is effectively ephemeral and
  // only /tmp is guaranteed writable. Default there to avoid read/write failures.
  if (process.platform !== 'win32' && (process.env.K_SERVICE || process.env.FUNCTION_TARGET)) {
    return '/tmp/indexer.json';
  }

  const cwd = path.resolve(process.cwd());

  // When running inside apps/frontend, default to .data/indexer.json.
  if (isAppsFrontendCwd(cwd)) {
    return path.resolve(cwd, '.data/indexer.json');
  }

  // When running from repo root (or elsewhere), default to apps/frontend/.data/indexer.json.
  return path.resolve(cwd, 'apps', 'frontend', '.data', 'indexer.json');
}
