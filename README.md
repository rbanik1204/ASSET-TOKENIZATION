# Asset Tokenization Platform - Multi-Chain

**🚀 Live Demo:** https://asset-linked-c4ef2.web.app  
**🟣 Algorand Demo:** https://asset-linked-c4ef2.web.app/algorand-demo

> Multi-blockchain platform for tokenizing real-world assets, enabling fractional ownership, instant liquidity, and transparent value discovery. **Now with Algorand integration** for ultra-fast, ultra-cheap campus asset tokenization!

## 🎯 Quick Start - Try Algorand Now!

### For Judges & Testers (3 Minutes)

1. **Visit**: https://asset-linked-c4ef2.web.app
2. **Click**: "🟣 Algorand" in navigation
3. **Connect**: Pera Wallet or Defly Wallet (scan QR)
4. **Fund**: Get free testnet ALGO → https://bank.testnet.algorand.network/
5. **Create**: Try tokenizing a campus dorm room or gym pass!

**Why Algorand?**
- ⚡ **4.5 second finality** (not minutes)
- 💰 **$0.001 per transaction** (not $50)
- 🌱 **Carbon negative** (eco-friendly)
- 🪙 **Native tokens** (Layer-1 ASAs)

📘 **[Complete Algorand Guide →](ALGORAND_START.md)**

---

A complete blockchain-based platform for tokenizing real-world assets, enabling fractional ownership, automated trading, and passive income distribution.

## 📁 Project Structure

```
Asset Tokenization/
└── contracts/         # Foundry smart contracts (Solidity)
└── apps/frontend/     # Next.js frontend application
    ├── src/
    │   ├── app/       # Pages and routes
    │   ├── components/ # Reusable UI components
    │   ├── config/    # Configuration files
    │   ├── context/   # State management
    │   ├── hooks/     # Custom React hooks
    │   └── types/     # TypeScript definitions
    └── README.md      # Detailed frontend documentation
```

## 🚀 Quick Start

### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd "c:\Asset Tokenization\frontend"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env.local`

4. Run development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:3000

### Smart Contracts (Foundry)

This repo includes a Foundry project in `contracts/`. If you don't have Foundry installed yet, install it first:

- https://book.getfoundry.sh/getting-started/installation

Then:

```bash
cd "c:\Asset Tokenization\AssetToken"
forge build
forge test
```

## 📚 Documentation

- [Frontend README](./apps/frontend/README.md) - Detailed frontend documentation
- Configuration guides in respective directories
- Component documentation in code comments

## 🎯 Features

### Implemented
✅ Landing page with platform introduction
✅ Asset marketplace with filtering
✅ Asset detail pages with trading
✅ AMM-based token trading
✅ Portfolio dashboard
✅ Income/rent claiming system
✅ Admin panel for asset management
✅ Web3 wallet integration
✅ Responsive design

### Core Technologies
- **Frontend**: Next.js 16, React, TypeScript
- **Styling**: Tailwind CSS
- **Web3**: wagmi, viem, RainbowKit, ethers.js
- **State**: React Context API

## 🔐 Security

- No private key storage
- Explicit wallet signing
- Transaction verification
- Price impact warnings
- Contract address validation

## 📞 Support

For detailed setup and configuration, see individual README files in each directory.

---

**Version**: 1.0.0  
**Last Updated**: January 1, 2026
