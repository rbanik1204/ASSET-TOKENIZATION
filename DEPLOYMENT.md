# Asset Tokenization - Production Deployment

## 🚀 Live Application

**Production URL**: https://asset-linked-c4ef2.web.app

### Deployment Details
- **Platform**: Firebase Hosting
- **Project**: asset-linked  
- **Account**: ratulbanik2004@gmail.com
- **Deployed Files**: 744 files
- **Last Deploy**: February 28, 2026

## ✅ What's Live

### Core Features
- ✅ Full Next.js application
- ✅ Multi-chain wallet integration (Ethereum + Algorand)
- ✅ Asset marketplace
- ✅ Portfolio management
- ✅ Income tracking
- ✅ Admin dashboard

### Algorand Integration
- ✅ Pera Wallet & Defly Wallet support
- ✅ Algorand testnet connection
- ✅ Real-time balance display
- ✅ ASA (Algorand Standard Asset) creation
- ✅ Asset transfers and payments
- ✅ Transaction history on AlgoExplorer

### Key Pages Live
- `/` - Landing page with "Invest in Real Assets Through Blockchain"
- `/marketplace` - Browse and trade tokenized assets
- `/portfolio` - View your asset holdings
- `/income` - Track income from assets
- `/algorand-demo` - Full Algorand wallet demo
- `/list-asset` - Create new tokenized assets
- `/admin` - Admin management panel

## 🔗 Quick Links

- **Live Site**: https://asset-linked-c4ef2.web.app
- **Algorand Demo**: https://asset-linked-c4ef2.web.app/algorand-demo
- **Firebase Console**: https://console.firebase.google.com/project/asset-linked/overview
- **Algorand Testnet Faucet**: https://bank.testnet.algorand.network/
- **AlgoExplorer**: https://testnet.algoexplorer.io/

## 📱 Testing the Algorand Features

### 1. Connect Wallet
1. Visit: https://asset-linked-c4ef2.web.app/algorand-demo
2. Click "Connect Algorand Wallet"
3. Choose Pera Wallet or Defly Wallet
4. Scan QR code with your mobile wallet app
5. Approve the connection

### 2. Get Testnet ALGO
- Visit: https://bank.testnet.algorand.network/
- Enter your wallet address
- Receive 10 testnet ALGO (free)

### 3. Create a Token (ASA)
- Navigate to "Manage Assets" tab
- Fill in token details:
  - **Asset Name**: "Campus Dorm Room 301"
  - **Unit Name**: "DORM301" 
  - **Total Supply**: 1000
  - **Decimals**: 0
- Click "Create Asset"
- Transaction completes in ~4.5 seconds
- Cost: 0.001 ALGO + 0.1 ALGO minimum balance

### 4. Send Payment
- Go to "Send Payment" tab
- Enter receiver address
- Enter amount in microAlgos (1 ALGO = 1,000,000 microAlgos)
- Add optional note
- Click "Send Payment"
- View transaction on AlgoExplorer

## 🛠️ Technical Stack

### Frontend
- **Framework**: Next.js 14.2.18
- **React**: 19.0.0
- **TypeScript**: 5.x
- **Styling**: Tailwind CSS

### Blockchain Integration
- **Algorand SDK**: algosdk ^2.7.0
- **Wallets**: @perawallet/connect, @blockshake/defly-connect
- **WalletConnect**: v2.7.0
- **Ethereum**: ethers.js, wagmi

### Deployment
- **Hosting**: Firebase Hosting
- **CDN**: Global edge network
- **SSL**: Automatic HTTPS

## 🔄 Redeployment Process

To deploy updates:

```bash
# 1. Navigate to frontend
cd apps/frontend

# 2. Build the application
npm run build

# 3. Deploy to Firebase
cd ../..
firebase deploy --only hosting:asset-linked-c4ef2
```

## 🎯 Smart Contracts Status

### Algorand Contracts (PyTeal)
Location: `algorand/contracts/`

- **asset_registry.py** - Asset registration (Ready for deploy)
- **nft_credential.py** - NFT credentials (Ready for deploy)
- **escrow.py** - P2P marketplace escrow (Ready for deploy)
- **crowdfunding.py** - Crowdfunding campaigns (Ready for deploy)

**Status**: Contracts written but not yet deployed to testnet

**To Deploy Contracts**:
```bash
cd algorand

# Set your deployer wallet mnemonic
export DEPLOYER_MNEMONIC="word1 word2 ... word25"

# Deploy to testnet
python scripts/deploy.py --network testnet

# After deployment, update contract IDs in:
# apps/frontend/.env.local
```

### Ethereum Contracts (Solidity)
- Deployed to Sepolia testnet
- Contract addresses in `.env.contracts.sepolia`

## 💡 Usage Notes

### For Development
- API routes work in development: `npm run dev`
- Full server-side features available locally
- Hot reload for rapid development

### For Production (Current Deployment)
- Static pages served from CDN
- Client-side blockchain interactions work perfectly
- Algorand wallet features fully functional
- ASA creation, transfers, payments all work
- Some API-dependent features require local dev server

## 📊 Performance

- **Build Size**: ~290KB average first load
- **Total Routes**: 39 pages
- **Static Assets**: Optimized and cached
- **Load Time**: < 2 seconds globally

## 🔐 Security

- ✅ HTTPS enforced
- ✅ Client-side wallet signing (keys never leave device)
- ✅ Testnet only (no real funds at risk)
- ✅ Environment variables for sensitive config

## 📖 Documentation

- [START_HERE.md](START_HERE.md) - Quick start for judges
- [ALGORAND_QUICKSTART.md](ALGORAND_QUICKSTART.md) - Complete Algorand guide
- [algorand/README.md](algorand/README.md) - Algorand track details
- [ALGORAND_FRONTEND_SUMMARY.md](ALGORAND_FRONTEND_SUMMARY.md) - Frontend technical docs

## 🎓 Demo Flow for Hackathon

1. **Show Landing Page** (2 min)
   - https://asset-linked-c4ef2.web.app
   - Explain tokenization concept

2. **Connect Algorand Wallet** (1 min)
   - Go to /algorand-demo
   - Show Pera/Defly integration
   - Display balance

3. **Create Campus Asset Token** (2 min)
   - Create "Dorm Room" token
   - Show 4.5s confirmation
   - Compare to Ethereum gas fees

4. **Marketplace Demo** (2 min)
   - Browse assets
   - Show fractional ownership

5. **Multi-Chain** (1 min)
   - Switch between Ethereum/Algorand
   - Show unified UI

**Total Demo**: 8 minutes

## 🤝 Support

For issues or questions:
- Check documentation in `/algorand` folder
- Review error logs in browser console
- Check wallet connection status
- Verify testnet ALGO balance

---

**Built with ❤️ for blockchain education**

