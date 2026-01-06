# 🚀 Quick Start Guide - Asset Tokenization Platform

## Prerequisites
- Node.js **20.x or 22.x (LTS)** installed (Next dev + Firebase runtimes)
- npm or yarn package manager
- A Web3 wallet (MetaMask recommended)

## Getting Started in 5 Minutes

### Step 1: Navigate to Frontend Directory
```bash
cd "c:\Asset Tokenization\apps\frontend"
```

### Step 2: Install Dependencies (Already Done)
```bash
npm install
```

### Step 3: Configure WalletConnect (Required)
1. Visit https://cloud.walletconnect.com
2. Create a free account
3. Create a new project
4. Copy your Project ID
5. Open `.env.local` file
6. Replace `your_project_id_here` with your actual Project ID:
   ```env
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_actual_project_id
   ```

### Step 4: Start Development Server
```bash
npm run dev
```

If you prefer the repo-root helper:
```bash
cd "c:\Asset Tokenization"
npm run dev
```

For a full local chain + deploy + env sync:
```bash
cd "c:\Asset Tokenization"
npm run dev:local
```

### Step 5: Open in Browser
Visit: http://localhost:3000

## 🎉 You're Done!

You should now see the Asset Tokenization Platform running with:
- ✅ Beautiful landing page
- ✅ Marketplace with sample assets
- ✅ Wallet connection button (RainbowKit)
- ✅ All navigation working

## 🔗 Connecting Your Wallet

1. Click "Connect Wallet" in the top right
2. Choose your wallet (MetaMask, WalletConnect, etc.)
3. Approve the connection
4. You're connected!

## 🧪 Testing Features

### Browse Assets
- Go to "Marketplace"
- See 3 sample tokenized assets
- Use filters and search
- Click any asset to view details

### View Asset Details
- Click on any asset card
- See full asset information
- Try the "Buy Tokens" button (simulation)
- Trading modal will appear with price calculations

### Check Portfolio (Requires Wallet)
- Connect your wallet first
- Go to "Portfolio"
- See mock portfolio data
- View holdings and performance

### View Income (Requires Wallet)
- Connect your wallet first
- Go to "Income"
- See claimable income
- Try claiming (simulation)

### Admin Panel (Requires Wallet)
- Connect your wallet first
- Go to "Admin"
- See pending asset submissions
- Review and approve/reject assets

## ⚙️ Current State

### ✅ Working Features
- All pages render correctly
- Navigation works
- Wallet connection (with WalletConnect ID)
- All UI components functional
- Simulated transactions

### 📊 Using Mock Data
The app is wired to on-chain contracts + an indexer JSON cache. For local dev, run `npm run dev:local` (starts Anvil + deploys + merges addresses into `apps/frontend/.env.local`).

### 🔧 To Connect to Real Blockchain

You'll need to:
1. Deploy smart contracts (local Anvil or Sepolia)
2. Ensure `apps/frontend/.env.local` contains the deployed addresses (the deploy scripts generate `.env.contracts.*` files)
3. Ensure you have an RPC configured if not using local Anvil (`INDEXER_RPC_URL` or `NEXT_PUBLIC_RPC_URL`)

## 📱 Testing on Mobile

The app is fully responsive. Test on mobile:
1. Get your local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Make sure mobile is on same WiFi
3. Visit: `http://YOUR_IP:3000`

## 🛠️ Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type check
npm run type-check

# Lint code
npm run lint
```

## 🐛 Troubleshooting

### Dev server exits immediately
- Check your Node version: Node **24.x is not supported** by this repo. Install Node 22.x or 20.x.
- This repo includes a Node version preflight (`scripts/check-node.mjs`) and will fail fast with an explanation.

### Wallet Not Connecting
- Make sure you added WalletConnect Project ID
- Check if wallet extension is installed
- Try refreshing the page

### Build Errors
- Delete `.next` folder: `Remove-Item -Recurse -Force .next`
- Delete `node_modules`: `Remove-Item -Recurse -Force node_modules`
- Reinstall: `npm install`
- Rebuild: `npm run build`

### Port Already in Use
- Change port: `npm run dev -- -p 3001`
- Or kill process using port 3000

## 📚 Key Files to Know

- `apps/frontend/src/app/page.tsx` - Landing page
- `apps/frontend/src/app/marketplace/page.tsx` - Asset marketplace
- `apps/frontend/src/app/assets/[id]/page.tsx` - Asset detail page
- `apps/frontend/src/config/contracts.ts` - Contract addresses & ABIs
- `apps/frontend/scripts/indexer.mjs` - Indexer
- `apps/frontend/.env.local` - Frontend + contract config

## 🎯 Next Steps

1. ✅ Get WalletConnect Project ID - **Do this first!**
2. Test all pages and features
3. Connect to real smart contracts
4. Replace mock data with blockchain data
5. Deploy to production (Firebase Hosting / Frameworks)

## 💡 Pro Tips

- Use Sepolia testnet for testing transactions
- Get testnet ETH from faucets
- Monitor transactions on Etherscan
- Check browser console for errors
- Use React DevTools for debugging

## 📖 Full Documentation

- Frontend README: `apps/frontend/README.md`
- Implementation Summary: `IMPLEMENTATION_SUMMARY.md`
- Project Overview: `README.md`

## 🆘 Need Help?

Check these resources:
- Next.js docs: https://nextjs.org/docs
- wagmi docs: https://wagmi.sh
- RainbowKit docs: https://rainbowkit.com
- Tailwind CSS: https://tailwindcss.com

---

**Happy Building! 🎉**

Your Asset Tokenization Platform is ready to use!
