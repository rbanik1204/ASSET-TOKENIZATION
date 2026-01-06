# Asset Tokenization Platform - Frontend

A modern, secure, and user-friendly frontend application for a Real Asset Tokenization Platform built with Next.js, TypeScript, and Web3 technologies.

## 🚀 Features

### Core Functionality
- **Landing Page**: Introduction to platform with how-it-works and benefits
- **Marketplace**: Browse tokenized real-world assets with advanced filtering
- **Asset Details**: Comprehensive asset information with trading interface
- **AMM Trading**: Buy/sell tokens with real-time price impact and slippage calculations
- **Portfolio Dashboard**: Track investments, performance, and asset allocation
- **Income Dashboard**: Claim rental income and track earnings history
- **Admin Panel**: Review and approve asset submissions (role-based access)

### Technical Features
- **Web3 Integration**: Wallet connection via RainbowKit (MetaMask, WalletConnect)
- **Blockchain Abstraction**: User-friendly interface hiding blockchain complexity
- **Real-time Updates**: Live portfolio and price tracking
- **Responsive Design**: Mobile-first, fully responsive UI
- **Type Safety**: Full TypeScript implementation
- **State Management**: React Context API for global state

## 🛠️ Technology Stack

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Web3 Libraries**:
  - wagmi - React Hooks for Ethereum
  - viem - TypeScript interface for Ethereum
  - RainbowKit - Wallet connection UI
  - ethers.js - Ethereum library
- **State Management**: React Context API
- **Charts**: Recharts / Chart.js
- **HTTP Client**: Axios

## 📦 Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   
   Update `.env.local` with your values:
   ```env
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
   # Per-chain contract addresses (recommended)
   NEXT_PUBLIC_ASSET_REGISTRY_ADDRESS_POLYGON=0x...
   NEXT_PUBLIC_PRIMARY_SALE_ADDRESS_POLYGON=0x...
   NEXT_PUBLIC_INCOME_DISTRIBUTOR_ADDRESS_POLYGON=0x...
   NEXT_PUBLIC_USDC_ADDRESS_POLYGON=0x...
   NEXT_PUBLIC_ASSET_APPROVAL_QUEUE_ADDRESS_POLYGON=0x...
   ```

   Get WalletConnect Project ID: https://cloud.walletconnect.com

3. **Update contract ABIs**:
   
   Replace simplified ABIs in `src/config/contracts.ts` with full ABIs from your deployed contracts.

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```

Application will be available at: http://localhost:3000

### Production Build
```bash
npm run build
npm start
```

## 📁 Project Structure

```
apps/frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Landing page
│   │   ├── marketplace/       # Asset marketplace
│   │   ├── assets/[id]/       # Asset detail page
│   │   ├── portfolio/         # Portfolio dashboard
│   │   ├── income/            # Income dashboard
│   │   └── admin/             # Admin panel
│   ├── components/
│   │   ├── ui/                # Reusable UI components
│   │   ├── layout/            # Layout components (Navbar, Footer)
│   │   └── assets/            # Asset-specific components
│   ├── config/
│   │   ├── wagmi.ts           # Web3 configuration
│   │   └── contracts.ts       # Contract addresses & ABIs
│   ├── context/
│   │   └── AppContext.tsx     # Global state management
│   ├── hooks/
│   │   └── useContracts.ts    # Smart contract interaction hooks
│   └── types/
│       └── index.ts           # TypeScript type definitions
├── public/                     # Static assets
└── package.json
```

## 🔧 Configuration

### Supported Networks
- Ethereum Mainnet
- Polygon
- Sepolia (Testnet)
- Polygon Amoy (Testnet)

Update networks in `src/config/wagmi.ts`

### Smart Contract Integration

The application connects to smart contracts via custom hooks in `src/hooks/useContracts.ts`

## 🎨 UI Components

### Core Components
- **Button**: Primary, secondary, outline, danger variants
- **Card**: Container with header, body, footer sections
- **Input**: Form input with label, error, helper text
- **Modal**: Overlay modal with customizable size
- **Alert**: Success, error, warning, info notifications
- **Badge**: Status indicators
- **LoadingSpinner**: Loading states

## 🔐 Security Features

- No private key storage
- Explicit transaction signing via wallet
- Price impact warnings
- Slippage protection
- Transaction status tracking
- Network validation
- Contract address verification

## 📱 Pages Overview

### 1. Landing Page (`/`)
- Hero section with platform introduction
- Statistics display
- How it works section
- Benefits showcase
- Call-to-action buttons

### 2. Marketplace (`/marketplace`)
- Asset listing grid
- Search and filter functionality
- Sort by price, date, popularity
- Asset type filtering
- Verified assets filter

### 3. Asset Detail (`/assets/[id]`)
- Comprehensive asset information
- Image gallery
- Legal documents access
- Price history chart
- Trading interface (buy/sell)
- Real-time metrics

### 4. Portfolio (`/portfolio`)
- Total portfolio value
- Asset allocation chart
- Holdings table with P&L
- Recent activity
- Performance metrics

### 5. Income Dashboard (`/income`)
- Total claimable income
- Income by asset
- Claim functionality
- Claim history
- Monthly earning rates

### 6. Admin Panel (`/admin`)
- Pending asset submissions
- Review interface
- Document verification
- Approve/reject workflow
- Statistics dashboard

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud Project ID | Recommended (required for WalletConnect option) |
| `NEXT_PUBLIC_*_RPC_URL` | Optional RPC overrides per chain | No |
| `NEXT_PUBLIC_<CONTRACT>_ADDRESS_<SUFFIX>` | Per-chain contract addresses (recommended) | Yes for writes on that chain |
| `NEXT_PUBLIC_<CONTRACT>_ADDRESS` | Base fallback (used only on Sepolia + Local) | No |

Supported `<SUFFIX>` values: `ETHEREUM`, `SEPOLIA`, `BSC`, `BSC_TESTNET`, `POLYGON`, `POLYGON_AMOY`, `LOCAL`.

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

## 🔮 Next Steps

1. Get WalletConnect Project ID from https://cloud.walletconnect.com
2. Deploy smart contracts and update addresses in `.env.local`
3. Update contract ABIs in `src/config/contracts.ts`
4. Replace mock data with actual blockchain calls
5. Test wallet connection and transactions
6. Deploy to production

---

**Built with ❤️ for decentralized asset ownership**
