import { MainLayout } from '@/components/layout/MainLayout';

export default function DocumentationPage() {
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Documentation</h1>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
          Wallet connection and network support notes.
        </p>

        <section className="mt-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold tracking-tight">Connect Your Wallet (WalletConnect)</h2>
            <p className="text-sm text-[color:var(--text-muted)]">
              Use WalletConnect to connect a compatible Web3 wallet.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Supported wallets</h3>
            <ul className="list-disc pl-5 text-sm text-[color:var(--text-muted)] space-y-1">
              <li>MetaMask</li>
              <li>Trust Wallet</li>
              <li>Coinbase Wallet</li>
              <li>Binance Web3 Wallet (not Binance Exchange)</li>
              <li>Many other wallets via WalletConnect</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Supported networks</h3>
            <ul className="list-disc pl-5 text-sm text-[color:var(--text-muted)] space-y-1">
              <li>Ethereum Sepolia (testnet)</li>
              <li>Local development network (chainId 31337) when running a local RPC</li>
            </ul>
            <p className="text-xs text-[color:var(--text-muted)]">
              Not supported in this build: Ethereum Mainnet, BNB Smart Chain, Polygon, Solana, Bitcoin, and other non-EVM networks.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">How to connect using WalletConnect</h3>
            <ol className="list-decimal pl-5 text-sm text-[color:var(--text-muted)] space-y-1">
              <li>Open your wallet app (on your phone).</li>
              <li>Select WalletConnect / Scan QR.</li>
              <li>Scan the QR code shown in the browser modal.</li>
              <li>Approve the connection in your wallet.</li>
            </ol>
            <p className="text-xs text-[color:var(--text-muted)]">
              Tip: don’t scan the QR using your phone Camera app. Use the wallet app’s built-in WalletConnect scanner.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Common issues</h3>
            <ul className="list-disc pl-5 text-sm text-[color:var(--text-muted)] space-y-1">
              <li>
                “This site can’t be reached” after scanning → you likely used the phone Camera app. Open your wallet app and scan via WalletConnect.
              </li>
              <li>“This wallet doesn’t support this network” → switch your wallet to Sepolia (or the supported network shown in-app).</li>
              <li>Connection rejected → re-scan the QR and approve permissions.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Security notice</h3>
            <ul className="list-disc pl-5 text-sm text-[color:var(--text-muted)] space-y-1">
              <li>We never access your private keys.</li>
              <li>All transactions must be approved in your wallet.</li>
            </ul>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
