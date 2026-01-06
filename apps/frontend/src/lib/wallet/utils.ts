export function shortenAddress(address: string, start = 6, end = 4): string {
  if (!address) return '';
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}…${address.slice(-end)}`;
}

export function isUserRejectedError(err: unknown): boolean {
  const anyErr = err as any;
  const code = anyErr?.code;
  const message = String(anyErr?.message || '').toLowerCase();

  // EIP-1193 user rejected request
  if (code === 4001) return true;

  // WalletConnect + misc providers
  if (message.includes('user rejected')) return true;
  if (message.includes('user denied')) return true;

  return false;
}
