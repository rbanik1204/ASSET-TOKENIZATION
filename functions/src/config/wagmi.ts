import { createConfig, fallback, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { bsc, bscTestnet, foundry, mainnet, polygon, polygonAmoy, sepolia } from 'wagmi/chains';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { metaMaskWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets';

// NOTE: Firebase Hosting SSR integration currently supports Next 12–15.
// We use RainbowKit to present a minimal wallet list (MetaMask + WalletConnect).
// We include multiple EVM networks; write actions are still gated by per-chain contract configuration.
const allChains = [mainnet, sepolia, bsc, bscTestnet, polygon, polygonAmoy, foundry] as const;

function parseEnabledChainIds(): number[] {
  const raw = process.env.NEXT_PUBLIC_ENABLED_CHAIN_IDS;
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
}

const enabledChainIds = parseEnabledChainIds();
type SupportedChain = (typeof allChains)[number];

export const chains = (() => {
  const filtered: SupportedChain[] = enabledChainIds.length
    ? allChains.filter((c) => enabledChainIds.includes(c.id))
    : [...allChains];

  const resolved = filtered.length ? filtered : [...allChains];
  return resolved as unknown as readonly [SupportedChain, ...SupportedChain[]];
})();

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const connectors = walletConnectProjectId
  ? connectorsForWallets(
      [
        {
          groupName: 'Wallets',
          wallets: [metaMaskWallet, walletConnectWallet],
        },
      ],
      {
        appName: 'Asset Tokenization Platform',
        projectId: walletConnectProjectId,
      },
    )
  : [injected()];

export const config = createConfig({
  chains,
  connectors,
  transports: {
    [mainnet.id]: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://cloudflare-eth.com'),
    [sepolia.id]: fallback(
      [
        process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,
        'https://ethereum-sepolia.publicnode.com',
        'https://sepolia.drpc.org',
        'https://rpc.sepolia.org',
      ]
        .filter(Boolean)
        .map((u) => http(u as string, { timeout: 20_000 })),
    ),
    [bsc.id]: http(process.env.NEXT_PUBLIC_BSC_RPC_URL || 'https://bsc-dataseed.binance.org'),
    [bscTestnet.id]: http(
      process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
    ),
    [polygon.id]: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com'),
    [polygonAmoy.id]: http(process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology'),
    [foundry.id]: http(process.env.NEXT_PUBLIC_LOCAL_RPC_URL || 'http://127.0.0.1:8545'),
  },
  ssr: true,
  batch: { multicall: false },
});
